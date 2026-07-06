import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("서버 설정 오류");
    }

    const { token, action } = await req.json();

    if (!token) {
      throw new Error("초대 토큰이 필요합니다");
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get invitation — project 초대를 먼저 조회하고, 없으면 org 초대로 폴백.
    // (토큰은 UUID 기반이라 project/org 충돌은 사실상 없음)
    const { data: projectInvitation, error: projectInvErr } = await supabase
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

    if (projectInvErr) {
      console.error("Project invitation error:", projectInvErr);
    }

    let orgInvitation: any = null;
    if (!projectInvitation) {
      const { data: orgInv, error: orgInvErr } = await supabase
        .from("organization_invitations")
        .select(`
          *,
          organizations:organization_id (
            id,
            name
          )
        `)
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (orgInvErr) {
        console.error("Org invitation error:", orgInvErr);
      }
      orgInvitation = orgInv;
    }

    const isOrg = !projectInvitation && !!orgInvitation;
    const invitation: any = projectInvitation ?? orgInvitation;

    if (!invitation) {
      throw new Error("유효하지 않거나 만료된 초대입니다");
    }

    // If action is 'verify', just return invitation info
    if (action === 'verify') {
      return new Response(
        JSON.stringify(
          isOrg
            ? {
                success: true,
                type: "organization",
                invitation: {
                  email: invitation.email,
                  role: invitation.role,
                  organizationName: invitation.organizations?.name || '알 수 없는 조직',
                  organizationId: invitation.organization_id,
                },
              }
            : {
                success: true,
                type: "project",
                invitation: {
                  email: invitation.email,
                  role: invitation.role,
                  projectName: invitation.projects?.name || '알 수 없는 프로젝트',
                  projectId: invitation.project_id,
                },
              }
        ),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // For accept action, we need authentication (ES256-safe).
    // ES256 전환 이후 `x-user-token` 커스텀 헤더 우선, Authorization Bearer fallback.
    const userTokenHeader = req.headers.get("x-user-token");
    const authHeader = req.headers.get("Authorization");
    const userToken = userTokenHeader
      || (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "");
    if (!userToken) {
      throw new Error("인증 정보가 없습니다");
    }

    let userId: string;
    try {
      const [, payloadB64] = userToken.split(".");
      const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(
        new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))),
      );
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Token expired");
      }
      userId = payload.sub;
      if (!userId) throw new Error("No sub in token");
    } catch {
      throw new Error("인증에 실패했습니다");
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
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

    // ── Organization invite accept ──────────────────────────────
    if (isOrg) {
      const { data: existingOrgMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", invitation.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingOrgMember) {
        const { error: orgMemberError } = await supabase
          .from("organization_members")
          .insert({
            organization_id: invitation.organization_id,
            user_id: user.id,
            role: invitation.role,
          });
        if (orgMemberError) {
          console.error("Org member error:", orgMemberError);
          throw new Error("조직 멤버 추가에 실패했습니다");
        }
      }

      await supabase
        .from("organization_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({
          success: true,
          type: "organization",
          message: existingOrgMember ? "이미 조직 멤버입니다" : "조직에 참여했습니다",
          organizationId: invitation.organization_id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
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