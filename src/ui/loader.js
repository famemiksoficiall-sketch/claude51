/**
 * Loading screen driven by real work: each step is a texture generation pass,
 * the PMREM environment bake or shader compilation, weighted by its cost.
 */
export class Loader {
  constructor(el, steps) {
    this.el = el;
    this.fill = el.querySelector('.loader__fill');
    this.bar = el.querySelector('[role="progressbar"]');
    this.pct = el.querySelector('.loader__pct');
    this.label = el.querySelector('.loader__label');
    this.steps = new Map(steps.map(([id, weight, label]) => [id, { weight, label, f: 0 }]));
    this.total = steps.reduce((a, [, w]) => a + w, 0);
    this.shown = 0;
  }

  begin(id) {
    const s = this.steps.get(id);
    if (s) this.label.textContent = s.label;
    this._render();
  }

  progress(id, f) {
    const s = this.steps.get(id);
    if (s) s.f = Math.max(s.f, Math.min(1, f));
    this._render();
  }

  done(id) {
    this.progress(id, 1);
  }

  _render() {
    let acc = 0;
    for (const s of this.steps.values()) acc += s.weight * s.f;
    const p = Math.round((acc / this.total) * 100);
    this.shown = p;
    this.fill.style.transform = `scaleX(${p / 100})`;
    this.bar.setAttribute('aria-valuenow', String(p));
    this.pct.textContent = `${p}%`;
  }

  finish() {
    for (const s of this.steps.values()) s.f = 1;
    this.label.textContent = 'Ready';
    this._render();
    return new Promise((r) => setTimeout(r, 450));
  }
}
