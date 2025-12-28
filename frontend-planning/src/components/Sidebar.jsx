import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Users, Settings, LogOut, Clock } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: <Calendar size={20} />, label: 'Planning' },
    { path: '/shifts', icon: <Clock size={20} />, label: 'Modèles' },
    { path: '/team', icon: <Users size={20} />, label: 'Équipe' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Réglages' },
  ];

  return (
    <div style={styles.sidebar}>
      {/* 1. HEADER (LOGO) */}
      <div style={styles.logoArea}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          ⚡ FastPlanning
        </h2>
        <small style={{ opacity: 0.6, fontSize: '0.8rem' }}>Admin Mode</small>
      </div>

      {/* 2. NAVIGATION (Prend toute la place disponible au milieu) */}
      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              ...styles.link,
              ...(isActive(item.path) ? styles.activeLink : {}),
            }}
          >
            {item.icon}
            <span style={{ marginLeft: '10px' }}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 3. FOOTER (Bouton Déconnexion) */}
      <div style={styles.footer}>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <LogOut size={16} /> 
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

// --- LE CSS COMPLET ---
const styles = {
  sidebar: {
    width: '250px',
    height: '100vh',           // Prend toute la hauteur de l'écran
    backgroundColor: '#1e293b', // Bleu nuit (Dark Mode)
    color: 'white',
    display: 'flex',           // Active le mode Flexbox
    flexDirection: 'column',   // Empile les éléments verticalement
    position: 'fixed',         // Reste collé à gauche même si on scrolle
    left: 0,
    top: 0,
    zIndex: 1000,              // Reste au-dessus du reste
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
  },
  logoArea: {
    padding: '25px 20px',
    borderBottom: '1px solid #334155',
  },
  nav: {
    flex: 1,                   // C'est CA le secret : ça pousse le footer tout en bas
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 15px',
    textDecoration: 'none',
    color: '#94a3b8',          // Gris clair par défaut
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    fontSize: '0.95rem',
  },
  activeLink: {
    backgroundColor: '#3b82f6', // Bleu vif quand actif
    color: 'white',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  footer: {
    padding: '20px',
    borderTop: '1px solid #334155',
    backgroundColor: '#0f172a', // Un peu plus foncé que le reste
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '10px',
    width: '100%',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    transition: 'background 0.2s',
  }
};

export default Sidebar;