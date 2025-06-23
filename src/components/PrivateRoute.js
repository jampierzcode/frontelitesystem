import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const PrivateRoute = ({ children, roles }) => {
  const { auth, loading } = useAuth();

  if (!loading) {
    if (!auth.user) {
      // Si no está autenticado, redirige a la página de login
      return <Navigate to="/login" />;
    }

    if (roles && !roles.includes(auth.user.rol.name)) {
      // Si el usuario no tiene el rol adecuado, redirige a una página 403 o dashboard
      return <Navigate to="/forbidden" />;
    }

    return children; // Si pasa todas las verificaciones, renderiza el componente
  }
};

export default PrivateRoute;
