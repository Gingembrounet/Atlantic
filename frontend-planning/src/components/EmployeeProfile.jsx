import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Briefcase, DollarSign, User, Clock, Calendar, ShieldAlert, CheckCircle } from 'lucide-react';
import api from '../api';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Pour stocker le message d'erreur
  const [successMsg, setSuccessMsg] = useState(''); // Pour le petit message "Sauvegardé"

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'employee',
    hourly_rate: 0
  });

  // 1. Charger le profil
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/${id}`);
        setFormData({
            full_name: res.data.full_name,
            email: res.data.email,
            role: res.data.role,
            hourly_rate: res.data.hourly_rate
        });
        setLoading(false);
      } catch (err) {
        setLoading(false);
        // Au lieu de alert(), on stocke l'erreur pour l'afficher joliment
        if (err.response && err.response.status === 403) {
            setError("⛔ Accès refusé : Vous n'avez pas les droits sur cet employé.");
        } else if (err.response && err.response.status === 404) {
            setError("🔍 Cet employé n'existe pas.");
        } else {
            setError("🔥 Erreur technique. Vérifiez votre connexion.");
        }
      }
    };
    fetchUser();
  }, [id]);

  // 2. Sauvegarder
  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg(''); // Reset du message
    try {
      await api.put(`/users/${id}`, formData);
      
      // Petit message vert qui disparaît après 3 secondes
      setSuccessMsg("✅ Profil mis à jour avec succès !");
      setTimeout(() => setSuccessMsg(''), 3000);
      
    } catch (err) {
      alert("Erreur sauvegarde"); // Là ok, si ça plante à la sauvegarde, c'est grave
    }
  };

  // --- RENDU : Gestion des cas "Chargement" ou "Erreur" ---

  if (loading) return <div style={styles.centerMessage}>Chargement du profil...</div>;

  // SI ERREUR : On affiche une belle carte rouge au lieu du formulaire
  if (error) return (
    <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
            <ShieldAlert size={50} color="#ef4444" />
            <h2 style={{ color: '#1e293b' }}>Oups !</h2>
            <p style={{ color: '#64748b', textAlign: 'center' }}>{error}</p>
            <button onClick={() => navigate('/team')} style={styles.btnSecondary}>
                <ArrowLeft size={16} style={{marginRight: '5px'}}/> Retour à l'équipe
            </button>
        </div>
    </div>
  );

  // SI TOUT VA BIEN : On affiche la page
  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={() => navigate('/team')} style={styles.backBtn}>
          <ArrowLeft size={20} /> Retour
        </button>
        <h1 style={{ marginLeft: '20px', fontSize: '1.8rem', color: '#1e293b' }}>
          Profil Employé
        </h1>
      </div>

      <div style={styles.gridContainer}>
        
        {/* COLONNE GAUCHE */}
        <div style={styles.card}>
            <div style={styles.avatarHeader}>
                <div style={styles.bigAvatar}>{formData.full_name.charAt(0)}</div>
                <h2 style={{ margin: '10px 0 5px 0' }}>{formData.full_name}</h2>
                <span style={styles.badge}>ID #{id}</span>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
                <div style={styles.field}>
                    <label style={styles.label}><User size={16}/> Nom complet</label>
                    <input 
                        style={styles.input} 
                        value={formData.full_name}
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}><Mail size={16}/> Email</label>
                    <input style={{...styles.input, background: '#f1f5f9'}} value={formData.email} disabled />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={styles.field}>
                        <label style={styles.label}><Briefcase size={16}/> Rôle</label>
                        <select 
                            style={styles.input} 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="employee">Employé</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Directeur</option>
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}><DollarSign size={16}/> Taux horaire (€)</label>
                        <input 
                            type="number" 
                            style={styles.input} 
                            value={formData.hourly_rate}
                            onChange={e => setFormData({...formData, hourly_rate: e.target.value})}
                        />
                    </div>
                </div>

                {/* ZONE DE SAUVEGARDE */}
                <div style={{marginTop: '10px'}}>
                    <button type="submit" style={styles.saveBtn}>
                        <Save size={18} style={{ marginRight: '8px' }}/> Enregistrer
                    </button>
                    {/* Le message de succès s'affiche ici */}
                    {successMsg && (
                        <div style={styles.successMessage}>
                            <CheckCircle size={16} /> {successMsg}
                        </div>
                    )}
                </div>

            </form>
        </div>

        {/* COLONNE DROITE : STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={styles.card}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={20} color="#3b82f6"/> Activité (Ce mois)
                </h3>
                <div style={styles.statRow}>
                    <span>Heures planifiées</span> <strong>142 h</strong>
                </div>
                <div style={styles.statRow}>
                    <span>Coût estimé</span> <strong>{(142 * formData.hourly_rate).toFixed(2)} €</strong>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

const styles = {
    // Layout global
    centerMessage: { padding: '50px', textAlign: 'center', color: '#64748b', fontSize: '1.2rem' },
    errorContainer: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    errorCard: { background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' },
    
    // Header & Boutons
    backBtn: { display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1rem', fontWeight: 'bold' },
    btnSecondary: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#475569' },
    
    // Grille et Cartes
    gridContainer: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' },
    card: { background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    
    // Avatar
    avatarHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' },
    bigAvatar: { width: '100px', height: '100px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' },
    badge: { background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' },
    
    // Formulaire
    field: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
    label: { fontSize: '0.9rem', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' },
    
    // Bouton Save & Feedback
    saveBtn: { width: '100%', padding: '15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', transition: 'background 0.2s' },
    successMessage: { marginTop: '10px', color: '#16a34a', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', animation: 'fadeIn 0.3s' },
    
    statRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #e2e8f0' }
};

export default EmployeeProfile;