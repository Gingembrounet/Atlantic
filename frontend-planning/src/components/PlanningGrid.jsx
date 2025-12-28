import React, { useState, useEffect } from 'react';
import { startOfWeek, addDays, format, isSameDay, parseISO, differenceInMinutes, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../api';
import ShiftModal from './ShiftModal';

const PlanningGrid = () => {
  // --- ÉTATS ---
  const [establishments, setEstablishments] = useState([]);
  const [selectedEstId, setSelectedEstId] = useState('');
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [templates, setTemplates] = useState([]); // Pour la modale
  const [currentDate, setCurrentDate] = useState(new Date());

  // États pour la Modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null); 
  const [modalContext, setModalContext] = useState({ userId: null, date: null, userName: '' });

  // Dates de la semaine
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // --- CHARGEMENT ---
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
    fetchData();
  }, [selectedEstId, currentDate]);

  const fetchData = async () => {
    try {
      const params = { establishment_id: selectedEstId };
      const usersRes = await api.get('/users', { params });
      const shiftsRes = await api.get('/shifts', { params });
      const templatesRes = await api.get('/shift-templates', { params });
      
      setUsers(usersRes.data);
      setShifts(shiftsRes.data);
      setTemplates(templatesRes.data);
    } catch (error) { console.error("Erreur data", error); }
  };

  // --- GESTION DES CLICS ---
  const handleEmptySlotClick = (user, date) => {
    setModalContext({ userId: user.id, date: date, userName: user.full_name });
    setSelectedShift(null); 
    setIsModalOpen(true);
  };

  const handleShiftClick = (shift, user) => {
    setModalContext({ userId: user.id, date: null, userName: user.full_name });
    setSelectedShift(shift); 
    setIsModalOpen(true);
  };

  // --- ACTIONS (API) ---
