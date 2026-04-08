import { useState, useEffect, useRef } from 'react';
import { ModalShell } from '../../../components/ModalShell';

interface ProjectMember {
  user_id: string;
  full_name: string;
  email: string;
}

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    mission: string;
    milestone_id: string | null;
    tags: string[];
    estimated_duration: number;
    assignees: string[];
  }) => void;
  session: {
    name: string;
    charter: string;
    milestone_id: string | null;
    tags: string[];
    duration_minutes: number;
    assignees?: string[];
  };
  milestones: Array<{
    id: string;
    name: string;
  }>;
  projectMembers?: ProjectMember[];
}

export default function EditSessionModal({
  isOpen,
  onClose,
  onSave,
  session,
  milestones,
  projectMembers = [],
}: EditSessionModalProps) {
  const [name, setName] = useState(session.name);
  const [mission, setMission] = useState(session.charter || '');
  const [milestoneId, setMilestoneId] = useState(session.milestone_id || '');
  const [tags, setTags] = useState(session.tags?.join(', ') || '');
  const [tagInput, setTagInput] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number>((session.duration_minutes || 60) / 60);
  const [assignees, setAssignees] = useState<string[]>(session.assignees || []);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(session.name);
      setMission(session.charter || '');
      setMilestoneId(session.milestone_id || '');
      setTags(session.tags?.join(', ') || '');
      setTagInput('');
      setEstimatedHours((session.duration_minutes || 60) / 60);
      setAssignees(session.assignees || []);
      setShowAssigneeDropdown(false);
      setAssigneeSearch('');
    }
  }, [isOpen, session]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAssigneeToggle = (userId: string) => {
    setAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      mission,
      milestone_id: milestoneId || null,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      estimated_duration: Math.round(estimatedHours * 60),
      assignees,
    });
  };

  const avatarColors = [
    'from-indigo-400 to-indigo-600',
    'from-orange-400 to-orange-600',
    'from-violet-400 to-violet-600',
    'from-pink-400 to-pink-600',
    'from-sky-400 to-sky-600',
  ];

  if (!isOpen) return null;

  return (
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Enter session name"
                />
              </div>

              {/* Mission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mission / Charter
                </label>
                <textarea
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                  placeholder="Describe the mission or charter for this session"
                />
              </div>

              {/* Milestone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Milestone
                </label>
                <select
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm cursor-pointer"
                >
                  <option value="">No milestone</option>
                  {milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignees
                </label>

                {/* Selected chips */}
                {assignees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {assignees.map((userId) => {
                      const member = projectMembers.find(m => m.user_id === userId);
                      if (!member) return null;
                      const colorIdx = projectMembers.findIndex(m => m.user_id === userId);
                      const colorClass = avatarColors[colorIdx % avatarColors.length];
                      return (
                        <div
                          key={userId}
                          className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-indigo-50 border border-indigo-200 rounded-full"
                        >
                          <div className={`w-5 h-5 bg-gradient-to-br ${colorClass} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                            {member.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-indigo-700">{member.full_name}</span>
                          <button
                            type="button"
                            onClick={() => handleAssigneeToggle(userId)}
                            className="w-4 h-4 flex items-center justify-center text-indigo-400 hover:text-indigo-700 cursor-pointer ml-0.5"
                          >
                            <i className="ri-close-line text-xs"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown trigger */}
                <div className="relative" ref={assigneeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssigneeDropdown(prev => !prev);
                      setAssigneeSearch('');
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white"
                  >
                    <span>
                      {assignees.length > 0 ? `${assignees.length}명 선택됨` : '멤버 선택...'}
                    </span>
                    <i className={`ri-arrow-${showAssigneeDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
                  </button>

                  {showAssigneeDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      {/* Search */}
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="text"
                            value={assigneeSearch}
                            onChange={e => setAssigneeSearch(e.target.value)}
                            placeholder="멤버 검색..."
                            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Member list */}
                      <div className="max-h-48 overflow-y-auto">
                        {projectMembers.length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-4">프로젝트 멤버가 없습니다.</p>
                        ) : (
                          projectMembers
                            .filter(m =>
                              m.full_name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                              m.email.toLowerCase().includes(assigneeSearch.toLowerCase())
                            )
                            .map((member) => {
                              const isSelected = assignees.includes(member.user_id);
                              const colorIdx = projectMembers.findIndex(m => m.user_id === member.user_id);
                              const colorClass = avatarColors[colorIdx % avatarColors.length];
                              return (
                                <div
                                  key={member.user_id}
                                  onClick={() => handleAssigneeToggle(member.user_id)}
                                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className={`w-7 h-7 bg-gradient-to-br ${colorClass} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                                    {member.full_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{member.full_name}</p>
                                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                                  </div>
                                  {isSelected && (
                                    <i className="ri-check-line text-indigo-500 text-sm flex-shrink-0"></i>
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                {tags && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-medium">
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const list = tags.split(',').map(t => t.trim()).filter(Boolean);
                            list.splice(i, 1);
                            setTags(list.join(', '));
                          }}
                          className="cursor-pointer text-indigo-400 hover:text-indigo-700 ml-0.5"
                        >
                          <i className="ri-close-line text-xs" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const trimmed = tagInput.trim().replace(/,$/, '');
                      if (!trimmed) return;
                      const existing = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                      if (!existing.includes(trimmed)) {
                        setTags([...existing, trimmed].join(', '));
                      }
                      setTagInput('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Type a tag and press Enter"
                />
                <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a tag</p>
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="2"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">h</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter duration in hours (e.g. 2 = 2h, 1.5 = 1h 30m)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
