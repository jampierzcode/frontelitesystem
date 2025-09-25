import React, { useRef, useState, useEffect } from "react";
import { Modal, message } from "antd";
import QrScanner from "qr-scanner";
import apiAcademy from "./auth/apiAcademy";

export default function QrReader({
  open,
  onClose,
  estudiantes,
  asistencias,
  fetchAsistencias,
}) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [schedules, setSchedules] = useState([]);

  const fetchSchedules = async () => {
    try {
      const res = await apiAcademy.get("/schedules");
      setSchedules(res.data.data);
    } catch (error) {}
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleResult = async (codigo) => {
    console.log("que esta pasando");
    if (processing) return; // Evita múltiples lecturas
    setProcessing(true);

    setResult(codigo);

    // Buscar estudiante por ID
    const estudiante = estudiantes.find(
      (e) => e.id.toString() === codigo.toString()
    );
    console.log(estudiante);
    if (!estudiante) {
      message.error("El QR no corresponde a un estudiante válido.");
      setProcessing(false);
      return;
    }

    // Fecha actual
    const now = new Date();
    const fechaHoy = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const horaActual = now.toTimeString().slice(0, 5); // HH:MM
    const diaSemana = now.toLocaleDateString("es-ES", { weekday: "long" });
    const diaCapitalizado =
      diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    // Verificar si ya tiene asistencia hoy
    const yaTieneAsistencia = asistencias.some(
      (a) => a.student_id === estudiante.id && a.fecha === fechaHoy
    );

    if (yaTieneAsistencia) {
      message.warning("Este estudiante ya tiene asistencia registrada hoy.");
      setProcessing(false);
      return;
    }

    try {
      const scheduleHoy = schedules.find((s) => s.dia === diaCapitalizado);
      if (!scheduleHoy) {
        message.error("No hay horario asignado para hoy.");
        setProcessing(false);
        return;
      }

      // Comparar hora
      const esTarde = horaActual > scheduleHoy.horaInicio;

      // Crear asistencia
      const nuevaAsistencia = {
        estudianteId: estudiante.id,
        fecha: fechaHoy,
        horaEntrada: horaActual,
        estado: esTarde ? "tardanza" : "presente",
      };

      await apiAcademy.post("/asistencias", nuevaAsistencia);

      message.success(
        `Asistencia registrada: ${estudiante.person.nombre} - ${nuevaAsistencia.estado}`
      );

      await fetchAsistencias();

      onClose();
    } catch (err) {
      console.error(err);
      message.error("Error registrando la asistencia.");
    } finally {
      // 🔑 Reactivar escaneo después de un pequeño delay
      setTimeout(() => setProcessing(false), 1500);
    }
  };

  return (
    <Modal
      open={open}
      title="Escanear Código QR"
      onCancel={onClose}
      footer={null}
      destroyOnClose
      afterOpenChange={(visible) => {
        console.log(visible);
        if (visible && videoRef.current) {
          console.log("hola");
          const qrScanner = new QrScanner(
            videoRef.current,
            (res) => handleResult(res.data),
            { preferredCamera: "environment" }
          );
          console.log(qrScanner);
          scannerRef.current = qrScanner;
          qrScanner.start().catch((err) => console.error("Error cámara:", err));
        } else {
          if (scannerRef.current) {
            scannerRef.current.stop();
            scannerRef.current.destroy();
            scannerRef.current = null;
          }
        }
      }}
    >
      {/* ✅ La cámara siempre se muestra */}
      <video
        ref={videoRef}
        className="w-full h-64 bg-black rounded-md"
        autoPlay
        muted
      />
      {result && (
        <p className="mt-3 p-2 bg-green-100 text-green-800 rounded">
          Último QR detectado: {result}
        </p>
      )}
    </Modal>
  );
}
