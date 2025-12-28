import React, { useState, useEffect } from 'react';
import { X, Trash2, Clock, MapPin, Briefcase, HeartPulse, Palmtree } from 'lucide-react';
import { format } from 'date-fns';

const ShiftModal = ({ isOpen, onClose, onSave, onDelete, initialData, selectedDate, userName, templates = [] }) => {
  if (!isOpen) return null;

  // EST-CE QU'ON EST EN MODE CRÉATION OU MODIF ?
  const isEdit = !!initialData;

  // --- ÉTATS ---
  const [activeTab, setActiveTab] = useState('work'); // 'work' ou 'absence'
  
  // Formulaire
  const [formData, setFormData] = useState({
    planned_start: '',
    planned_end: '',
    position: 'Service',
    type: 'work',
    quantity : ''
  });

  // INITIALISATION
  useEffect(() => {
    if (initialData) {
      // Si on modifie un shift existant
      setFormData({
        planned_start: initialData.planned_start.slice(0, 16),
        planned_end: initialData.planned_end.slice(0, 16),
        position: initialData.position,
        type: initialData.type || 'work'
      });
      // On met le bon onglet selon le type
      setActiveTab(initialData.type === 'work' ? 'work' : 'absence');
    } else if (selectedDate) {
      // Si c'est un nouveau shift
      const baseDate = format(selectedDate, "yyyy-MM-dd");
      setFormData({
        planned_start: `${baseDate}T09:00`,
        planned_end: `${baseDate}T17:00`,
        position: 'Service',
        type: 'work'
      });
      setActiveTab('work');
    }
  }, [initialData, selectedDate]);

  // --- MAGIE : APPLIQUER UN MODÈLE ---
  const applyTemplate = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    if (!template) return;

    // On garde la date du jour sélectionné, mais on met l'heure du modèle
    const baseDate = formData.planned_start.split('T')[0]; 
    
    setFormData({
        ...formData,
        planned_start: `${baseDate}T${template.start_time}`,
        planned_end: `${baseDate}T${template.end_time}`,
        position: template.position,
        type: 'work' // Un modèle c'est toujours du travail
    });
  };

  // --- GESTION CHANGEMENT TYPE ABSENCE ---
  const handleTypeChange = (newType) => {
      // Si on choisit une absence, on met "Congé" ou "Maladie" comme titre de poste par défaut
      let label = "Absence";
      if (newType === 'vacation') label = "Congé Payé";
      if (newType === 'rtt') label = "RTT";
      if (newType === 'sick') label = "Maladie";
      if (newType === 'unpaid') label = "Sans Solde";

      setFormData({ ...formData, type: newType, position: label });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Si on est dans l'onglet absence, on s'assure que le type n'est pas 'work'
    if (activeTab === 'absence' && formData.type === 'work') {
        formData.type = 'vacation'; // Sécurité
    }
    // Si on est dans l'onglet travail, on force le type 'work'
    if (activeTab === 'work') {
        formData.type = 'work';
    }
    onSave(formData);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <h3>{isEdit ? "Modifier" : "Planifier"}</h3>
          <button onClick={onClose} style={styles.closeBtn}><X size={20}/></button>
        </div>
        <p style={{marginTop: -10, marginBottom: 20, color: '#64748b', fontSize: '0.9rem'}}>
          Pour : <strong>{userName}</strong>
        </p>

        {/* ONGLETS (Travail vs Absence) */}
        <div style={styles.tabs}>
            <button 
                type="button"
                style={activeTab === 'work' ? styles.activeTab : styles.tab}
                onClick={() => setActiveTab('work')}
            >
                <Briefcase size={16}/> Travail
            </button>
            <button 
                type="button"
                style={activeTab === 'absence' ? styles.activeTabAbsence : styles.tab}
                onClick={() => { setActiveTab('absence'); handleTypeChange('vacation'); }}
            >
                <Palmtree size={16}/> Absence
            </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* --- CONTENU ONGLET TRAVAIL --- */}
          {activeTab === 'work' && (
              <>
                {/* SELECTEUR DE MODÈLE (Uniquement si des modèles existent) */}
                {templates.length > 0 && (
                    <div style={{marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #e2e8f0'}}>
                        <label style={styles.label}>⚡ Remplissage rapide</label>
                        <select style={styles.select} onChange={(e) => applyTemplate(e.target.value)} defaultValue="">
                            <option value="" disabled>Choisir un modèle...</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.start_time}-{t.end_time})</option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div style={styles.field}>
                    <label style={styles.label}><MapPin size={16}/> Poste</label>
                    <select 
                        style={styles.input}
                        value={formData.position}
                        onChange={e => setFormData({...formData, position: e.target.value})}
                    >
                        <option value="Service">Service</option>
                        <option value="Bar">Bar</option>
                        <option value="Cuisine">Cuisine</option>
                        <option value="Plonge">Plonge</option>
                        <option value="Responsable">Responsable</option>
                    </select>
                </div>
                      {/* --- CHAMPS HEURES (Communs) --- */}
                <div style={{display: 'flex', gap: '10px', marginTop: '0px'}}>
                  <div style={styles.field}>
                      <label style={styles.label}><Clock size={14}/> Début</label>
                      <input 
                      type="datetime-local" style={styles.input}
                      value={formData.planned_start}
                      onChange={e => setFormData({...formData, planned_start: e.target.value})}
                      required
                      />
                  </div>
                </div>
                <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                  <div style={styles.field}>
                      <label style={styles.label}><Clock size={14}/> Fin</label>
                      <input 
                      type="datetime-local" style={styles.input}
                      value={formData.planned_end}
                      onChange={e => setFormData({...formData, planned_end: e.target.value})}
                      required
                      />
                  </div>
                </div>
              </>
              
          )}

          {/* --- CONTENU ONGLET ABSENCE --- */}
          {activeTab === 'absence' && (
            <>
              <div style={styles.field}>
                <label style={styles.label}><HeartPulse size={16}/> Motif</label>
                <select 
                    style={styles.input}
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                >
                    <option value="vacation">🏖️ Congé Payé</option>
                    <option value="rtt">🚲 RTT</option>
                    <option value="sick">💊 Maladie</option>
                    <option value="unpaid">💸 Congé Sans Solde</option>
                    <option value="other">❓ Autre</option>
                </select>
              </div>
              <div>
                <input 
                style={styles.input} placeholder="Quantité" required 
                value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
              </div>
            </> 
              
          )}

          

          {/* --- ACTIONS --- */}
          <div style={styles.actions}>
            {isEdit && (
              <button type="button" onClick={onDelete} style={styles.deleteBtn}>
                <Trash2 size={18}/>
              </button>
            )}
            <div style={{flex: 1}}></div>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Annuler</button>
            <button type="submit" style={styles.saveBtn}>Enregistrer</button>
          </div>

        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  modal: { background: 'white', padding: '25px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
  
  tabs: { display: 'flex', gap: '10px', marginBottom: '20px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' },
  tab: { flex: 1, padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', color: '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  activeTab: { flex: 1, padding: '8px', border: 'none', background: 'white', cursor: 'pointer', borderRadius: '6px', color: '#3b82f6', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  activeTabAbsence: { flex: 1, padding: '8px', border: 'none', background: 'white', cursor: 'pointer', borderRadius: '6px', color: '#ef4444', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },

  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 },
  label: { fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', width: '100%' },
  select: { padding: '10px', borderRadius: '6px', border: '1px solid #3b82f6', fontSize: '0.95rem', width: '100%', backgroundColor: '#eff6ff', color: '#1e40af', cursor: 'pointer' },
  
  actions: { display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' },
  saveBtn: { padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', background: 'transparent', color: '#64748b', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  deleteBtn: { padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }
};

export default ShiftModal;