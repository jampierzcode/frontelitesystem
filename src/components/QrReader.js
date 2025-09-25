// QrReader.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  message,
  Button,
  Upload,
  Typography,
  Space,
  Switch,
} from "antd";
import QrScanner from "qr-scanner";
import apiAcademy from "./auth/apiAcademy";

const { Text } = Typography;

// ——— Helpers de fecha/hora en LOCAL (América/Lima) ———
function pad(n) {
  return String(n).padStart(2, "0");
}
function localYYYYMMDD(date = new Date()) {
  // Construimos con componentes locales (no UTC)
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}
function localHHMM(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function dayNameCapitalES(date = new Date()) {
  const s = date.toLocaleDateString("es-PE", { weekday: "long" }); // Lima
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function hhmmToMinutes(hhmm) {
  const [h, m] = String(hhmm)
    .split(":")
    .map((x) => parseInt(x || "0", 10));
  return h * 60 + m;
}

export default function QrReader({
  open,
  onClose,
  estudiantes,
  asistencias,
  fetchAsistencias,
}) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [schedules, setSchedules] = useState(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Anti re-lecturas pegadas
  const lastCodeRef = useRef(null);
  const lastScanAtRef = useRef(0);

  // Cooldown extra tras éxito para evitar “ametralladora”
  const SUCCESS_COOLDOWN_MS = 2500;

  useEffect(() => {
    (async () => {
      try {
        const res = await apiAcademy.get("/schedules");
        setSchedules(res.data?.data ?? []);
      } catch {
        setSchedules([]);
      }
    })();
  }, []);

  const stopScanner = () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    } catch {}
    scannerRef.current = null;

    // Apagar media tracks explícitamente
    try {
      const stream = mediaStreamRef.current;
      stream?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    mediaStreamRef.current = null;

    // Reset UI torch
    setTorchAvailable(false);
    setTorchOn(false);

    // Limpiar el <video>
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      // videoRef.current.removeAttribute("style");
    }
  };

  const startScannerWithStream = async (stream) => {
    if (!videoRef.current) return;

    mediaStreamRef.current = stream;
    videoRef.current.srcObject = stream;

    // — Ajuste de espejo según facingMode —
    try {
      const track = stream.getVideoTracks()[0];
      const facing = track.getSettings?.().facingMode || "environment";
      // Solo espejar si es cámara frontal
      videoRef.current.style.transform =
        facing === "user" ? "scaleX(-1)" : "none";
    } catch {}

    // Asegurar reproducción antes de iniciar scanner
    try {
      await videoRef.current.play().catch(() => {});
    } catch {}

    const scanner = new QrScanner(
      videoRef.current,
      (res) => {
        const code = typeof res === "string" ? res : res?.data;
        if (code) processCode(code);
      },
      {
        highlightCodeOutline: true,
        highlightScanRegion: true,
        returnDetailedScanResult: true,
        maxScansPerSecond: 8,
        // @ts-ignore
        inversionMode: "both",
      }
    );
    scannerRef.current = scanner;

    try {
      await scanner.start();
    } catch (e) {
      console.error("scanner.start() error:", e);
      message.error("No se pudo iniciar el escáner.");
      return;
    }

    // Torch capability
    try {
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.();
      setTorchAvailable(!!(caps && caps.torch));
    } catch {
      setTorchAvailable(false);
    }

    // ——— Forzar recálculo del overlay en el primer montaje ———
    // 1) Espera a que el video esté reproduciendo marcos
    await new Promise((r) => requestAnimationFrame(() => r()));
    // 2) Dispara un resize para que qr-scanner recalcule regiones
    try {
      window.dispatchEvent(new Event("resize"));
    } catch {}
  };

  const startScanner = async () => {
    if (!videoRef.current) return;

    // HTTPS/localhost
    const isLocalhost =
      typeof window !== "undefined" &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1");
    const isSecure = location.protocol === "https:" || isLocalhost;
    if (!isSecure) {
      message.error("La cámara requiere HTTPS o localhost.");
      console.warn("Contexto no seguro. Usa https o localhost.");
      return;
    }

    // ¿Hay cámara?
    const hasCam = await QrScanner.hasCamera();
    if (!hasCam) {
      message.error("No se detectó ninguna cámara.");
      return;
    }

    // Intento 1: facingMode environment
    const baseConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
      await startScannerWithStream(stream);
      return;
    } catch (e) {
      console.warn("[QR] Falló facingMode environment:", e?.name || e);
    }

    // Intento 2: deviceId “back”
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      if (!videoInputs.length) throw new Error("No hay videoinput");

      const backCam =
        videoInputs.find((d) =>
          /back|rear|trás|ambiente/i.test(d.label || "")
        ) || videoInputs[videoInputs.length - 1];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: { exact: backCam.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      await startScannerWithStream(stream);
      return;
    } catch (e) {
      console.error("[QR] No se pudo abrir ninguna cámara:", e);
      message.error("No se pudo acceder a la cámara. Revisa permisos/HTTPS.");
    }
  };

  const handleToggleTorch = async (checked) => {
    try {
      if (!scannerRef.current || !scannerRef.current.setTorch) return;
      await scannerRef.current.setTorch(checked);
      setTorchOn(checked);
    } catch {
      setTorchOn(false);
    }
  };

  const beforeUpload = async (file) => {
    try {
      const res = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
        // @ts-ignore
        inversionMode: "both",
      });
      const code = typeof res === "string" ? res : res?.data;
      if (code) await processCode(code);
      else message.error("No se detectó ningún QR en la imagen.");
    } catch {
      message.error("No se pudo leer el QR de la imagen.");
    }
    return false;
  };

  const processCode = async (codigo) => {
    const nowMs = Date.now();

    // Rechaza re-escaneos del mismo código muy pegados
    if (lastCodeRef.current === codigo && nowMs - lastScanAtRef.current < 1500)
      return;
    lastCodeRef.current = codigo;
    lastScanAtRef.current = nowMs;

    if (processing) return;
    setProcessing(true);
    setResult(codigo);

    if (!schedules) {
      message.warning("Cargando horarios… intenta de nuevo en unos segundos.");
      setProcessing(false);
      return;
    }

    const estudiante = estudiantes.find((e) => String(e.id) === String(codigo));
    if (!estudiante) {
      message.error("El QR no corresponde a un estudiante válido.");
      setProcessing(false);
      return;
    }

    // ——— Fecha y hora LOCAL (evitar UTC “día superior”) ———
    const now = new Date();
    const fechaHoy = localYYYYMMDD(now); // YYYY-MM-DD local
    console.log(fechaHoy);
    const horaActual = localHHMM(now); // HH:MM local
    const diaCapitalizado = dayNameCapitalES(now);

    // Si ya tiene asistencia HOY (local), no repetir
    const yaTieneAsistencia = asistencias.some(
      (a) =>
        String(a.estudianteId) === String(estudiante.id) &&
        String(a.fecha) === String(fechaHoy)
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

      // Comparación de hora robusta
      const esTarde =
        hhmmToMinutes(horaActual) > hhmmToMinutes(scheduleHoy.horaInicio);

      const payload = {
        estudianteId: estudiante.id,
        fecha: fechaHoy, // LOCAL
        horaEntrada: horaActual, // LOCAL
        estado: esTarde ? "tardanza" : "presente",
      };

      await apiAcademy.post("/asistencias", payload);
      message.success(
        `Asistencia registrada: ${estudiante.person.nombre} — ${payload.estado}`
      );

      // Cooldown extra: evitar múltiples lecturas seguidas tras éxito
      lastCodeRef.current = codigo;
      lastScanAtRef.current = Date.now() + SUCCESS_COOLDOWN_MS;

      await fetchAsistencias();
    } catch (err) {
      console.error(err);
      message.error("Error registrando la asistencia.");
    } finally {
      setTimeout(() => setProcessing(false), 600);
    }
  };

  return (
    <Modal
      open={open}
      title="Escanear Código QR"
      onCancel={() => {
        stopScanner();
        onClose();
      }}
      footer={null}
      destroyOnClose
      width={720}
      // Arrancar/Detener SOLO cuando el modal ya es visible
      afterOpenChange={(visible) => {
        if (visible) {
          // Pequeño delay + rAF para asegurar layout del video
          setTimeout(() => {
            requestAnimationFrame(() => startScanner());
          }, 80);
        } else {
          stopScanner();
        }
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 320,
            background: "#000",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#fff",
              fontSize: 12,
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
              pointerEvents: "none",
            }}
          >
            <Text style={{ color: "white" }}>
              Enfoca a ~20–30 cm. Si hay reflejo, baja el brillo del teléfono.
            </Text>
            {torchAvailable && (
              <Space align="center" style={{ pointerEvents: "auto" }}>
                <Text style={{ color: "white" }}>Linterna</Text>
                <Switch checked={torchOn} onChange={handleToggleTorch} />
              </Space>
            )}
          </div>
        </div>

        {result && (
          <p className="mt-2 p-2 bg-green-100 text-green-800 rounded">
            Último QR detectado: {result}
          </p>
        )}

        <Space>
          <Upload
            accept="image/*"
            beforeUpload={beforeUpload}
            showUploadList={false}
          >
            <Button>Leer desde imagen…</Button>
          </Upload>
          <Button onClick={() => setResult(null)}>Limpiar último</Button>
        </Space>
      </Space>
    </Modal>
  );
}
