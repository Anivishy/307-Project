import {
  Bell,
  Inbox,
  PackagePlus
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import {
  getNotifications,
  markNotificationsRead
} from '../lib/notificationApi.js';
import { getSavedSession } from '../lib/session.js';

const NOTIFICATION_REFRESH_EVENT =
  'recipe-collab:notifications-refresh';

function getNotificationIcon(type) {
  if (type === 'INGREDIENT_ADDED') {
    return PackagePlus;
  }

  return Bell;
}

function formatNotificationTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function badgeLabel(count) {
  return count > 99 ? '99+' : String(count);
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const rootRef = useRef(null);

  const refreshNotifications = useCallback(
    async ({ updateUnread = true } = {}) => {
      if (!getSavedSession()?.profileId) {
        setNotifications([]);
        setUnreadCount(0);
        return null;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const payload = await getNotifications();
        setNotifications(payload.notifications ?? []);

        if (updateUnread) {
          setUnreadCount(payload.unreadCount ?? 0);
        }

        return payload;
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load notifications.'
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!getSavedSession()?.profileId) {
      return undefined;
    }

    void refreshNotifications();

    const intervalId = window.setInterval(() => {
      void refreshNotifications();
    }, 30_000);
    const handleRefresh = () => {
      void refreshNotifications();
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener(
      NOTIFICATION_REFRESH_EVENT,
      handleRefresh
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener(
        NOTIFICATION_REFRESH_EVENT,
        handleRefresh
      );
    };
  }, [refreshNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown
      );
    };
  }, [isOpen]);

  async function openInbox() {
    const payload = await refreshNotifications({
      updateUnread: false
    });

    if (!payload) {
      return;
    }

    const readAt = new Date().toISOString();
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? readAt
      }))
    );

    if ((payload.unreadCount ?? 0) > 0) {
      try {
        await markNotificationsRead();
      } catch {
        void refreshNotifications();
      }
    }
  }

  async function handleBellClick() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    await openInbox();
  }

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        className={`glass-icon-button notification-bell__button${
          isOpen ? ' is-open' : ''
        }`}
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleBellClick}>
        <Bell size={21} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {badgeLabel(unreadCount)}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          className="notification-popover surface-card"
          role="dialog"
          aria-label="Notification inbox">
          <header className="notification-popover__header">
            <div>
              <strong>Inbox</strong>
              <span>{notifications.length} recent</span>
            </div>
            <Inbox size={18} />
          </header>

          {isLoading && (
            <p className="notification-popover__state">
              Loading notifications...
            </p>
          )}

          {errorMessage && (
            <p className="notification-popover__state notification-popover__state--error">
              {errorMessage}
            </p>
          )}

          {!isLoading &&
            !errorMessage &&
            notifications.length === 0 && (
              <p className="notification-popover__state">
                No notifications yet.
              </p>
            )}

          {!errorMessage && notifications.length > 0 && (
            <ul className="notification-list">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(
                  notification.type
                );

                return (
                  <li
                    className={`notification-item${
                      notification.readAt ? '' : ' is-unread'
                    }`}
                    key={notification.id}>
                    <span className="notification-item__icon">
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>
                        {formatNotificationTime(
                          notification.createdAt
                        )}
                      </small>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
