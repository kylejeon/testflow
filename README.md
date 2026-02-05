
# TestFlow - Test Management Solution

A modern test management platform built with React, TypeScript, and Supabase.

## Features

- **Project Management**: Create and manage multiple test projects
- **Test Cases**: Organize test cases with tags and priorities
- **Milestones**: Track project milestones and progress
- **Test Runs**: Execute test runs and record results
- **Sessions**: Manage exploratory testing sessions
- **Documentation**: Store project documents and links
- **Team Collaboration**: Invite team members and track contributions
- **Timeline**: View project activity history

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Icons**: Remix Icon, Font Awesome

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/testflow.git
cd testflow
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `VITE_PUBLIC_SUPABASE_URL`
   - `VITE_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Netlify

1. Push your code to GitHub
2. Connect your repository to [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy!

### Supabase Edge Functions

Deploy Edge Functions using Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy send-invitation
supabase functions deploy accept-invitation
supabase functions deploy test-jira-connection
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Database Setup

The application requires the following Supabase tables:
- `profiles` - User profiles
- `workspaces` - Workspaces
- `workspace_members` - Workspace memberships
- `projects` - Test projects
- `project_members` - Project team members
- `project_invitations` - Pending invitations
- `test_cases` - Test cases
- `test_case_comments` - Test case comments
- `test_case_history` - Test case change history
- `milestones` - Project milestones
- `test_runs` - Test execution runs
- `test_results` - Individual test results
- `sessions` - Exploratory testing sessions
- `session_logs` - Session activity logs
- `project_documents` - Project documentation
- `jira_settings` - Jira integration settings

## License

MIT License

## Support

For questions or issues, please open a GitHub issue.
