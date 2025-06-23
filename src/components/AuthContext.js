// AuthContext.js
import axios from "axios";
import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState({
    token: sessionStorage.getItem("token") || null,
    user: null,
  });

  const login = async (email, password) => {
    try {
      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${apiUrl}/login`,
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ email, password }),
      };
      const response = await axios.request(config);
      const data = response.data;

      sessionStorage.setItem("token", data.token);
      await fetchMe(data.token);
      return { success: true };
    } catch (error) {
      // Manejo detallado de errores
      if (error.code === "ERR_NETWORK") {
        return { success: false, message: "No se pudo conectar al servidor." };
      } else if (error.response) {
        // Error en la respuesta del servidor
        return {
          success: false,
          message: error.response.data.message || "Error en las credenciales.",
        };
      } else {
        return {
          success: false,
          message: "Error desconocido al iniciar sesión.",
        };
      }
    }
  };

  const fetchMe = async (token) => {
    try {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `${apiUrl}/me`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.request(config);
      const data = response.data;
      setAuth({ ...auth, user: data.user, token });
    } catch (error) {
      console.error("Error fetching user", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.token) {
      fetchMe(auth.token);
    } else {
      setLoading(false);
    }
  }, [auth.token]);

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setAuth({ token: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, fetchMe, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
