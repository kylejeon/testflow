import { common as enCommon } from './en/common';
import { projects as enProjects } from './en/projects';
import { testcases as enTestcases } from './en/testcases';
import { runs as enRuns } from './en/runs';
import { sessions as enSessions } from './en/sessions';
import { milestones as enMilestones } from './en/milestones';
import { documentation as enDocumentation } from './en/documentation';
import { settings as enSettings } from './en/settings';
import { onboarding as enOnboarding } from './en/onboarding';
import { environments as enEnvironments } from './en/environments';

import { common as koCommon } from './ko/common';
import { projects as koProjects } from './ko/projects';
import { testcases as koTestcases } from './ko/testcases';
import { runs as koRuns } from './ko/runs';
import { sessions as koSessions } from './ko/sessions';
import { milestones as koMilestones } from './ko/milestones';
import { documentation as koDocumentation } from './ko/documentation';
import { settings as koSettings } from './ko/settings';
import { onboarding as koOnboarding } from './ko/onboarding';
import { environments as koEnvironments } from './ko/environments';

const resources = {
  en: {
    common: enCommon,
    projects: enProjects,
    testcases: enTestcases,
    runs: enRuns,
    sessions: enSessions,
    milestones: enMilestones,
    documentation: enDocumentation,
    settings: enSettings,
    onboarding: enOnboarding,
    environments: enEnvironments,
  },
  ko: {
    common: koCommon,
    projects: koProjects,
    testcases: koTestcases,
    runs: koRuns,
    sessions: koSessions,
    milestones: koMilestones,
    documentation: koDocumentation,
    settings: koSettings,
    onboarding: koOnboarding,
    environments: koEnvironments,
  },
};

export default resources;