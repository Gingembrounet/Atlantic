import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';

const SetupPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // On récupère le token de l'URL
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/setup-password', { token, password });
      alert("Compte activé ! Vous pouvez vous connecter.");
      navigate('/login');
    } catch (err) {
      setMessage("Le lien est invalide ou a expiré.");
    }
  };

  if (!token) return <p>Lien invalide.</p>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>👋 Bienvenue !</h2>
        <p>Définissez votre mot de passe pour activer votre compte.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input 
            type="password" 
            placeholder="Nouveau mot de passe" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={styles.input} required 
          />
          <button type="submit" style={styles.button}>Activer mon compte</button>
        </form>
        {message && <p style={{ color: 'red', marginTop: '10px' }}>{message}</p>}
      </div>
    </div>
  );
};

// On reprend les mêmes styles que LoginPage (tu pourras factoriser plus tard)
const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' },
  card: { background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' },
  button: { padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
};

export default SetupPassword;