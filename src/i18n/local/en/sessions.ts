export const sessions = {
  title: 'Sessions',
  createSession: 'Create Session',
  editSession: 'Edit Session',
  deleteSession: 'Delete Session',
  sessionName: 'Session Name',
  sessionNotes: 'Session Notes',
  noSessions: 'No sessions found',
  searchPlaceholder: 'Search sessions...',
  
  // Session Details
  sessionDetails: 'Session Details',
  notes: 'Notes',
  attachments: 'Attachments',
  relatedTestCases: 'Related Test Cases',
  
  // Messages
  sessionCreated: 'Session created successfully',
  sessionUpdated: 'Session updated successfully',
  sessionDeleted: 'Session deleted successfully',

  // f024 — Toast messages (Dev Spec §6-3 A7 / A16)
  toast: {
    loadFailed: 'Failed to load session.',
  },

  // f025 — EmptyState copy
  empty: {
    title: 'No discovery logs yet',
    description:
      'Exploratory testing captures what automated scripts miss. Start a session to record findings as you go.',
    cta: 'Start discovery log',
    secondaryCta: 'Learn about exploratory testing',
    illustrationAlt: 'A compass overlapping with a magnifying glass, surrounded by exploration dots',
  },
  emptyFiltered: {
    title: 'No logs match your filters',
    description: 'Try adjusting your search or filters.',
    clearCta: 'Clear filters',
  },
};

export default sessions;