const handleSaveShift = async (formData) => {
    try {
        // --- CAS 1 : MODIFICATION ou CRÉATION SIMPLE ---
        if (selectedShift || !formData.isMultiDay) {
            const payload = { ...formData };
            // On nettoie les champs inutiles du multi-jour
            delete payload.isMultiDay; 
            delete payload.multi_start_date; 
            delete payload.multi_end_date;

            if (selectedShift) {
                await api.put(`/shifts/${selectedShift.id}`, payload);
            } else {
                payload.user_id = modalContext.userId;
                await api.post('/shifts', payload);
            }
        } 
        
        // --- CAS 2 : CRÉATION MULTI-JOURS (La Boucle) ---
        else {
            // 1. On récupère toutes les dates entre début et fin
            const dates = eachDayOfInterval({
                start: parseISO(formData.multi_start_date),
                end: parseISO(formData.multi_end_date)
            });

            // 2. On prépare toutes les requêtes
            const requests = dates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                // On crée un payload pour CE jour-là
                const dailyPayload = {
                    user_id: modalContext.userId,
                    position: formData.position,
                    type: formData.type,
                    quantity: formData.quantity,
                    // On force les heures par défaut (ex: 09h-17h) car c'est obligatoire en base
                    // même si on ne les affiche pas pour les congés
                    planned_start: `${dateStr}T09:00:00`,
                    planned_end: `${dateStr}T17:00:00`
                };
                return api.post('/shifts', dailyPayload);
            });

            // 3. On envoie TOUT en même temps au backend
            await Promise.all(requests);
        }

        setIsModalOpen(false);
        fetchData(); 
    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'enregistrement");
    }
  };

  const handleDeleteShift = async () => {
      if (!selectedShift) return;
      if (window.confirm("Supprimer ce shift ?")) {
          try {
              await api.delete(`/shifts/${selectedShift.id}`);
              setIsModalOpen(false);
              fetchData();
          } catch (err) { alert("Erreur suppression"); }
      }
  };

  // --- CALCULATEUR D'HEURES (Seulement le travail pour l'instant) ---
  const calculateStats = (user) => {
    let totalMinutes = 0;
    const userShifts = shifts.filter(s => {
      if (s.user_id !== user.id) return false;
      const shiftDate = parseISO(s.planned_start);
      return shiftDate >= startDate && shiftDate < addDays(startDate, 7);
    });

    userShifts.forEach(shift => {
      if (shift.type === 'work') {
        const start = parseISO(shift.planned_start);
        const end = parseISO(shift.planned_end);
        totalMinutes += differenceInMinutes(end, start);
      }
    });

    const hours = totalMinutes / 60;
    const cost = hours * (user.hourly_rate || 0);

    return { hours: hours.toFixed(1), cost: cost.toFixed(0) };
  };

  // --- STYLE DES SHIFTS ---
  const getShiftStyle = (type) => {
    const baseStyle = { 
        padding: '4px 6px', borderRadius: '4px', fontSize: '0.75rem', 
        cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        marginBottom: '2px', overflow: 'hidden', minHeight: '40px'
    };
    switch (type) {
        case 'vacation': return { ...baseStyle, backgroundColor: '#dcfce7', borderLeft: '3px solid #16a34a', color: '#14532d' };
        case 'rtt': return { ...baseStyle, backgroundColor: '#f3e8ff', borderLeft: '3px solid #9333ea', color: '#581c87' };
        case 'sick': return { ...baseStyle, backgroundColor: '#fee2e2', borderLeft: '3px solid #ef4444', color: '#7f1d1d' };
        case 'unpaid': return { ...baseStyle, backgroundColor: '#f1f5f9', borderLeft: '3px solid #64748b', color: '#334155' };
        default: return { ...baseStyle, backgroundColor: '#e0f2fe', borderLeft: '3px solid #0ea5e9', color: '#0369a1' };
    }
  };

  const changeWeek = (direction) => setCurrentDate(addDays(currentDate, direction * 7));

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      
      {/* HEADER */}
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
                  const dayShifts = shifts.filter(s => s.user_id === user.id && isSameDay(parseISO(s.planned_start), day));
                  return (
                    <td key={day.toString()} style={styles.tdSlot}>
                      {dayShifts.length > 0 ? (
                        dayShifts.map(shift => (
                           <div 
                              key={shift.id}
                              style={getShiftStyle(shift.type)} 
                              onClick={() => handleShiftClick(shift, user)}
                           >
                            {shift.type === 'work' && (
                             <div style={{ fontWeight: 'bold' }}>
                               {format(parseISO(shift.planned_start), 'HH:mm')} - {format(parseISO(shift.planned_end), 'HH:mm')}
                             </div>
                            )}
                             <div>{shift.position}</div>
                             
                             {/* --- C'EST ICI QU'ON AFFICHE LA QUANTITÉ --- */}
                             {shift.quantity && (
                                <div style={{ fontSize: '0.7rem', fontWeight:'bold', marginTop:'2px', borderTop:'1px dashed rgba(0,0,0,0.1)' }}>
                                    Qté: {shift.quantity}
                                </div>
                             )}

                           </div>
                        ))
                      ) : (
                        <div style={styles.emptySlot} onClick={() => handleEmptySlotClick(user, day)}>+</div>
                      )}
                    </td>
                  );
                })}
                <td style={{...styles.tdSlot, background: '#f8fafc', borderLeft: '3px solid #cbd5e1', verticalAlign: 'middle', textAlign: 'center'}}>
                    {(() => {
                        const stats = calculateStats(user);
                        const isOvertime = parseFloat(stats.hours) > 35;
                        return (
                            <div>
                                <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: isOvertime ? '#ef4444' : '#1e293b'}}>{stats.hours}h</div>
                                <div style={{fontSize: '0.8rem', color: '#64748b'}}>{stats.cost} €</div>
                            </div>
                        );
                    })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

const styles = {
  select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' },
  navBtn: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
  thUser: { textAlign: 'left', padding: '15px', borderBottom: '2px solid #e2e8f0', width: '200px', backgroundColor: '#f8fafc' },
  thDate: { padding: '15px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' },
  tdUser: { padding: '15px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', backgroundColor: 'white' },
  tdSlot: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', height: '80px', verticalAlign: 'top', padding: '5px' },
  emptySlot: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'transparent', cursor: 'pointer', fontSize: '1.5rem', transition: 'color 0.2s', ':hover': { color: '#cbd5e1' } }
};

export default PlanningGrid;