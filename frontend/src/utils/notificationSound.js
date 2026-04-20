/**
 * Notification sounds via Web Audio API.
 * Uses a singleton AudioContext that is unlocked on the first user interaction,
 * so sound reliably plays even when triggered by a socket event.
 */

let _ctx = null;

const getCtx = () => {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
};

// Unlock the AudioContext the moment the user first interacts with the page.
// This satisfies browser autoplay policies so socket-triggered sounds work.
const unlock = () => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* ignore */ }
};

if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach((e) =>
    document.addEventListener(e, unlock, { passive: true })
  );
}

const _tone = (ctx, frequency, startTime, duration, volume = 0.28) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
};

export const playNotificationSound = async (type) => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const t = ctx.currentTime;

    switch (type) {
      case 'BOOKING_REQUEST':
        // Urgent ascending double-beep → supervisor alert
        _tone(ctx, 880,  t,        0.14);
        _tone(ctx, 1100, t + 0.18, 0.18);
        break;

      case 'BOOKING_CONFIRMED':
        // Pleasant ascending triple chime → student success
        _tone(ctx, 523, t,        0.13);
        _tone(ctx, 659, t + 0.14, 0.13);
        _tone(ctx, 784, t + 0.28, 0.22);
        break;

      case 'BOOKING_REJECTED':
      case 'BOOKING_CANCELLED':
        // Descending two-note alert → student warning
        _tone(ctx, 440, t,        0.18);
        _tone(ctx, 330, t + 0.22, 0.28);
        break;

      case 'TRAINING_CONFIRMED':
        _tone(ctx, 523, t,        0.13);
        _tone(ctx, 659, t + 0.14, 0.13);
        _tone(ctx, 784, t + 0.28, 0.22);
        break;

      default:
        _tone(ctx, 660, t, 0.28);
        break;
    }
  } catch { /* AudioContext unavailable — ignore */ }
};
