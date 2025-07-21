// src/api/apiAcademy.js
import axios from "axios";

const apiAcademy = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // Ej: https://mi-api.com/api
});

// Interceptor para agregar el token automáticamente
apiAcademy.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiAcademy;
