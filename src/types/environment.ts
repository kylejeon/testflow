export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  os_name: string | null;
  os_version: string | null;
  browser_name: string | null;
  browser_version: string | null;
  device_type: DeviceType;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentFormValues {
  name: string;
  os_name: string;
  os_version: string;
  browser_name: string;
  browser_version: string;
  device_type: DeviceType;
  description: string;
}

export interface EnvironmentPreset {
  key: string;
  /** Lucide / remixicon class name OR emoji string */
  icon: string;
  labelKey: string; // i18n key
  values: EnvironmentFormValues;
}

/**
 * Plan limit per subscription tier (1-based to match subscription_tier value).
 * -1 means unlimited.
 */
export const ENVIRONMENT_PLAN_LIMITS: Record<number, number> = {
  1: 3,     // Free
  2: 10,    // Hobby
  3: 25,    // Starter
  4: 100,   // Professional
  5: -1,    // Enterprise S
  6: -1,    // Enterprise M
  7: -1,    // Enterprise L
};

export function getEnvironmentLimit(tier: number | null | undefined): number {
  const t = tier ?? 1;
  return ENVIRONMENT_PLAN_LIMITS[t] ?? ENVIRONMENT_PLAN_LIMITS[1];
}
