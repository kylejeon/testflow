import React from 'react';
import { LucideIcon, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChecklistItemProps {
  label: string;
  completed: boolean;
  icon: LucideIcon;
  linkTo: string;
  optional?: boolean;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  label,
  completed,
  icon: Icon,
  linkTo,
  optional = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!completed) {
      navigate(linkTo);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={completed}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
        completed
          ? 'cursor-default'
          : 'hover:bg-gray-50 cursor-pointer'
      }`}
    >
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-300 shrink-0" />
      )}
      <Icon
        className={`w-4 h-4 shrink-0 ${completed ? 'text-gray-400' : 'text-[#4338CA]'}`}
      />
      <span
        className={`text-sm flex-1 ${
          completed ? 'text-gray-400 line-through' : 'text-gray-700'
        }`}
      >
        {label}
        {optional && (
          <span className="ml-1 text-xs text-gray-400">(optional)</span>
        )}
      </span>
    </button>
  );
};

export default ChecklistItem;
