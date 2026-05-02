import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * Modal de escáner QR. Inspirado en el de mijatoo:
 * - cámara trasera por defecto (facingMode: environment)
 * - cuadro guía visible (qrbox 220x220)
 * - detecta una vez y notifica al padre vía onScanned
 */
export default function QrScannerModal({ open, onClose, onScanned }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    scannedRef.current = false;
    setError("");
    setStarting(true);

    const start = async () => {
      if (!containerRef.current) return;

      const scanner = new Html5Qrcode("qr-reader-elite");
      scannerRef.current = scanner;

      try {
        let cameraId = { facingMode: "environment" };

        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const back = devices.find(
              (d) =>
                d.label.toLowerCase().includes("back") ||
                d.label.toLowerCase().includes("rear")
            );
            cameraId = back ? back.id : devices[0].id;
          }
        } catch {
          // fallback a facingMode
        }

        if (cancelled) return;

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;

            scanner
              .stop()
              .then(() => {
                scannerRef.current = null;
                onScanned?.(decodedText);
              })
              .catch(() => {
                onScanned?.(decodedText);
              });
          },
          () => {
            // continuous scanning, ignorar errores parciales
          }
        );

        if (!cancelled) setStarting(false);
      } catch {
        if (!cancelled) {
          setError(
            "No se pudo acceder a la cámara. Verifica los permisos del navegador."
          );
          setStarting(false);
        }
      }
    };

    const t = setTimeout(start, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onScanned]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Escanear QR del estudiante
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Apunta la cámara al QR
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <p className="text-xs text-gray-400">
                Asegúrate de permitir el acceso a la cámara cuando el navegador
                lo solicite.
              </p>
            </div>
          ) : (
            <div className="relative">
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Iniciando cámara...</p>
                  </div>
                </div>
              )}
              <div
                ref={containerRef}
                id="qr-reader-elite"
                className="rounded-lg overflow-hidden"
                style={{ minHeight: 300 }}
              />
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
