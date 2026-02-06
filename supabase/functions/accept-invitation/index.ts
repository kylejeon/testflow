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
      throw new Error("서버 설정 오류");
    }

    const { token, action } = await req.json();

    if (!token) {
      throw new Error("초대 토큰이 필요합니다");
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("project_invitations")
      .select(`
        *,
        projects:project_id (
          id,
          name
        )
      `)
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (invitationError) {
      console.error("Invitation error:", invitationError);
      throw new Error("초대 정보를 찾을 수 없습니다");
    }

    if (!invitation) {
      throw new Error("유효하지 않거나 만료된 초대입니다");
    }

    // If action is 'verify', just return invitation info
    if (action === 'verify') {
      return new Response(
        JSON.stringify({
          success: true,
          invitation: {
            email: invitation.email,
            role: invitation.role,
            projectName: invitation.projects?.name || '알 수 없는 프로젝트',
            projectId: invitation.project_id,
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // For accept action, we need authentication
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
      throw new Error("인증에 실패했습니다");
    }

    // Check if user email matches invitation email
    if (user.email !== invitation.email) {
      throw new Error("초대된 이메일 주소와 일치하지 않습니다");
    }

    // Update profile with full_name if provided in invitation
    if (invitation.full_name) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      // Only update if profile doesn't have a full_name yet
      if (existingProfile && !existingProfile.full_name) {
        await supabase
          .from("profiles")
          .update({ full_name: invitation.full_name })
          .eq("id", user.id);
      }
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", invitation.project_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      // Mark invitation as accepted
      await supabase
        .from("project_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "이미 프로젝트 멤버입니다",
          projectId: invitation.project_id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Add user to project
    const { error: memberError } = await supabase
      .from("project_members")
      .insert({
        project_id: invitation.project_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) {
      console.error("Member error:", memberError);
      throw new Error("프로젝트 멤버 추가에 실패했습니다");
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from("project_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "프로젝트에 참여했습니다",
        projectId: invitation.project_id,
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
        error: error.message || "초대 수락 중 오류가 발생했습니다",
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});