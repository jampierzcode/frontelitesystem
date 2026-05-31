// Sonido de notificación generado con Web Audio API (sin necesidad de un .mp3).
// Reproduce un breve "ding" de dos tonos. Compatible con la política de autoplay:
// el AudioContext se crea perezosamente y se reanuda en cada uso.

let audioCtx = null;

export function playNotificationSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    const notas = [880, 1175]; // A5 -> D6
    notas.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch {
    // Silencioso: si el navegador bloquea el audio, no rompe la app.
  }
}
