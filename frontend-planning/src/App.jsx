import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PlanningGrid from './components/PlanningGrid';
import LoginPage from './components/LoginPage';
import SetupPassword from './components/SetupPassword';
import { AuthProvider, useAuth } from './context/AuthContext';
import TeamPage from './components/TeamPage';
import EmployeeProfile from './components/EmployeeProfile';
import ShiftsPage from './components/ShiftsPage';

// Un composant "Wrapper" pour protéger les routes
const PrivateRoute = () => {
  const { isAuthenticated } = useAuth();
  // Si pas connecté -> Hop, direction Login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

// Le Layout principal (Sidebar + Contenu)
const DashboardLayout = () => (
  <div style={{ display: 'flex' }}>
    <Sidebar />
    <main style={{ marginLeft: '250px', width: '100%', background: '#f8fafc', minHeight: '100vh' }}>
      <Outlet /> {/* C'est ici que s'affichent Planning/Team... */}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Routes Publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-password" element={<SetupPassword />} />

          {/* Routes Protégées (Il faut être connecté) */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<PlanningGrid />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/employee/:id" element={<EmployeeProfile />} />
              <Route path="/settings" element={<div>Page Réglages</div>} />
              <Route path="/shifts" element={<ShiftsPage />} />
            </Route>
          </Route>
          
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;