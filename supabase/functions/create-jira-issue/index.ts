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

    const cleanDomain = domain
      .replace(/^https?:?\/?\/?\/?/i, '')
      .replace(/\/+$/, '')
      .replace(/\/+/g, '/');
    const auth = btoa(`${email}:${apiToken}`);

    // Prepare issue data
    const issueData: any = {
      fields: {
        project: {
          key: projectKey
        },
        summary: stripHtml(summary),
        issuetype: {
          name: issueType || 'Bug'
        }
      }
    };

    // Add optional fields
    if (description) {
      issueData.fields.description = textToADF(stripHtml(description));
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
    const response = await fetch(`https://${cleanDomain}/rest/api/3/issue`, {
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
      let errorDetails: any = {};

      try {
        const errorData = JSON.parse(errorText);
        errorDetails = errorData;
        if (errorData.errors && Object.keys(errorData.errors).length > 0) {
          errorMessage = Object.entries(errorData.errors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join(', ');
        } else if (errorData.errorMessages && errorData.errorMessages.length > 0) {
          errorMessage = errorData.errorMessages.join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        errorMessage = errorText;
      }

      // Log the full Jira API error for debugging
      console.error('[create-jira-issue] Jira API error', {
        status: response.status,
        errorMessage,
        errorDetails,
        requestBody: JSON.stringify(issueData),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: errorDetails,
          jiraStatus: response.status,
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

/**
 * Converts plain text (with \n line breaks) to Atlassian Document Format (ADF).
 * Jira API v3 requires ADF for the description field.
 * - \n\n (blank line) → new paragraph node
 * - \n (single newline) → hardBreak node within a paragraph
 * - text nodes must NOT contain \n characters
 */
function textToADF(text: string): object {
  if (!text || !text.trim()) {
    return {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
    };
  }

  // Split by blank lines into paragraphs
  const paragraphBlocks = text.split(/\n{2,}/);

  const content = paragraphBlocks
    .filter(block => block.trim())
    .map(block => {
      // Split each paragraph block by single newlines
      const lines = block.split('\n');
      const inlineContent: any[] = [];

      lines.forEach((line, idx) => {
        if (line) {
          inlineContent.push({ type: 'text', text: line });
        }
        // Add hardBreak between lines (not after the last one)
        if (idx < lines.length - 1) {
          inlineContent.push({ type: 'hardBreak' });
        }
      });

      return {
        type: 'paragraph',
        content: inlineContent.length > 0
          ? inlineContent
          : [{ type: 'text', text: '' }],
      };
    });

  return {
    type: 'doc',
    version: 1,
    content: content.length > 0
      ? content
      : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  };
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
