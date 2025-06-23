import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { message } from "antd";
import BarcodeGenerator from "./BarcodeGenerator";

const Generador = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [ids, setIds] = useState([]);
  const apiUrl = process.env.REACT_APP_API_URL; // Tu API

  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/campaigns/${id}`);
        setCampaign(response.data);
        setIds(response.data.pedidos?.map((p) => p.idSolicitante) || []);
      } catch (error) {
        console.error("Error al obtener la campaña:", error);
        message.error("No se pudo cargar la campaña.");
      }
    };

    fetchCampaignData();
  }, [id]);

  return (
    <div>
      <h2>Generador de Códigos para campaña: {campaign?.nombre}</h2>
      <p>IDs a generar: {ids.join(", ")}</p>

      {/* Aquí puedes llamar tu componente que genere los códigos */}
      <BarcodeGenerator ids={ids} />
    </div>
  );
};

export default Generador;
