import axios from 'axios';

// Utiliza a variável de ambiente do Vite se existir, caso contrário aponta para o localhost
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor simples para tratamento de erros genéricos (opcional para a Sprint 1)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);