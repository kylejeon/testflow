import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      domain,
      email,
      apiToken,
      projectKey,
      summary,
      description,
      issueType,
      priority,
      labels,
      assignee,
      components,
      fieldMappings,
      fieldContext,
    } = await req.json();

    if (!domain || !email || !apiToken || !projectKey || !summary) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const auth = btoa(`${email}:${apiToken}`);
    
    // Prepare issue data
    const issueData: any = {
      fields: {
        project: {
          key: projectKey
        },
        summary: summary,
        issuetype: {
          name: issueType || 'Bug'
        }
      }
    };

    // Add optional fields
    if (description) {
      issueData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description
              }
            ]
          }
        ]
      };
    }

    if (priority) {
      issueData.fields.priority = {
        name: priority
      };
    }

    if (labels && labels.length > 0) {
      issueData.fields.labels = labels;
    }

    // Assignee: accountId 또는 emailAddress 방식 모두 시도
    if (assignee) {
      // Jira Cloud는 accountId, Server는 name/emailAddress
      issueData.fields.assignee = assignee.includes('@')
        ? { emailAddress: assignee }
        : { accountId: assignee };
    }

    // Components
    if (components && components.length > 0) {
      issueData.fields.components = components.map((name: string) => ({ name }));
    }

    // Apply custom field mappings
    if (fieldMappings && fieldMappings.length > 0 && fieldContext) {
      for (const mapping of fieldMappings) {
        const value = resolveTestablyFieldValue(mapping.testably_field, fieldContext);
        if (value && mapping.jira_field_id) {
          issueData.fields[mapping.jira_field_id] = value;
        }
      }
    }

    // Create issue in Jira
    const response = await fetch(`https://${domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueData)
    });

    if (response.ok) {
      const data = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          issue: {
            key: data.key,
            id: data.id,
            self: data.self
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      const errorText = await response.text();
      let errorMessage = 'Failed to create issue';
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors) {
          errorMessage = Object.values(errorData.errors).join(', ');
        } else if (errorData.errorMessages) {
          errorMessage = errorData.errorMessages.join(', ');
        }
      } catch (e) {
        errorMessage = errorText;
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: errorText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function resolveTestablyFieldValue(field: string, ctx: any): any {
  switch (field) {
    case 'tc_tags': return ctx.tags?.join(', ') || null;
    case 'tc_precondition': return ctx.precondition || null;
    case 'milestone_name': return ctx.milestoneName || null;
    case 'run_name': return ctx.runName || null;
    case 'custom_text': return ctx.customValue || null;
    default: return null;
  }
}
