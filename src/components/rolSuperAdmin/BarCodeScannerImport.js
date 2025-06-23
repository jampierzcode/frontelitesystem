import React, { useEffect, useRef, useState } from "react";
import { message } from "antd";

const BarcodeScannerImport = ({
  isModal,
  pedidosCargados,
  setPedidosCargados,
}) => {
  const [barcode, setBarcode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const bufferRef = useRef("");
  const timeoutRef = useRef(null);
  const inputRef = useRef(null); // Para manejar focus

  const registrarCodigo = (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const yaExiste = pedidosCargados.includes(trimmed);
    if (yaExiste) {
      message.warning(`El código ${trimmed} ya ha sido precargado`);
    } else {
      setPedidosCargados((prev) => [...prev, trimmed]);
      setBarcode(trimmed);
    }

    setManualCode(""); // Limpiar input
    bufferRef.current = ""; // Limpiar buffer
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isModal) return;

      // Si estás enfocado en el input, no usar el buffer
      if (document.activeElement === inputRef.current) return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        if (code !== "") {
          registrarCodigo(code);
        }
        bufferRef.current = "";
      } else {
        bufferRef.current += e.key;

        timeoutRef.current = setTimeout(() => {
          bufferRef.current = "";
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isModal, pedidosCargados]);

  useEffect(() => {
    if (!isModal) {
      setPedidosCargados([]);
      setManualCode("");
    }
  }, [isModal, setPedidosCargados]);

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      registrarCodigo(manualCode);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Escáner de código de barras</h2>
      <p className="mb-4">
        Escanea un código con la pistola lectora o escríbelo manualmente.
      </p>
      <div className="bg-gray-100 p-4 rounded mb-4">
        <strong>Último código:</strong> {barcode}
      </div>
      <div className="bg-blue-600 text-white p-4 rounded mb-4">
        <strong>Total Cargados:</strong> {pedidosCargados.length}
      </div>

      <div className="flex gap-3 w-full mb-4">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Escribe o escanea un código"
            className="border-2 focus:border-2 border-gray-900 w-full px-3 py-2 rounded bg-gray-100 text-gray-900 text-sm"
          />
        </div>
        <div>
          <button
            onClick={() => registrarCodigo(manualCode)}
            className="px-3 py-2 rounded bg-primary text-white text-sm font-bold"
          >
            Registrar
          </button>
        </div>
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

export default BarcodeScannerImport;
