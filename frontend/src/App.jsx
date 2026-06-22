// ═══════════════════════════════════════════════════════════
// APP.JSX — Root router with protected routes
// ═══════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

// Client pages
import ClientDashboard from './pages/ClientDashboard';
import SensorReadings from './pages/SensorReadings';
import DeviceControl from './pages/DeviceControl';
import Automations from './pages/Automations';
import Requests from './pages/Requests';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Complaints from './pages/Complaints';
import Profile from './pages/Profile';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClients from './pages/admin/AdminClients';
import AdminRequests from './pages/admin/AdminRequests';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminMessages from './pages/admin/AdminMessages';
import AdminMail from './pages/admin/AdminMail';
import AdminEsp32 from './pages/admin/AdminEsp32';

// ───────────────────────────────────────────────────────────
// Layout wrapper with sidebar + navbar
// ───────────────────────────────────────────────────────────

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`main-content ${!sidebarOpen ? 'collapsed' : ''}`}>
        <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <Outlet />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Protected route — requires auth
// ───────────────────────────────────────────────────────────

function RequireAuth({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-primary)',
      }}>
        <div style={{ fontSize: 48 }}>🏠</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Loading Smart Home...</div>
        <div style={{ width: 200, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 2, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 50%, var(--primary) 100%)' }} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (!adminOnly && user.role === 'admin') return <Navigate to="/admin" replace />;

  return children;
}

// ───────────────────────────────────────────────────────────
// Route definitions
// ───────────────────────────────────────────────────────────

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/verify" element={<VerifyEmail />} />

      {/* Client routes */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<ClientDashboard />} />
        <Route path="/sensors" element={<SensorReadings />} />
        <Route path="/devices" element={<DeviceControl />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Admin routes */}
      <Route element={<RequireAuth adminOnly><AppLayout /></RequireAuth>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/clients" element={<AdminClients />} />
        <Route path="/admin/requests" element={<AdminRequests />} />
        <Route path="/admin/complaints" element={<AdminComplaints />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        <Route path="/admin/mail" element={<AdminMail />} />
        <Route path="/admin/esp32" element={<AdminEsp32 />} />
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 64 }}>🏚️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>404 — Page Not Found</h1>
          <a href="/" style={{ color: 'var(--primary)' }}>← Go Home</a>
        </div>
      } />
    </Routes>
  );
}

// ───────────────────────────────────────────────────────────
// Root App
// ───────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'white' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
