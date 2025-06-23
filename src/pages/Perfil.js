import React from "react";
import BusinessForm from "../components/BusinessForm";
import ConfigWebSite from "../components/ConfigWebSite";

const Perfil = () => {
  return (
    <div className="w-full p-6 app-container-sections">
      <div
        className="mb-[32px] flex items-center justify-between py-4 pr-4"
        style={{ background: "linear-gradient(90deg,#fff0,#fff)" }}
      >
        <div className="data">
          <div className="title font-bold text-xl text-bold-font">
            Datos Empresa
          </div>
          <div className="subtitle max-w-[30vw] text-xs font-normal text-light-font">
            actualiza los datos de tu empresa cuando quieras
          </div>
        </div>
      </div>
      <BusinessForm />
      <ConfigWebSite />
    </div>
  );
};

export default Perfil;
