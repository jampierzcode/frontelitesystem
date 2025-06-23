import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="w-full h-[100vh] flex items-center justify-center flex-col">
      <span className="text-dark-purple text-5xl font-bold">404</span>
      <p>Lo sentimos, la página que estás buscando no existe.</p>
      <Link
        to={"/"}
        className="mt-4 px-3 py-2 rounded bg-dark-purple text-white"
      >
        Ir al Inicio
      </Link>
    </div>
  );
};

export default NotFoundPage;
