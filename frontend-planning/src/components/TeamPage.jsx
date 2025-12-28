import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Pour la redirection
import { Plus, MapPin, Mail, Store } from 'lucide-react';
import api from '../api';

const TeamPage = () => {
  const navigate = useNavigate(); // Le GPS pour changer de page

  // --- ÉTATS ---
  const [establishments, setEstablishments] = useState([]);
  const [employees, setEmployees] = useState([]);
  // On regarde si on a une sauvegarde, sinon on part de null
  const [selectedEst, setSelectedEst] = useState(() => {
    const saved = localStorage.getItem('lastSelectedEst');
    return saved ? JSON.parse(saved) : null;
  });

  // Gestion des Modales
  const [showEstModal, setShowEstModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Formulaires
  const [newEst, setNewEst] = useState({ name: '', address: '' });
  const [newUser, setNewUser] = useState({ full_name: '', email: '', role: 'employee' });

  // --- CHARGEMENT ---
  useEffect(() => {
    loadEstablishments();
  }, []);

  useEffect(() => {
    if (selectedEst) {
      loadEmployees(selectedEst.id);
    } else {
      setEmployees([]);
    }
  }, [selectedEst]);

// Sauvegarde automatique du choix
  useEffect(() => {
    if (selectedEst) {
      localStorage.setItem('lastSelectedEst', JSON.stringify(selectedEst));
    }
  }, [selectedEst]);

  const loadEstablishments = async () => {
    try {
      const res = await api.get('/establishments');
      setEstablishments(res.data);
      // Optionnel : Sélectionner le premier par défaut s'il y en a
      if (res.data.length > 0 && !selectedEst) {
        // setSelectedEst(res.data[0]); // Décommente si tu veux auto-sélectionner
      }
    } catch (err) { console.error(err); }
  };

  const loadEmployees = async (estId) => {
    try {
      const res = await api.get('/users', { params: { establishment_id: estId } });
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  // --- ACTIONS ---
  const handleCreateEst = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/establishments', newEst);
      setEstablishments([...establishments, res.data]);
      setShowEstModal(false);
      setNewEst({ name: '', address: '' });
    } catch (err) { alert("Erreur création établissement"); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newUser, establishment_id: selectedEst.id };
      const res = await api.post('/users', payload);
      setEmployees([...employees, res.data]);
      setShowUserModal(false);
      setNewUser({ full_name: '', email: '', role: 'employee' });
      alert(`Invitation envoyée à ${res.data.email} ! (Voir terminal backend)`);
    } catch (err) { alert("Erreur : Email déjà pris ?"); }
  };

  return (
    <div style={{ padding: '30px' }}>
      
      <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>🏢 Gestion des Établissements</h1>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>Sélectionnez une boutique pour voir l'équipe.</p>

      {/* --- GRILLE ÉTABLISSEMENTS --- */}
      <div style={styles.grid}>
        {establishments.map(est => (
          <div 
            key={est.id} 
            onClick={() => setSelectedEst(est)}
            style={{
              ...styles.card,
              ...(selectedEst?.id === est.id ? styles.activeCard : {})
            }}
          >
            <div style={styles.iconBox}><Store size={24} color="#3b82f6" /></div>
            <h3 style={{ margin: '10px 0 5px 0' }}>{est.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              <MapPin size={14} style={{ marginRight: '5px' }} />
              {est.address || "Adresse non définie"}
            </div>
          </div>
        ))}

        {/* Bouton Ajouter */}
        <div style={styles.addCard} onClick={() => setShowEstModal(true)}>
          <Plus size={40} color="#94a3b8" />
          <span style={{ color: '#64748b', fontWeight: 'bold', marginTop: '10px' }}>Ajouter un site</span>
        </div>
      </div>

      {/* --- LISTE EMPLOYÉS --- */}
      {selectedEst && (
        <div style={{ marginTop: '50px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#1e293b' }}>👥 Équipe : <span style={{ color: '#3b82f6' }}>{selectedEst.name}</span></h2>
            <button onClick={() => setShowUserModal(true)} style={styles.btnPrimary}>
              <Plus size={18} style={{ marginRight: '5px' }} /> Inviter un employé
            </button>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Rôle</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Aucun employé.</td></tr>
                ) : (
                  employees.map(emp => (
                    <tr 
                        key={emp.id} 
                        style={styles.trClickable}
                        // C'est ICI que la redirection se fait vers la page de profil
                        onClick={() => navigate(`/employee/${emp.id}`)}
                    >
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={styles.avatar}>{emp.full_name.charAt(0)}</div>
                          <strong>{emp.full_name}</strong>
                        </div>
                      </td>
                      <td style={styles.td}><Mail size={14} style={{ marginRight: '5px' }}/>{emp.email}</td>
                      <td style={styles.td}>
                        <span style={emp.role === 'manager' ? styles.badgeManager : styles.badgeEmployee}>
                          {emp.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{...styles.td, textAlign: 'left', color: '#3b82f6', fontWeight: 'bold'}}>
                        Voir Profil →
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALE CRÉATION ÉTABLISSEMENT --- */}
      {showEstModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Nouveau commerce</h3>
            <form onSubmit={handleCreateEst}>
              <input 
                style={styles.input} placeholder="Nom" required 
                value={newEst.name} onChange={e => setNewEst({...newEst, name: e.target.value})}
              />
              <input 
                style={styles.input} placeholder="Adresse" 
                value={newEst.address} onChange={e => setNewEst({...newEst, address: e.target.value})}
              />
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowEstModal(false)} style={styles.btnCancel}>Annuler</button>
                <button type="submit" style={styles.btnPrimary}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALE INVITATION EMPLOYÉ --- */}
      {showUserModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Inviter dans : {selectedEst.name}</h3>
            <form onSubmit={handleCreateUser}>
              <input 
                style={styles.input} placeholder="Nom complet" required 
                value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
              />
              <input 
                style={styles.input} type="email" placeholder="Email" required 
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
              />
              <select 
                style={styles.input} 
                value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="employee">Employé</option>
                <option value="manager">Manager</option>
                <option value="admin">Directeur</option>
              </select>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowUserModal(false)} style={styles.btnCancel}>Annuler</button>
                <button type="submit" style={styles.btnPrimary}>Envoyer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// --- STYLES ---
const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' },
  card: { background: 'white', padding: '20px', borderRadius: '12px', border: '2px solid transparent', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' },
  activeCard: { borderColor: '#3b82f6', boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)' },
  addCard: { border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '140px', cursor: 'pointer' },
  iconBox: { width: '40px', height: '40px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' },
  
  tableContainer: { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', fontWeight: '600' },
  td: { padding: '15px', fontSize: '0.95rem', color: '#334155' },
  trClickable: { borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.1s' },
  
  avatar: { width: '32px', height: '32px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' },
  badgeManager: { background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  badgeEmployee: { background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  
  btnPrimary: { background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  btnCancel: { background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '400px' },
  input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }
};

export default TeamPage;