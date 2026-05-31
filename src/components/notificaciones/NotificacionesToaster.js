import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notification } from "antd";
import { BsBellFill } from "react-icons/bs";
import { playNotificationSound } from "../../utils/notificationSound";
import {
  pedirPermisoNotificaciones,
  mostrarNotificacionNavegador,
} from "../../utils/browserNotifications";

/**
 * Escucha el evento global "nueva-notificacion" (disparado por useNotificaciones
 * cuando llega un mensaje en tiempo real por Transmit) y:
 *  - reproduce un sonido de alerta
 *  - si la pestaña está visible: muestra un toast interno clicable
 *  - si la pestaña NO está visible (estás en otra pestaña/app): muestra una
 *    notificación NATIVA del navegador (esquina del sistema operativo)
 *  En ambos casos, al hacer click navega a la URL de la notificación.
 *
 * Se monta una sola vez dentro del Router (ver App.js).
 */
export default function NotificacionesToaster() {
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();

  // Pedir permiso para notificaciones nativas (en el primer gesto del usuario,
  // que es lo que exigen los navegadores modernos).
  useEffect(() => {
    pedirPermisoNotificaciones();
    const onFirstInteraction = () => {
      pedirPermisoNotificaciones();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
    window.addEventListener("pointerdown", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const n = e.detail || {};
      playNotificationSound();

      const irA = () => {
        if (n.url) navigate(n.url);
      };

      const visible = document.visibilityState === "visible";

      // Si NO estás viendo la app, intenta la notificación nativa del SO.
      if (!visible) {
        const mostrada = mostrarNotificacionNavegador({
          title: n.titulo || "Nueva notificación",
          body: n.mensaje || "",
          url: n.url,
          onClick: irA,
        });
        if (mostrada) return;
      }

      // Estás dentro de la app (o no hay permiso): toast interno.
      const key = `notif-${Date.now()}`;
      const tieneUrl = !!n.url;
      api.open({
        key,
        message: n.titulo || "Nueva notificación",
        description: n.mensaje || "",
        icon: <BsBellFill style={{ color: "#2563eb" }} />,
        placement: "topRight",
        duration: 6,
        style: { cursor: tieneUrl ? "pointer" : "default" },
        onClick: () => {
          irA();
          api.destroy(key);
        },
      });
    };

    window.addEventListener("nueva-notificacion", handler);
    return () => window.removeEventListener("nueva-notificacion", handler);
  }, [api, navigate]);

  return contextHolder;
}
