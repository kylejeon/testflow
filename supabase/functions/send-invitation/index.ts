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

    const inviteUrl = `${baseUrl}/auth?invite=${token}`;
    const inviterName = inviter?.full_name || inviter?.email || "Someone";

    // Send invitation email using Supabase Auth Admin API
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #14B8A6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .info-box { background: #f0fdfa; border-left: 4px solid #14B8A6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">프로젝트 초대</h1>
            </div>
            <div class="content">
              <p>안녕하세요${fullName ? ` ${fullName}님` : ''},</p>
              <p><strong>${inviterName}</strong>님이 <strong>${project.name}</strong> 프로젝트에 당신을 초대했습니다.</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>프로젝트:</strong> ${project.name}</p>
                <p style="margin: 10px 0 0 0;"><strong>역할:</strong> ${role === 'admin' ? 'Admin (관리자)' : role === 'member' ? 'Member (멤버)' : 'Viewer (뷰어)'}</p>
              </div>

              <p>아래 버튼을 클릭하여 초대를 수락하고 프로젝트에 참여하세요:</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">초대 수락하기</a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
              <p style="word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px; font-size: 12px;">${inviteUrl}</p>

              <p style="color: #ef4444; font-size: 14px; margin-top: 30px;">⚠️ 이 초대는 7일 후 만료됩니다.</p>
            </div>
            <div class="footer">
              <p>이 이메일은 자동으로 발송되었습니다.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email using Supabase Auth's built-in email functionality
      const { data: emailData, error: emailError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          project_id: projectId,
          project_name: project.name,
          inviter_name: inviterName,
          role: role,
          invite_token: token,
          full_name: fullName || null,
        },
        redirectTo: inviteUrl,
      });

      if (emailError) {
        console.error('Supabase email error:', emailError);
        
        // Fallback: Try to send a custom email notification
        try {
          const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              to: email,
              subject: `${inviterName}님이 ${project.name} 프로젝트에 초대했습니다`,
              html: emailHtml,
            }),
          });
          
          if (!notificationResponse.ok) {
            console.error('Notification email failed');
          }
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }
      } else {
        console.log('Email sent successfully:', emailData);
      }

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't throw - invitation is still created, user can use the link manually
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "초대가 생성되고 이메일이 발송되었습니다",
        inviteUrl,
        projectName: project.name,
        inviterName: inviterName,
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