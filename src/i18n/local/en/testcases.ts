export const testcases = {
  title: 'Test Cases',
  createTestCase: 'Create Test Case',
  editTestCase: 'Edit Test Case',
  deleteTestCase: 'Delete Test Case',
  testCaseTitle: 'Title',
  testCaseDescription: 'Description',
  preconditions: 'Preconditions',
  steps: 'Steps',
  expectedResult: 'Expected Result',
  addStep: 'Add Step',
  folder: 'Folder',
  allCases: 'All Cases',
  noTestCases: 'No test cases found',
  searchPlaceholder: 'Search test cases...',
  
  // Columns
  id: 'ID',
  title: 'Title',
  priority: 'Priority',
  status: 'Status',
  assignee: 'Assignee',
  createdBy: 'Created By',
  lastUpdated: 'Last Updated',
  
  // Filters
  filterByPriority: 'Filter by Priority',
  filterByStatus: 'Filter by Status',
  filterByFolder: 'Filter by Folder',
  
  // Actions
  selectCases: 'Select Cases',
  selectedCases: '{{count}} cases selected',
  bulkActions: 'Bulk Actions',
  
  // Messages
  testCaseCreated: 'Test case created successfully',
  testCaseUpdated: 'Test case updated successfully',
  testCaseDeleted: 'Test case deleted successfully',

  // AI Generation
  aiGenerate: 'AI Generate',
  aiGenerateTitle: 'AI Test Case Generation',
  aiGenerateSubtitle: 'Generate test cases automatically using AI',
  aiModeText: 'Text Input',
  aiModeTextDesc: 'Describe the feature and AI will generate test cases.',
  aiModeSession: 'Session Based',
  aiModeSessionDesc: 'Analyze discovery log sessions to auto-generate cases.',
  aiModeTextAvailable: 'Available on all plans',
  aiModeSessionLocked: 'Requires Professional plan',
  aiInputLabel: 'Feature Description',
  aiInputPlaceholder: 'e.g. A login feature that supports email/password and Google OAuth...',
  aiInputHint: 'More detail produces more accurate test cases.',
  aiSessionLabel: 'Select Session',
  aiNoSessions: 'No sessions found in this project.',
  aiGenerateTitles: 'Generate Titles',
  aiGenerateDetails: '{{count}} Detailed Cases',
  aiSaveCases: 'Save {{count}} Cases',
  aiSelectAll: 'Select All',
  aiDeselectAll: 'Deselect All',
  aiTitlesHint: 'Select titles to generate detailed test cases.',
  aiDetailsHint: 'Select cases to save to the test case list.',
  aiUsage: '{{used}} / {{limit}} this month',
  aiUnlimited: 'Unlimited',
  aiLimitReached: 'Monthly AI generation limit reached. Upgrade your plan to continue.',
  aiGenerating: 'Generating...',
  aiSaving: 'Saving...',
  aiBackToMode: 'Back to mode selection',
  aiSelectedCount: '{{count}} selected',
  aiSessionMode: 'Professional+ only',

  // f024 — Toast (Dev Spec §6-3 A17 / A18 / A20)
  toast: {
    attachmentDeleteFailed: 'Failed to delete attachment.',
    generateSaveFailed: 'Failed to save generated test cases.',
  },

  // f033 — Import (legacy .xls blocked after xlsx → exceljs migration)
  import: {
    xlsOldFormatBlocked: 'Legacy .xls files are no longer supported.',
    xlsUseXlsxInstead: 'Please re-save as .xlsx in Excel and try again.',
  },

  // f025 — EmptyState copy
  empty: {
    title: 'No test cases yet',
    description:
      'Capture what your product should do. Test cases keep your team aligned on expected behavior.',
    cta: 'Create test case',
    secondaryCta: 'Generate with AI',
    readonlyDescription: 'Ask an admin to add test cases.',
    illustrationAlt: 'Clipboard with checked items and a magnifying glass',
  },
  emptyFiltered: {
    title: 'No test cases match these filters',
    description: 'Try a different folder, tag, or search term.',
    clearCta: 'Clear filters',
  },
};

export default testcases;