-- RPC function for admin page: returns recent users with last_sign_in_at from auth.users
-- Uses SECURITY DEFINER so it can read auth.users (not accessible via RLS from client)
CREATE OR REPLACE FUNCTION admin_get_recent_users(limit_count int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  subscription_tier int,
  is_trial boolean,
  is_superadmin boolean,
  created_at timestamptz,
  updated_at timestamptz,
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.subscription_tier,
    p.is_trial,
    p.is_superadmin,
    p.created_at,
    p.updated_at,
    p.trial_ends_at,
    p.subscription_ends_at,
    u.last_sign_in_at
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC
  LIMIT limit_count;
$$;

-- Only superadmins can call this function
REVOKE ALL ON FUNCTION admin_get_recent_users(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_recent_users(int) TO authenticated;
