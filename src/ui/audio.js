/**
 * Optional ambient score, synthesised with WebAudio (no files). Muted by default;
 * the AudioContext is only created after an explicit click on the sound toggle.
 * A cold, low pad + filtered air that opens slightly with scroll speed.
 */
export class Ambience {
  constructor() {
    this.ctx = null;
    this.on = false;
  }

  _build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Pad: detuned sines through a low-pass.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.connect(this.master);
    for (const [f, g] of [[55, 0.16], [82.4, 0.09], [110.3, 0.07], [164.8, 0.035]]) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = det;
        const gain = ctx.createGain();
        gain.gain.value = g;
        o.connect(gain).connect(padFilter);
        o.start();
      }
    }
    // Air: noise through a band-pass, modulated by scroll velocity.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    this.air = ctx.createBiquadFilter();
    this.air.type = 'bandpass';
    this.air.frequency.value = 600;
    this.air.Q.value = 0.7;
    this.airGain = ctx.createGain();
    this.airGain.gain.value = 0.12;
    noise.connect(this.air).connect(this.airGain).connect(this.master);
    noise.start();
    return true;
  }

  async toggle() {
    if (!this.ctx && !this._build()) return false;
    this.on = !this.on;
    if (this.on) await this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.on ? 0.5 : 0, t, 0.4);
    return this.on;
  }

  /** velocity: |ds/dt| in scene units per second */
  update(velocity) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const v = Math.min(1, Math.abs(velocity) * 0.6);
    this.air.frequency.setTargetAtTime(500 + v * 1800, t, 0.2);
    this.airGain.gain.setTargetAtTime(0.1 + v * 0.25, t, 0.2);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.on) this.ctx.resume();
  }
}
