import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { TicketDetail } from './pages/TicketDetail';
import { Scan } from './pages/Scan';
import { Manage } from './pages/Manage';
import { GroupDetail } from './pages/GroupDetail';
import { MemberManage } from './pages/MemberManage';
import { TemplateManage } from './pages/TemplateManage';
import { IssueTicket } from './pages/IssueTicket';
import { ConsumeTicket } from './pages/ConsumeTicket';
import { StaffManage } from './pages/StaffManage';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { SuperAdmin } from './pages/SuperAdmin';
import { StaffInvite } from './pages/StaffInvite';
import { isStaffMode } from './utils/staffMode';

function StaffRoute({ children }: { children: React.ReactNode }) {
  if (!isStaffMode()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
          }}
        >
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/staff-invite" element={<StaffInvite />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ticket/:id" element={<TicketDetail />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/manage" element={<StaffRoute><Manage /></StaffRoute>} />
      <Route path="/manage/:id" element={<StaffRoute><GroupDetail /></StaffRoute>} />
      <Route path="/manage/:id/members" element={<StaffRoute><MemberManage /></StaffRoute>} />
      <Route path="/manage/:id/templates" element={<StaffRoute><TemplateManage /></StaffRoute>} />
      <Route path="/manage/:id/issue" element={<StaffRoute><IssueTicket /></StaffRoute>} />
      <Route path="/manage/:id/consume" element={<StaffRoute><ConsumeTicket /></StaffRoute>} />
      <Route path="/manage/:id/staff" element={<StaffRoute><StaffManage /></StaffRoute>} />
      <Route path="/manage/:id/logs" element={<StaffRoute><Logs /></StaffRoute>} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/super-admin" element={<SuperAdmin />} />
      <Route path="/staff-invite" element={<StaffInvite />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
