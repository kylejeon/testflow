import { type AnyStep, type NormalStep, isSharedStepRef } from '../types/shared-steps';

export type SharedStepCache = Record<string, { name: string; custom_id: string; steps: NormalStep[] }>;

export interface FlatStep {
  flatIndex: number;
  step: string;
  expectedResult: string;
  isSubStep: boolean;
  groupHeader?: string; // set only on first sub-step of each shared group
}

export function expandFlatSteps(steps: AnyStep[], cache: SharedStepCache): FlatStep[] {
  const flat: FlatStep[] = [];
  for (const s of steps) {
    if (isSharedStepRef(s)) {
      const cached = cache[s.shared_step_id];
      const subSteps = cached?.steps ?? [];
      if (subSteps.length === 0) {
        flat.push({
          flatIndex: flat.length,
          step: 'Loading…',
          expectedResult: '',
          isSubStep: true,
          groupHeader: `${s.shared_step_custom_id}: ${s.shared_step_name}`,
        });
      } else {
        subSteps.forEach((sub, subIdx) => {
          flat.push({
            flatIndex: flat.length,
            step: sub.step,
            expectedResult: sub.expectedResult,
            isSubStep: true,
            groupHeader: subIdx === 0 ? `${s.shared_step_custom_id}: ${s.shared_step_name}` : undefined,
          });
        });
      }
    } else {
      flat.push({
        flatIndex: flat.length,
        step: s.step,
        expectedResult: s.expectedResult,
        isSubStep: false,
      });
    }
  }
  return flat;
}
