// ═══════════════════════════════════════════════════════════
// SIDEBAR — Navigation with role-based menus
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiHome, HiChartBar, HiCog, HiClipboardList, HiBell,
  HiChat, HiPencilAlt, HiUser, HiUsers, HiMail,
  HiChevronLeft, HiChevronRight, HiDesktopComputer,
  HiLightningBolt, HiLogout, HiCube,
} from 'react-icons/hi';
import './Sidebar.css';

const clientLinks = [
  { to: '/dashboard', icon: HiHome, label: 'House Map' },
  { to: '/sensors', icon: HiChartBar, label: 'Sensor Dashboard' },
  { to: '/devices', icon: HiCog, label: 'Device Control' },
  { to: '/automations', icon: HiLightningBolt, label: 'Automation' },
  { to: '/requests', icon: HiClipboardList, label: 'My Requests' },
  { to: '/notifications', icon: HiBell, label: 'Notifications' },
  { to: '/messages', icon: HiChat, label: 'Messages' },
  { to: '/complaints', icon: HiPencilAlt, label: 'Complaints' },
  { to: '/profile', icon: HiUser, label: 'Profile' },
];

const adminLinks = [
  { to: '/admin', icon: HiHome, label: 'Dashboard' },
  { to: '/admin/clients', icon: HiUsers, label: 'Clients' },
  { to: '/admin/requests', icon: HiClipboardList, label: 'Requests' },
  { to: '/admin/complaints', icon: HiPencilAlt, label: 'Complaints' },
  { to: '/admin/messages', icon: HiChat, label: 'Messages' },
  { to: '/admin/mail', icon: HiMail, label: 'Mail' },
  { to: '/admin/esp32', icon: HiCube, label: 'ESP32 Boards' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const links = user?.role === 'admin' ? adminLinks : clientLinks;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏠</div>
        {!collapsed && <span className="sidebar-logo-text">Smart Home</span>}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin' || link.to === '/dashboard'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={collapsed ? link.label : undefined}
          >
            <link.icon className="sidebar-link-icon" />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="sidebar-footer">
        <button className="sidebar-link" onClick={logout} title="Logout">
          <HiLogout className="sidebar-link-icon" />
          {!collapsed && <span>Logout</span>}
        </button>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <HiChevronRight /> : <HiChevronLeft />}
        </button>
      </div>
    </aside>
  );
}
