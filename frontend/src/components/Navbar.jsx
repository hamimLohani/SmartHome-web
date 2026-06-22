// ═══════════════════════════════════════════════════════════
// NAVBAR — Top navigation bar
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiBell, HiMoon, HiSun, HiMenu, HiSearch } from 'react-icons/hi';
import './Navbar.css';

export default function Navbar({ onToggleSidebar }) {
  const { user, api } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Theme toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const data = await api('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n) => !n.is_read).length);
    } catch {
      // silently fail
    }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }

  function getNotifTypeClass(type) {
    switch (type) {
      case 'emergency': return 'notif-emergency';
      case 'danger': return 'notif-danger';
      case 'warning': return 'notif-warning';
      default: return 'notif-info';
    }
  }

  function formatTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="btn-ghost navbar-menu-btn" onClick={onToggleSidebar}>
          <HiMenu size={22} />
        </button>
        <div className="navbar-search">
          <HiSearch className="navbar-search-icon" />
          <input type="text" placeholder="Search..." className="navbar-search-input" />
        </div>
      </div>

      <div className="navbar-right">
        {/* Dark mode toggle */}
        <button
          className="navbar-icon-btn"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <HiSun size={20} /> : <HiMoon size={20} />}
        </button>

        {/* Notifications */}
        <div className="navbar-notif-wrapper" ref={notifRef}>
          <button
            className="navbar-icon-btn"
            onClick={() => setShowNotifs(!showNotifs)}
          >
            <HiBell size={20} />
            {unreadCount > 0 && (
              <span className="navbar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifs && (
            <div className="navbar-notif-dropdown animate-slide-up">
              <div className="notif-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="btn-ghost btn-sm" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.is_read ? 'unread' : ''} ${getNotifTypeClass(n.type)}`}
                    >
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-time">{formatTime(n.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="navbar-user">
          <div className="navbar-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user?.name}</span>
            <span className="navbar-user-role">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
