import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ChecklistItemProps {
  label: string;
  completed: boolean;
  icon: string;
  linkTo: string;
  optional?: boolean;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  label,
  completed,
  icon,
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
        <i className="ri-checkbox-circle-fill text-xl text-green-500 shrink-0" />
      ) : (
        <i className="ri-circle-line text-xl text-gray-300 shrink-0" />
      )}
      <i
        className={`${icon} text-base shrink-0 ${completed ? 'text-gray-400' : 'text-indigo-700'}`}
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
