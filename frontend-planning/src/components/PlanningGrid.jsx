import React, { useState, useEffect } from 'react';
import { startOfWeek, addDays, format, isSameDay, parseISO, setHours, setMinutes, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../api';
import ShiftModal from './ShiftModal';


const PlanningGrid = () => {
  // Données
  const [establishments, setEstablishments] = useState([]);
  const [selectedEstId, setSelectedEstId] = useState('');
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [templates, setTemplates] = useState([]);

  // États pour la Modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null); // Si null = Création, sinon = Édition
  const [modalContext, setModalContext] = useState({ userId: null, date: null, userName: '' }); // Pour savoir où on a cliqué

  // ... (Calcul dates comme avant)
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // --- CHARGEMENT --- (Identique à avant)
  useEffect(() => {
    const fetchEst = async () => {
        try {
            const res = await api.get('/establishments');
            setEstablishments(res.data);
            if (res.data.length > 0) setSelectedEstId(res.data[0].id);
        } catch(e) { console.error(e) }
    };
    fetchEst();
  }, []);

  useEffect(() => {
    if (!selectedEstId) return;
    fetchData(); // On extrait la fonction pour pouvoir la rappeler après une modif
  }, [selectedEstId, currentDate]); // Ajout de currentDate pour recharger si on change de semaine

    const fetchData = async () => {
        try {
        const params = { establishment_id: selectedEstId };
        const usersRes = await api.get('/users', { params });
        const shiftsRes = await api.get('/shifts', { params });
        const templatesRes = await api.get('/shift-templates', { params }); // <--- AJOUTE ÇA
        
        setUsers(usersRes.data);
        setShifts(shiftsRes.data);
        setTemplates(templatesRes.data); // <--- ET ÇA
        } catch (error) { console.error("Erreur data", error); }
    };

  // --- GESTION DES CLICS ---

  // 1. Clic sur une case vide (+)
  const handleEmptySlotClick = (user, date) => {
    setModalContext({ userId: user.id, date: date, userName: user.full_name });
    setSelectedShift(null); // Mode Création
    setIsModalOpen(true);
  };

  // 2. Clic sur un shift existant
  const handleShiftClick = (shift, user) => {
    setModalContext({ userId: user.id, date: null, userName: user.full_name });
    setSelectedShift(shift); // Mode Édition
    setIsModalOpen(true);
  };


  // --- CALCULATEUR D'HEURES ET COÛT ---
  const calculateStats = (user) => {
    let totalMinutes = 0;

    // 1. On trouve tous les shifts de cet user pour la semaine affichée
    const userShifts = shifts.filter(s => {
      if (s.user_id !== user.id) return false;
      // On vérifie que le shift est bien dans la semaine visible (optionnel si l'API filtre déjà, mais plus sûr)
      const shiftDate = parseISO(s.planned_start);
      return shiftDate >= startDate && shiftDate < addDays(startDate, 7);
    });

    // 2. On additionne les durées
    userShifts.forEach(shift => {
      // On ne compte que le temps de travail effectif (pas les congés/maladie)
      if (shift.type === 'work') {
        const start = parseISO(shift.planned_start);
        const end = parseISO(shift.planned_end);
        totalMinutes += differenceInMinutes(end, start);
      }
    });

    const hours = totalMinutes / 60;
    const cost = hours * (user.hourly_rate || 0); // On sécurise si pas de taux

    return { 
      hours: hours.toFixed(1), // 1 chiffre après la virgule (ex: 35.5)
      cost: cost.toFixed(0)    // Arrondi à l'entier (ex: 450)
    };
  };

  // --- ACTIONS (API) ---

  const handleSaveShift = async (formData) => {
    try {
        if (selectedShift) {
            // UPDATE
            await api.put(`/shifts/${selectedShift.id}`, formData);
        } else {
            // CREATE
            // On ajoute l'user_id qui manquait dans le formData
            await api.post('/shifts', { ...formData, user_id: modalContext.userId });
        }
        setIsModalOpen(false);
        fetchData(); // On recharge le planning pour voir le changement
    } catch (err) {
        alert("Erreur lors de l'enregistrement");
    }
  };

  const handleDeleteShift = async () => {
      if (!selectedShift) return;
      if (window.confirm("Voulez-vous vraiment supprimer ce shift ?")) {
          try {
              await api.delete(`/shifts/${selectedShift.id}`);
              setIsModalOpen(false);
              fetchData();
          } catch (err) { alert("Erreur suppression"); }
      }
  };

  // --- RENDU ---

  const getShiftForUserAndDate = (userId, date) => {
    return shifts.find(shift => {
      const shiftDate = parseISO(shift.planned_start);
      return shift.user_id === userId && isSameDay(shiftDate, date);
    });
  };

  const changeWeek = (direction) => setCurrentDate(addDays(currentDate, direction * 7));

  // COULEURS SELON LE TYPE
  const getShiftStyle = (type) => {
    const baseStyle = { 
        padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem', 
        cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        marginBottom: '2px', overflow: 'hidden'
    };

    switch (type) {
        case 'vacation': // Congé = Vert
            return { ...baseStyle, backgroundColor: '#dcfce7', borderLeft: '4px solid #16a34a', color: '#14532d' };
        case 'rtt': // RTT = Violet
            return { ...baseStyle, backgroundColor: '#f3e8ff', borderLeft: '4px solid #9333ea', color: '#581c87' };
        case 'sick': // Maladie = Rouge
            return { ...baseStyle, backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444', color: '#7f1d1d' };
        case 'unpaid': // Sans solde = Gris
            return { ...baseStyle, backgroundColor: '#f1f5f9', borderLeft: '4px solid #64748b', color: '#334155' };
        default: // Travail (work) = Bleu (Par défaut)
            return { ...baseStyle, backgroundColor: '#e0f2fe', borderLeft: '4px solid #0ea5e9', color: '#0369a1' };
    }
  };

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      
      {/* HEADER (Selecteur + Nav) - Identique à avant */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>📍 Établissement :</label>
            <select value={selectedEstId} onChange={(e) => setSelectedEstId(e.target.value)} style={styles.select}>
                {establishments.map(est => (<option key={est.id} value={est.id}>{est.name}</option>))}
            </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => changeWeek(-1)} style={styles.navBtn}>←</button>
          <span style={{ fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>
            {format(startDate, 'd MMMM', { locale: fr })} - {format(addDays(startDate, 6), 'd MMMM', { locale: fr })}
          </span>
          <button onClick={() => changeWeek(1)} style={styles.navBtn}>→</button>
        </div>
      </div>

      {/* TABLEAU */}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thUser}>Employés</th>
              {weekDays.map(day => (
                <th key={day.toString()} style={styles.thDate}>
                  <div style={{ textTransform: 'capitalize' }}>{format(day, 'EEEE', { locale: fr })}</div>
                  <div style={{ fontSize: '0.8em', color: '#64748b' }}>{format(day, 'd MMM')}</div>
                </th>
              ))}
              <th style={{...styles.thDate, width: '100px', background: '#f1f5f9', borderLeft: '3px solid #cbd5e1'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={styles.tdUser}>
                  <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
                  <div style={{ fontSize: '0.75em', color: '#64748b' }}>{user.role}</div>
                </td>
                {weekDays.map(day => {
                  const shift = getShiftForUserAndDate(user.id, day);
                  return (
                    <td key={day.toString()} style={styles.tdSlot}>
                      {shift ? (
                        // CASE REMPLIE -> CLICK -> EDIT
                        <div 
                            style={getShiftStyle(shift.type)}
                            onClick={() => handleShiftClick(shift, user)}
                        >
                          <div style={{ fontWeight: 'bold' }}>
                            {format(parseISO(shift.planned_start), 'HH:mm')} - {format(parseISO(shift.planned_end), 'HH:mm')}
                          </div>
                          <div>{shift.position}</div>
                        </div>
                      ) : (
                        // CASE VIDE -> CLICK -> CREATE
                        <div 
                            style={styles.emptySlot} 
                            onClick={() => handleEmptySlotClick(user, day)}
                        >
                            +
                        </div>
                      )}
                    </td>
                  );
                })}
                <td style={{...styles.tdSlot, background: '#f8fafc', borderLeft: '3px solid #cbd5e1', verticalAlign: 'middle', textAlign: 'center'}}>
                    {(() => {
                        const stats = calculateStats(user);
                        // On change la couleur si on dépasse 35h (petit bonus visuel)
                        const isOvertime = parseFloat(stats.hours) > 35;
                        return (
                            <div>
                                <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: isOvertime ? '#ef4444' : '#1e293b'}}>
                                    {stats.hours}h
                                </div>
                            </div>
                        );
                    })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODALE (Rendue conditionnellement) */}
      <ShiftModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        initialData={selectedShift}
        selectedDate={modalContext.date}
        userName={modalContext.userName}
        templates={templates}
      />

    </div>
  );
};

// ... Styles identiques à avant ...
const styles = {
  select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' },
  navBtn: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '800px' },
  thUser: { textAlign: 'left', padding: '15px', borderBottom: '2px solid #e2e8f0', width: '200px', backgroundColor: '#f8fafc' },
  thDate: { padding: '15px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' },
  tdUser: { padding: '15px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', backgroundColor: 'white' },
  tdSlot: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', height: '80px', verticalAlign: 'top', padding: '5px' },
  shiftCard: { backgroundColor: '#e0f2fe', borderLeft: '4px solid #0ea5e9', color: '#0369a1', padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
  emptySlot: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'transparent', cursor: 'pointer', fontSize: '1.5rem', transition: 'color 0.2s', ':hover': { color: '#cbd5e1' } }
};

export default PlanningGrid;