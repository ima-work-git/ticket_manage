import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ticket/:id" element={<TicketDetail />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/manage" element={<Manage />} />
      <Route path="/manage/:id" element={<GroupDetail />} />
      <Route path="/manage/:id/members" element={<MemberManage />} />
      <Route path="/manage/:id/templates" element={<TemplateManage />} />
      <Route path="/manage/:id/issue" element={<IssueTicket />} />
      <Route path="/manage/:id/consume" element={<ConsumeTicket />} />
      <Route path="/manage/:id/staff" element={<StaffManage />} />
      <Route path="/manage/:id/logs" element={<Logs />} />
      <Route path="/settings" element={<Settings />} />
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
