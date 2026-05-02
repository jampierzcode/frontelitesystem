import { useEffect, useRef, useState, useCallback } from "react";
import { Transmit } from "@adonisjs/transmit-client";
import apiAcademy from "../auth/apiAcademy";

const API_BASE = process.env.REACT_APP_API_URL || "";
// Quitar /api del final si está, porque Transmit usa /__transmit/*
const TRANSMIT_BASE = API_BASE.replace(/\/api\/?$/, "");

/**
 * Hook que mantiene:
 *  - lista de notificaciones (BD)
 *  - contador de no leídas
 *  - suscripción Transmit en tiempo real al canal admin/notifications
 */
export default function useNotificaciones() {
  const [items, setItems] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const transmitRef = useRef(null);
  const subscriptionRef = useRef(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiAcademy.get("/notificaciones");
      setItems(res.data.data || []);
      setNoLeidas(res.data.meta?.totalNoLeidas || 0);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!TRANSMIT_BASE) return;

    const transmit = new Transmit({
      baseUrl: TRANSMIT_BASE,
    });
    transmitRef.current = transmit;

    const subscription = transmit.subscription("admin/notifications");
    subscriptionRef.current = subscription;

    subscription
      .create()
      .then(() => {
        subscription.onMessage((message) => {
          // Reload de la lista (rápido y simple) — la notificación ya está en BD
          fetchItems();
          // Optional: mostrar toast con el title
          if (window?.dispatchEvent) {
            window.dispatchEvent(
              new CustomEvent("nueva-notificacion", { detail: message })
            );
          }
        });
      })
      .catch(() => {
        // Si falla la suscripción (server no levantado, etc.), no rompe nada
      });

    return () => {
      try {
        subscription.delete();
      } catch {
        // ignore
      }
      try {
        transmit.close();
      } catch {
        // ignore
      }
    };
  }, [fetchItems]);

  const marcarLeida = useCallback(async (id) => {
    try {
      await apiAcademy.post(`/notificaciones/${id}/leer`);
      fetchItems();
    } catch {
      // silencioso
    }
  }, [fetchItems]);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await apiAcademy.post("/notificaciones/leer-todas");
      fetchItems();
    } catch {
      // silencioso
    }
  }, [fetchItems]);

  return { items, noLeidas, fetchItems, marcarLeida, marcarTodasLeidas };
}
