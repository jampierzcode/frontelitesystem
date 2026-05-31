// Notificaciones nativas del navegador / sistema operativo (Web Notifications API).
// Aparecen en la esquina de la pantalla aunque el usuario esté en otra pestaña u
// otra aplicación, siempre que la pestaña de la web siga abierta (aunque sea en
// segundo plano). Para entrega con el navegador totalmente cerrado se necesitaría
// Web Push + Service Worker (VAPID), que es un cambio mayor.

const ICON = "/logo192.png";

export function notificacionesSoportadas() {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Pide permiso para mostrar notificaciones si aún no se ha decidido.
 * Devuelve el estado final: "granted" | "denied" | "default" | "unsupported".
 */
export async function pedirPermisoNotificaciones() {
  if (!notificacionesSoportadas()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    // Safari antiguo usa callback; el resto promesa.
    const result = await new Promise((resolve) => {
      const ret = Notification.requestPermission(resolve);
      if (ret && typeof ret.then === "function") ret.then(resolve);
    });
    return result || Notification.permission;
  } catch {
    return Notification.permission;
  }
}

/**
 * Muestra una notificación nativa. onClick se ejecuta al hacer click en ella
 * (se enfoca la ventana y se ejecuta el callback, p.ej. navegar a la URL).
 */
export function mostrarNotificacionNavegador({ title, body, url, onClick }) {
  if (!notificacionesSoportadas() || Notification.permission !== "granted") {
    return false;
  }
  try {
    const n = new Notification(title || "Nueva notificación", {
      body: body || "",
      icon: ICON,
      badge: ICON,
      tag: url || undefined, // colapsa duplicados de la misma URL
      renotify: false,
    });
    n.onclick = (e) => {
      e.preventDefault();
      try {
        window.focus();
      } catch {
        // ignore
      }
      if (onClick) onClick(url);
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
