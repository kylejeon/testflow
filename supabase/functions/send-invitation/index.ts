import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Missing environment variables");
      throw new Error("서버 설정 오류");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("인증 정보가 없습니다");
    }

    // Get current user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("User error:", userError);
      throw new Error("인증에 실패했습니다");
    }

    const { email, fullName, projectId, role, baseUrl } = await req.json();

    if (!email || !projectId || !role || !baseUrl) {
      throw new Error("필수 정보가 누락되었습니다");
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      console.error("Project error:", projectError);
      throw new Error("프로젝트를 찾을 수 없습니다");
    }

    if (!project) {
      throw new Error("프로젝트가 존재하지 않습니다");
    }

    // Get inviter info
    const { data: inviter } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    // Generate unique token
    const token = crypto.randomUUID() + "-" + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from("project_invitations")
      .select("id")
      .eq("project_id", projectId)
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvitation) {
      // Update existing invitation
      const { error: updateError } = await supabase
        .from("project_invitations")
        .update({
          token,
          role,
          full_name: fullName || null,
          expires_at: expiresAt.toISOString(),
          invited_by: user.id,
        })
        .eq("id", existingInvitation.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("초대 정보 업데이트에 실패했습니다");
      }
    } else {
      // Create new invitation
      const { error: insertError } = await supabase
        .from("project_invitations")
        .insert({
          project_id: projectId,
          email,
          role,
          full_name: fullName || null,
          token,
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("초대 생성에 실패했습니다");
      }
    }

    const inviteUrl = `${baseUrl}/accept-invitation?token=${token}`;
    const inviterName = inviter?.full_name || inviter?.email || "Someone";

    console.log(`Invitation created for ${email}. Share this link: ${inviteUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "초대 링크가 생성되었습니다. 아래 링크를 팀원에게 전달해주세요.",
        inviteUrl,
        projectName: project.name,
        inviterName: inviterName,
        emailSent: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "초대 처리 중 오류가 발생했습니다",
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});