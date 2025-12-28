import axios from 'axios';

// On crée une instance d'Axios configurée
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // L'adresse de ton Backend FastAPI
});

// INTERCEPTEUR : On injecte le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


export default api;