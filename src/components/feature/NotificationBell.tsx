import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../../hooks/useNotifications';

const TYPE_CONFIG: Record<string, { icon: string; bg: string; color: string }> = {
  invitation_sent: { icon: 'ri-mail-send-line', bg: 'bg-teal-100', color: 'text-teal-600' },
  member_joined: { icon: 'ri-user-add-line', bg: 'bg-green-100', color: 'text-green-600' },
  run_completed: { icon: 'ri-checkbox-circle-line', bg: 'bg-violet-100', color: 'text-violet-600' },
  run_created: { icon: 'ri-play-circle-line', bg: 'bg-orange-100', color: 'text-orange-600' },
  milestone_completed: { icon: 'ri-flag-fill', bg: 'bg-green-100', color: 'text-green-600' },
  milestone_past_due: { icon: 'ri-alarm-warning-line', bg: 'bg-red-100', color: 'text-red-600' },
  milestone_started: { icon: 'ri-flag-line', bg: 'bg-teal-100', color: 'text-teal-600' },
  default: { icon: 'ri-notification-3-line', bg: 'bg-gray-100', color: 'text-gray-600' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.default;
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayed = activeTab === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
      navigate(notification.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
        aria-label="Notifications"
      >
        <i className="ri-notification-3-line text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-[380px] bg-white rounded-xl border border-gray-200 z-50 overflow-hidden flex flex-col"
          style={{ maxHeight: '520px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>

          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer whitespace-nowrap transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mt-3">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'unread'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 leading-none ${
                    activeTab === 'unread' ? 'bg-white text-gray-900' : 'bg-red-500 text-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <i className="ri-notification-off-line text-2xl text-gray-400"></i>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
                <p className="text-xs text-gray-400 text-center">
                  Notifications appear for team invitations, run completions, and milestone updates
                </p>
              </div>
            ) : (
              <ul>
                {displayed.map((notification) => {
                  const config = getTypeConfig(notification.type);
                  return (
                    <li
                      key={notification.id}
                      className={`group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-50 ${
                        !notification.is_read ? 'bg-teal-50/40' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <i className={`${config.icon} ${config.color} text-base`}></i>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{notification.message}</p>
                        <p className="text-[11px] text-gray-400 mt-1.5">{getRelativeTime(notification.created_at)}</p>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer flex-shrink-0 mt-0.5"
                        aria-label="Delete notification"
                      >
                        <i className="ri-close-line text-sm"></i>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
