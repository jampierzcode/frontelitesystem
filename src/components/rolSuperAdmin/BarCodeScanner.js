import React, { useEffect, useRef, useState } from "react";
import { message } from "antd";

const BarcodeScanner = ({
  isModal,
  pedidos,
  pedidosCargados,
  setPedidosCargados,
}) => {
  const [barcode, setBarcode] = useState("");
  const bufferRef = useRef("");
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (isModal) {
        if (e.key === "Enter") {
          const code = bufferRef.current.trim();
          if (code !== "") {
            const isRegistrado = pedidos.some(
              (obj) => obj.idSolicitante === code
            );
            if (isRegistrado) {
              const yaExiste = pedidosCargados.includes(code);
              if (!yaExiste) {
                setPedidosCargados((prev) => [...prev, code]);
                setBarcode(code);
              } else {
                message.warning(`El código ${code} ya ha sido precargado`);
              }
              bufferRef.current = "";
            } else {
              message.warning(
                `El código no se encuentra precargado en la campaña, subirlo manualmente`
              );
            }
          }
        } else {
          bufferRef.current += e.key;

          // Limpiar buffer si pasa mucho tiempo entre teclas
          timeoutRef.current = setTimeout(() => {
            bufferRef.current = "";
          }, 100);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line
  }, [isModal, pedidosCargados, setPedidosCargados]);

  useEffect(() => {
    if (isModal === false) {
      setPedidosCargados([]);
    }
  }, [isModal, setPedidosCargados]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Escáner de código de barras</h2>
      <p className="mb-4">
        Escanea un código con la pistola lectora para verlo aquí.
      </p>
      <div className="bg-gray-100 p-4 rounded mb-4">
        <strong>Último código:</strong> {barcode}
      </div>
      <div className="bg-blue-600 text-white p-4 rounded mb-4">
        <strong>Total Cargados:</strong> {pedidosCargados.length}/
        {pedidos.length}
      </div>
      <h3 className="text-lg font-semibold">Historial:</h3>
      <ul className="list-disc pl-5">
        {pedidosCargados.map((code, idx) => (
          <li key={idx}>{code}</li>
        ))}
      </ul>
    </div>
  );
};

export default BarcodeScanner;
