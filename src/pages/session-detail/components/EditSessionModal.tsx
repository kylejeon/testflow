
import { useState, useEffect } from 'react';

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    mission: string;
    milestone_id: string | null;
    tags: string[];
    estimated_duration: number;
  }) => void;
  session: {
    name: string;
    charter: string;
    milestone_id: string | null;
    tags: string[];
    duration_minutes: number;
  };
  milestones: Array<{
    id: string;
    name: string;
  }>;
}

export default function EditSessionModal({
  isOpen,
  onClose,
  onSave,
  session,
  milestones,
}: EditSessionModalProps) {
  const [name, setName] = useState(session.name);
  const [mission, setMission] = useState(session.charter || '');
  const [milestoneId, setMilestoneId] = useState(session.milestone_id || '');
  const [tags, setTags] = useState(session.tags?.join(', ') || '');
  const [estimatedDuration, setEstimatedDuration] = useState(session.duration_minutes || 60);

  useEffect(() => {
    if (isOpen) {
      setName(session.name);
      setMission(session.charter || '');
      setMilestoneId(session.milestone_id || '');
      setTags(session.tags?.join(', ') || '');
      setEstimatedDuration(session.duration_minutes || 60);
    }
  }, [isOpen, session]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      mission,
      milestone_id: milestoneId || null,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      estimated_duration: estimatedDuration,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                >
                  <option value="">No milestone</option>
                  {milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Enter tags separated by commas"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate multiple tags with commas
                </p>
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="60"
                />
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
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
