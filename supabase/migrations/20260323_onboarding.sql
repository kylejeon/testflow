-- ============================================================
-- Onboarding: user_onboarding + sample_project_templates
-- ============================================================

-- 1. user_onboarding table
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                    TEXT,           -- 'qa_engineer' | 'developer' | 'product_manager' | 'other'
  team_size               TEXT,           -- '1' | '2-5' | '6-10' | '10+'
  welcome_completed       BOOLEAN DEFAULT FALSE,
  checklist_dismissed     BOOLEAN DEFAULT FALSE,
  sample_project_created  BOOLEAN DEFAULT FALSE,
  -- Checklist steps
  step_create_project     BOOLEAN DEFAULT FALSE,
  step_create_testcase    BOOLEAN DEFAULT FALSE,
  step_try_ai             BOOLEAN DEFAULT FALSE,
  step_run_test           BOOLEAN DEFAULT FALSE,
  step_invite_member      BOOLEAN DEFAULT FALSE,
  step_connect_jira       BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,    -- Set when all 6 steps done
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding"
  ON public.user_onboarding
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 2. Auto-create onboarding record on new user signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_onboarding_record()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_onboarding (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_onboarding_record();

-- ============================================================
-- 3. sample_project_templates table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sample_project_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,  -- 'ecommerce_app'
  name         TEXT NOT NULL,          -- 'Sample E-commerce App'
  description  TEXT,
  test_cases   JSONB NOT NULL,
  test_runs    JSONB NOT NULL,
  sessions     JSONB NOT NULL,
  milestones   JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Public read (templates are shared)
ALTER TABLE public.sample_project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates"
  ON public.sample_project_templates
  FOR SELECT USING (true);

-- ============================================================
-- 4. Seed the e-commerce sample template
-- ============================================================

INSERT INTO public.sample_project_templates (template_key, name, description, test_cases, test_runs, sessions, milestones)
VALUES (
  'ecommerce_app',
  'Sample E-commerce App',
  'A sample project demonstrating Testably features with realistic QA test data for an e-commerce application.',
  '[
    {"title":"User registration with valid email","module":"Authentication","priority":"high","status":"passed","steps":"1. Navigate to /register\n2. Enter valid email and password\n3. Click Register","expected_result":"User account created, verification email sent"},
    {"title":"Login with correct credentials","module":"Authentication","priority":"high","status":"passed","steps":"1. Navigate to /login\n2. Enter valid credentials\n3. Click Login","expected_result":"User logged in, redirected to dashboard"},
    {"title":"Password reset flow","module":"Authentication","priority":"medium","status":"passed","steps":"1. Click Forgot Password\n2. Enter email\n3. Check email and click reset link\n4. Set new password","expected_result":"Password updated successfully"},
    {"title":"Social login (Google OAuth)","module":"Authentication","priority":"low","status":"not_run","steps":"1. Click Sign in with Google\n2. Authorize in Google popup","expected_result":"User logged in via Google account"},
    {"title":"Search products by keyword","module":"Product Catalog","priority":"high","status":"passed","steps":"1. Enter keyword in search bar\n2. Click Search","expected_result":"Relevant products displayed"},
    {"title":"Filter products by category","module":"Product Catalog","priority":"medium","status":"passed","steps":"1. Select category from filter panel\n2. View results","expected_result":"Only products in selected category shown"},
    {"title":"Sort products by price","module":"Product Catalog","priority":"medium","status":"passed","steps":"1. Click Sort dropdown\n2. Select Price: Low to High","expected_result":"Products sorted by ascending price"},
    {"title":"Product detail page loads correctly","module":"Product Catalog","priority":"high","status":"passed","steps":"1. Click on any product\n2. Verify detail page loads","expected_result":"Product image, name, price, description visible"},
    {"title":"Add item to cart","module":"Shopping Cart","priority":"critical","status":"passed","steps":"1. Open product detail\n2. Click Add to Cart","expected_result":"Item added to cart, cart count increments"},
    {"title":"Update item quantity","module":"Shopping Cart","priority":"high","status":"passed","steps":"1. Open cart\n2. Change quantity using +/- buttons","expected_result":"Quantity and total price updated"},
    {"title":"Remove item from cart","module":"Shopping Cart","priority":"high","status":"failed","steps":"1. Open cart\n2. Click Remove on item","expected_result":"Item removed, cart total recalculated"},
    {"title":"Cart persists after logout/login","module":"Shopping Cart","priority":"medium","status":"failed","steps":"1. Add items to cart\n2. Logout\n3. Login again","expected_result":"Cart items still present after re-login"},
    {"title":"Complete checkout with credit card","module":"Checkout","priority":"critical","status":"passed","steps":"1. Proceed to checkout\n2. Enter shipping info\n3. Enter card details\n4. Place order","expected_result":"Order placed, confirmation page shown"},
    {"title":"Apply discount coupon","module":"Checkout","priority":"medium","status":"passed","steps":"1. Enter coupon code in checkout\n2. Click Apply","expected_result":"Discount applied, total price reduced"},
    {"title":"Order confirmation email sent","module":"Checkout","priority":"high","status":"skipped","steps":"1. Complete checkout\n2. Check email inbox","expected_result":"Confirmation email received within 2 minutes"}
  ]'::jsonb,
  '[
    {"name":"Sprint 1 Regression","status":"completed","total":15,"passed":12,"failed":2,"skipped":1,"duration_minutes":45}
  ]'::jsonb,
  '[
    {"name":"Checkout Flow Exploration","duration_minutes":5,"status":"completed","notes":"Explored checkout flow, found cart persistence issue when switching browsers."}
  ]'::jsonb,
  '[
    {"name":"MVP Testing Complete","progress":80}
  ]'::jsonb
)
ON CONFLICT (template_key) DO NOTHING;
