import React, { useState, useEffect } from 'react';
import { Plus, Store, Clock, Trash2, Coffee } from 'lucide-react'; // J'ai ajouté l'icône Coffee ☕
import api from '../api';

const ShiftsPage = () => {
  const [establishments, setEstablishments] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  const [selectedEst, setSelectedEst] = useState(() => {
    const saved = localStorage.getItem('lastSelectedEst');
    return saved ? JSON.parse(saved) : null;
  });

  const [showModal, setShowModal] = useState(false);
  
  // --- ÉTAT UNIQUE : On met TOUT dans newTemplate ---
  const initialTemplateState = { 
    name: '', 
    start_time: '09:00', 
    end_time: '17:00', 
    position: 'Service', 
    applicable_days: [0, 1, 2, 3, 4, 5, 6],
    // Infos Pauses intégrées ici :
    break_type: 'flexible',
    break_duration: 0,
    break_times: [], 
    break_paid: false
  };

  const [newTemplate, setNewTemplate] = useState(initialTemplateState);

  // Liste des jours pour l'affichage
  const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  useEffect(() => {
    loadEstablishments();
  }, []);

  useEffect(() => {
    if (selectedEst) {
      localStorage.setItem('lastSelectedEst', JSON.stringify(selectedEst));
      loadTemplates(selectedEst.id);
    } else {
      setTemplates([]);
    }
  }, [selectedEst]);

  const loadEstablishments = async () => {
    try {
      const res = await api.get('/establishments');
      setEstablishments(res.data);
      if (res.data.length > 0 && !selectedEst) setSelectedEst(res.data[0]);
    } catch (err) { console.error(err); }
  };

  const loadTemplates = async (estId) => {
    try {
      const res = await api.get('/shift-templates', { params: { establishment_id: estId } });
      setTemplates(res.data);
    } catch (err) { console.error(err); }
  };

  // --- LOGIQUE PAUSE RIGIDE (Mise à jour pour taper dans newTemplate) ---
  const addBreakTime = () => {
    const currentTimes = newTemplate.break_times || [];
    setNewTemplate({ ...newTemplate, break_times: [...currentTimes, { start: '', end: '' }] });
  };

  const removeBreakTime = (index) => {
    const newTimes = [...(newTemplate.break_times || [])];
    newTimes.splice(index, 1);
    setNewTemplate({ ...newTemplate, break_times: newTimes });
  };

  const updateBreakTime = (index, field, value) => {
    const newTimes = [...(newTemplate.break_times || [])];
    newTimes[index][field] = value;
    setNewTemplate({ ...newTemplate, break_times: newTimes });
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      // Préparation du payload (nettoyage si nécessaire)
      const payload = { 
        ...newTemplate, 
        establishment_id: selectedEst.id,
        // Si flexible, on vide break_times pour être propre
        break_times: newTemplate.break_type === 'flexible' ? null : newTemplate.break_times,
        // Si rigide, on met duration à 0
        break_duration: newTemplate.break_type === 'rigid' ? 0 : newTemplate.break_duration
      };

      await api.post('/shift-templates', payload);
      
      setShowModal(false);
      loadTemplates(selectedEst.id);
      setNewTemplate(initialTemplateState); // Reset total facile !
    } catch (err) { 
        console.error(err);
        alert("Erreur création"); 
    }
  };

  const handleDeleteTemplate = async (id) => {
    if(!window.confirm("Supprimer ce modèle ?")) return;
    try {
        await api.delete(`/shift-templates/${id}`);
        loadTemplates(selectedEst.id);
    } catch(err) { alert("Erreur"); }
  };

  const toggleDay = (dayIndex) => {
    const currentDays = newTemplate.applicable_days;
    if (currentDays.includes(dayIndex)) {
        setNewTemplate({ ...newTemplate, applicable_days: currentDays.filter(d => d !== dayIndex) });
    } else {
        setNewTemplate({ ...newTemplate, applicable_days: [...currentDays, dayIndex].sort() });
    }
  };

  return (
    <div style={{ padding: '30px' }}>
      
      <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>⏰ Modèles de Shifts</h1>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>Définissez les horaires types pour chaque établissement.</p>

      {/* SELECTEUR ÉTABLISSEMENT */}
      <div style={styles.grid}>
        {establishments.map(est => (
          <div 
            key={est.id} 
            onClick={() => setSelectedEst(est)}
            style={{ ...styles.card, ...(selectedEst?.id === est.id ? styles.activeCard : {}) }}
          >
            <div style={styles.iconBox}><Store size={24} color="#3b82f6" /></div>
            <h3 style={{ margin: '10px 0 5px 0' }}>{est.name}</h3>
          </div>
        ))}
      </div>

      {/* LISTE DES MODÈLES */}
      {selectedEst && (
        <div style={{ marginTop: '40px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#1e293b' }}>Modèles : <span style={{ color: '#3b82f6' }}>{selectedEst.name}</span></h2>
            <button onClick={() => setShowModal(true)} style={styles.btnPrimary}>
              <Plus size={18} style={{ marginRight: '5px' }} /> Créer un modèle
            </button>
          </div>

          <div style={styles.templatesGrid}>
            {templates.length === 0 ? <p style={{color: '#94a3b8'}}>Aucun modèle défini.</p> : templates.map(t => (
                <div key={t.id} style={styles.templateCard}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                        <h3 style={{margin: '0 0 5px 0', fontSize:'1.1rem'}}>{t.name}</h3>
                        <button onClick={() => handleDeleteTemplate(t.id)} style={styles.trashBtn}><Trash2 size={16}/></button>
                    </div>
                    
                    <div style={{color: '#64748b', fontSize: '0.9rem', display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px'}}>
                        <Clock size={14}/> {t.start_time} - {t.end_time}
                    </div>

                    {/* Affichage infos pause sur la carte */}
                    <div style={{fontSize: '0.8rem', color: '#64748b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                         <Coffee size={14} /> 
                         {t.break_type === 'flexible' 
                            ? `${t.break_duration} min (Flex)` 
                            : `${t.break_times?.length || 0} créneau(x) fixe(s)`
                         }
                    </div>
                    
                    <div style={{display: 'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={styles.badge}>{t.position}</div>
                        
                        <div style={{display: 'flex', gap: '2px'}}>
                        {DAYS.map((d, i) => (
                            <div key={i} style={{
                                fontSize: '0.6rem', width: '16px', height: '16px', 
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: (t.applicable_days || []).includes(i) ? '#3b82f6' : '#e2e8f0',
                                color: (t.applicable_days || []).includes(i) ? 'white' : '#94a3b8'
                            }}>{d}</div>
                        ))}
                        </div>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALE CRÉATION */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Nouveau Modèle</h3>
            <form onSubmit={handleCreateTemplate}>
              <input 
                style={styles.input} placeholder="Nom (ex: Ouverture Bar)" required 
                value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
              />
              
              <div style={{display:'flex', gap:'10px'}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Début</label>
                    <input type="time" style={styles.input} value={newTemplate.start_time} onChange={e => setNewTemplate({...newTemplate, start_time: e.target.value})} required />
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Fin</label>
                    <input type="time" style={styles.input} value={newTemplate.end_time} onChange={e => setNewTemplate({...newTemplate, end_time: e.target.value})} required />
                  </div>
              </div>
              
              <select style={styles.input} value={newTemplate.position} onChange={e => setNewTemplate({...newTemplate, position: e.target.value})}>
                <option value="Service">Service</option>
                <option value="Bar">Bar</option>
                <option value="Cuisine">Cuisine</option>
                <option value="Plonge">Plonge</option>
                <option value="Responsable">Responsable</option>
              </select>

              {/* --- GESTION DES PAUSES --- */}
              <div style={{ marginTop: '5px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569' }}>☕ Gestion des Pauses</h4>
                  
                  <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input 
                              type="checkbox" 
                              checked={newTemplate.break_paid} 
                              onChange={(e) => setNewTemplate({...newTemplate, break_paid: e.target.checked})} 
                          />
                          Pause rémunérée ?
                      </label>
                  </div>

                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input 
                              type="radio" 
                              name="breakType" 
                              value="flexible" 
                              checked={newTemplate.break_type === 'flexible'} 
                              onChange={() => setNewTemplate({...newTemplate, break_type: 'flexible'})} 
                          />
                          Flexible
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input 
                              type="radio" 
                              name="breakType" 
                              value="rigid" 
                              checked={newTemplate.break_type === 'rigid'} 
                              onChange={() => setNewTemplate({...newTemplate, break_type: 'rigid'})} 
                          />
                          Rigide
                      </label>
                  </div>

                  {newTemplate.break_type === 'flexible' && (
                      <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Durée (minutes)</label>
                          <input 
                              type="number" 
                              placeholder="Ex: 30" 
                              value={newTemplate.break_duration} 
                              onChange={(e) => setNewTemplate({...newTemplate, break_duration: parseInt(e.target.value) || 0})}
                              style={{ ...styles.input, marginTop: '5px', marginBottom: 0 }} 
                          />
                      </div>
                  )}

                  {newTemplate.break_type === 'rigid' && (
                      <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>
                              Créneaux de pause
                          </label>
                          {newTemplate.break_times?.map((bt, index) => (
                              <div key={index} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                  <input 
                                      type="time" 
                                      value={bt.start} 
                                      onChange={(e) => updateBreakTime(index, 'start', e.target.value)}
                                      style={{...styles.input, marginBottom: 0}} 
                                  />
                                  <span style={{ alignSelf: 'center' }}>-</span>
                                  <input 
                                      type="time" 
                                      value={bt.end} 
                                      onChange={(e) => updateBreakTime(index, 'end', e.target.value)}
                                      style={{...styles.input, marginBottom: 0}} 
                                  />
                                  <button type="button" onClick={() => removeBreakTime(index)} style={{ border: 'none', background: '#fee2e2', color: 'red', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' }}>X</button>
                              </div>
                          ))}
                          <button 
                              type="button" 
                              onClick={addBreakTime} 
                              style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', marginTop: '5px', textDecoration: 'underline' }}
                          >
                              + Ajouter un créneau
                          </button>
                      </div>
                  )}
              </div>

              {/* --- SELECTEUR DE JOURS --- */}
              <div style={{marginBottom: '20px'}}>
                <label style={{fontSize:'0.8rem', fontWeight:'bold', display: 'block', marginBottom: '8px'}}>Jours applicables</label>
                <div style={{display: 'flex', gap: '8px'}}>
                    {DAYS.map((day, index) => {
                        const isActive = newTemplate.applicable_days.includes(index);
                        return (
                            <button 
                                key={index}
                                type="button"
                                onClick={() => toggleDay(index)}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                                    cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem',
                                    backgroundColor: isActive ? '#3b82f6' : '#f1f5f9',
                                    color: isActive ? 'white' : '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.btnCancel}>Annuler</button>
                <button type="submit" style={styles.btnPrimary}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  grid: { display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' },
  card: { background: 'white', padding: '15px 25px', borderRadius: '12px', border: '2px solid transparent', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', minWidth: '200px' },
  activeCard: { borderColor: '#3b82f6', boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)' },
  iconBox: { width: '30px', height: '30px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' },
  templatesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
  templateCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '15px', position: 'relative' },
  badge: { display: 'inline-block', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' },
  trashBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 },
  btnPrimary: { background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  btnCancel: { background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '380px', maxHeight: '90vh', overflowY: 'auto' }, 
  input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }
};

export default ShiftsPage;