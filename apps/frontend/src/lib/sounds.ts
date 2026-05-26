let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Soft wooden thud — piece sliding onto a square. */
export function playMoveSound(): void {
  try {
    const ac = getCtx();
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // silently ignore if Web Audio is unavailable
  }
}

/** Sharp two-tone crack — piece captured and removed. */
export function playCaptureSound(): void {
  try {
    const ac = getCtx();
    const now = ac.currentTime;

    const pairs: [number, number][] = [
      [680, 0],
      [420, 0.018],
    ];

    for (const [freq, offset] of pairs) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.22, now + 0.09 + offset);

      gain.gain.setValueAtTime(0.16, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + offset);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now + offset);
      osc.stop(now + 0.14 + offset);
    }
  } catch {
    // silently ignore if Web Audio is unavailable
  }
}
