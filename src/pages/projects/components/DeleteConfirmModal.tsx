import type { Project } from '../../../lib/supabase';

interface DeleteConfirmModalProps {
  project: Project;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function DeleteConfirmModal({ project, onClose, onDelete }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-red-600"></i>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            프로젝트 삭제
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            <strong className="text-gray-900">{project.name}</strong> 프로젝트를 삭제하시겠습니까?<br />
            이 작업은 되돌릴 수 없습니다.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              취소
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
