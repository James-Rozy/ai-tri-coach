// @ts-nocheck -- a straight port of the watch face mockup's canvas code, kept untyped so the geometry stays
// line-for-line identical to the mockup (and to the Monkey C layout it was built from).
// Draws the SD Digital Tri face on a 454x454 canvas, the Fenix 9 Pro's resolution.

const C = {
  bg: "#000000", track: "#161B22", ink: "#F2F4F7", muted: "#A9B2C0", faint: "#7D8796", accent: "#FFB020",
  off: "#2A313B", panel: "#18212B", panelLine: "#2C3644", ghost: "#26303C", inset: "#0B1016", insetGhost: "#18202A", hot: "#E5484D",
  swim: "#2EA4DC", bike: "#F28E42", run: "#35C177"
};
const WATCH = '"Roboto Condensed", "Arial Narrow", sans-serif';
const CX = 227, CY = 227;

// Example values, not real data.
const S = {
  steps: 8412, battery: 99, hr: 62, tempF: 57, cond: "wx_partly", wind: { mph: 9, from: 225 },
  status: { bt: true, dnd: false, alarm: true },
  sports: [
    { c: "swim", val: "1,800", unit: "YD", min: 42, target: 80 },
    { c: "bike", val: "42.1", unit: "MI", min: 151, target: 180 },
    { c: "run", val: "12.4", unit: "MI", min: 112, target: 150 }
  ],
  race: { label: "RACE", date: new Date(2027, 8, 19) }
};
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const pad = n => String(n).padStart(2, "0");
const hm = m => `${Math.floor(m / 60)}:${pad(m % 60)}`;
const rad = d => (d - 90) * Math.PI / 180;
const dayDiff = (a, b) => Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000);

// Icons on a 16-unit grid, the same geometry the watch's bitmaps are generated from.
const ICONS = {"swim": [{"t": "line", "p": [[1.0, 8.5], [1.5, 8.96], [2.0, 9.37], [2.5, 9.69], [3.0, 9.86], [3.5, 9.89], [4.0, 9.76], [4.5, 9.49], [5.0, 9.11], [5.5, 8.66], [6.0, 8.19], [6.5, 7.76], [7.0, 7.41], [7.5, 7.18], [8.0, 7.1], [8.5, 7.18], [9.0, 7.41], [9.5, 7.76], [10.0, 8.19], [10.5, 8.66], [11.0, 9.11], [11.5, 9.49], [12.0, 9.76], [12.5, 9.89], [13.0, 9.86], [13.5, 9.69], [14.0, 9.37], [14.5, 8.96], [15.0, 8.5]], "w": 1.8}, {"t": "line", "p": [[1.0, 13.0], [1.5, 13.46], [2.0, 13.87], [2.5, 14.19], [3.0, 14.36], [3.5, 14.39], [4.0, 14.26], [4.5, 13.99], [5.0, 13.61], [5.5, 13.16], [6.0, 12.69], [6.5, 12.26], [7.0, 11.91], [7.5, 11.68], [8.0, 11.6], [8.5, 11.68], [9.0, 11.91], [9.5, 12.26], [10.0, 12.69], [10.5, 13.16], [11.0, 13.61], [11.5, 13.99], [12.0, 14.26], [12.5, 14.39], [13.0, 14.36], [13.5, 14.19], [14.0, 13.87], [14.5, 13.46], [15.0, 13.0]], "w": 1.8}, {"t": "dot", "c": [11.5, 3.6], "r": 2.1}], "bike": [{"t": "ring", "c": [3.8, 11.4], "r": 3.3, "w": 1.5}, {"t": "ring", "c": [12.2, 11.4], "r": 3.3, "w": 1.5}, {"t": "line", "p": [[3.8, 11.4], [7, 6.2], [11, 6.2], [12.2, 11.4]], "w": 1.5}, {"t": "line", "p": [[3.8, 11.4], [8, 11.4], [11, 6.2]], "w": 1.5}, {"t": "line", "p": [[7, 6.2], [6.5, 4.2]], "w": 1.5}, {"t": "line", "p": [[5.2, 4.2], [8, 4.2]], "w": 1.6}, {"t": "line", "p": [[11, 6.2], [11.3, 4.2], [13, 4.2]], "w": 1.5}], "run": [{"t": "fill", "p": [[1.5, 13.5], [1.5, 5.5], [3, 3.8], [5.2, 4.6], [6.6, 7], [9.6, 8.2], [13.6, 9.4], [15, 11.2], [15, 13.5]]}, {"t": "line", "p": [[0.5, 11.4], [15.5, 11.4]], "w": 1.0, "bg": true}, {"t": "line", "p": [[6.4, 9.2], [7.6, 7.6]], "w": 0.9, "bg": true}, {"t": "line", "p": [[8.6, 10], [9.6, 8.6]], "w": 0.9, "bg": true}], "hr": [{"t": "fill", "p": [[8.0, 6.1], [8.03, 5.88], [8.21, 5.29], [8.66, 4.5], [9.43, 3.72], [10.49, 3.19], [11.73, 3.07], [12.98, 3.4], [14.06, 4.18], [14.78, 5.27], [15.04, 6.54], [14.78, 7.86], [14.06, 9.14], [12.98, 10.34], [11.73, 11.46], [10.49, 12.53], [9.43, 13.52], [8.66, 14.42], [8.21, 15.14], [8.03, 15.61], [8.0, 15.78], [7.97, 15.61], [7.79, 15.14], [7.34, 14.42], [6.57, 13.52], [5.51, 12.53], [4.27, 11.46], [3.02, 10.34], [1.94, 9.14], [1.22, 7.86], [0.96, 6.54], [1.22, 5.27], [1.94, 4.18], [3.02, 3.4], [4.27, 3.07], [5.51, 3.19], [6.57, 3.72], [7.34, 4.5], [7.79, 5.29], [7.97, 5.88]]}], "steps": [{"t": "fill", "p": [[7.0, 8.6], [6.92, 9.53], [6.68, 10.4], [6.3, 11.15], [5.8, 11.72], [5.22, 12.08], [4.6, 12.2], [3.98, 12.08], [3.4, 11.72], [2.9, 11.15], [2.52, 10.4], [2.28, 9.53], [2.2, 8.6], [2.28, 7.67], [2.52, 6.8], [2.9, 6.05], [3.4, 5.48], [3.98, 5.12], [4.6, 5.0], [5.22, 5.12], [5.8, 5.48], [6.3, 6.05], [6.68, 6.8], [6.92, 7.67]]}, {"t": "dot", "c": [4.6, 13.8], "r": 1.5}, {"t": "fill", "p": [[13.8, 4.6], [13.72, 5.53], [13.48, 6.4], [13.1, 7.15], [12.6, 7.72], [12.02, 8.08], [11.4, 8.2], [10.78, 8.08], [10.2, 7.72], [9.7, 7.15], [9.32, 6.4], [9.08, 5.53], [9.0, 4.6], [9.08, 3.67], [9.32, 2.8], [9.7, 2.05], [10.2, 1.48], [10.78, 1.12], [11.4, 1.0], [12.02, 1.12], [12.6, 1.48], [13.1, 2.05], [13.48, 2.8], [13.72, 3.67]]}, {"t": "dot", "c": [11.4, 9.8], "r": 1.5}], "temp": [{"t": "line", "p": [[7, 2.6], [7, 10]], "w": 3.2}, {"t": "dot", "c": [7, 12.2], "r": 3.1}, {"t": "line", "p": [[11, 3.2], [13, 3.2]], "w": 1.4}, {"t": "line", "p": [[11, 6], [13, 6]], "w": 1.4}, {"t": "line", "p": [[11, 8.8], [13, 8.8]], "w": 1.4}], "bt": [{"t": "line", "p": [[4, 4.8], [11.6, 11], [8, 14.4], [8, 1.6], [11.6, 5], [4, 11.2]], "w": 1.6}], "dnd": [{"t": "ring", "c": [8, 8], "r": 6.2, "w": 1.6}, {"t": "line", "p": [[5, 8], [11, 8]], "w": 1.9}], "alarm": [{"t": "ring", "c": [8, 8.8], "r": 5.6, "w": 1.6}, {"t": "line", "p": [[8, 5.6], [8, 8.8], [10.4, 10.4]], "w": 1.5}, {"t": "line", "p": [[1.8, 4.2], [4.2, 1.8]], "w": 1.8}, {"t": "line", "p": [[11.8, 1.8], [14.2, 4.2]], "w": 1.8}, {"t": "line", "p": [[4.6, 13.4], [3.4, 14.8]], "w": 1.4}, {"t": "line", "p": [[11.4, 13.4], [12.6, 14.8]], "w": 1.4}], "battery": [{"t": "line", "p": [[1.4, 4.4], [12.8, 4.4], [12.8, 11.6], [1.4, 11.6], [1.4, 4.4]], "w": 1.4}, {"t": "fill", "p": [[13.6, 6.4], [15.2, 6.4], [15.2, 9.6], [13.6, 9.6]]}, {"t": "fill", "p": [[3, 6], [11.2, 6], [11.2, 10], [3, 10]]}], "wx_clear": [{"t": "dot", "c": [8, 8], "r": 3.4}, {"t": "line", "p": [[13.3, 8.0], [15.2, 8.0]], "w": 1.4}, {"t": "line", "p": [[11.75, 11.75], [13.09, 13.09]], "w": 1.4}, {"t": "line", "p": [[8.0, 13.3], [8.0, 15.2]], "w": 1.4}, {"t": "line", "p": [[4.25, 11.75], [2.91, 13.09]], "w": 1.4}, {"t": "line", "p": [[2.7, 8.0], [0.8, 8.0]], "w": 1.4}, {"t": "line", "p": [[4.25, 4.25], [2.91, 2.91]], "w": 1.4}, {"t": "line", "p": [[8.0, 2.7], [8.0, 0.8]], "w": 1.4}, {"t": "line", "p": [[11.75, 4.25], [13.09, 2.91]], "w": 1.4}], "wx_partly": [{"t": "dot", "c": [5.6, 5.6], "r": 2.4}, {"t": "line", "p": [[9.5, 5.6], [10.9, 5.6]], "w": 1.2}, {"t": "line", "p": [[8.36, 8.36], [9.35, 9.35]], "w": 1.2}, {"t": "line", "p": [[5.6, 9.5], [5.6, 10.9]], "w": 1.2}, {"t": "line", "p": [[2.84, 8.36], [1.85, 9.35]], "w": 1.2}, {"t": "line", "p": [[1.7, 5.6], [0.3, 5.6]], "w": 1.2}, {"t": "line", "p": [[2.84, 2.84], [1.85, 1.85]], "w": 1.2}, {"t": "line", "p": [[5.6, 1.7], [5.6, 0.3]], "w": 1.2}, {"t": "line", "p": [[8.36, 2.84], [9.35, 1.85]], "w": 1.2}, {"t": "dot", "c": [6.6, 12.0], "r": 3.8, "bg": true}, {"t": "dot", "c": [10.8, 10.0], "r": 4.8, "bg": true}, {"t": "dot", "c": [14.0, 12.4], "r": 3.4, "bg": true}, {"t": "fill", "p": [[6.6, 11.0], [14.0, 11.0], [14.0, 15.799999999999999], [6.6, 15.799999999999999]], "bg": true}, {"t": "dot", "c": [6.6, 12.0], "r": 2.8}, {"t": "dot", "c": [10.8, 10.0], "r": 3.8}, {"t": "dot", "c": [14.0, 12.4], "r": 2.4}, {"t": "fill", "p": [[6.6, 12.0], [14.0, 12.0], [14.0, 14.799999999999999], [6.6, 14.799999999999999]]}], "wx_cloudy": [{"t": "dot", "c": [5.2, 10.8], "r": 2.8}, {"t": "dot", "c": [9.4, 8.8], "r": 3.8}, {"t": "dot", "c": [12.6, 11.200000000000001], "r": 2.4}, {"t": "fill", "p": [[5.2, 10.8], [12.6, 10.8], [12.6, 13.6], [5.2, 13.6]]}], "wx_rain": [{"t": "dot", "c": [5.2, 8.2], "r": 2.8}, {"t": "dot", "c": [9.4, 6.2], "r": 3.8}, {"t": "dot", "c": [12.6, 8.600000000000001], "r": 2.4}, {"t": "fill", "p": [[5.2, 8.2], [12.6, 8.2], [12.6, 11.0], [5.2, 11.0]]}, {"t": "line", "p": [[5.6, 12.6], [4.3999999999999995, 15]], "w": 1.4}, {"t": "line", "p": [[8.8, 12.6], [7.6000000000000005, 15]], "w": 1.4}, {"t": "line", "p": [[12, 12.6], [10.8, 15]], "w": 1.4}], "wx_snow": [{"t": "dot", "c": [5.2, 8.2], "r": 2.8}, {"t": "dot", "c": [9.4, 6.2], "r": 3.8}, {"t": "dot", "c": [12.6, 8.600000000000001], "r": 2.4}, {"t": "fill", "p": [[5.2, 8.2], [12.6, 8.2], [12.6, 11.0], [5.2, 11.0]]}, {"t": "dot", "c": [5.2, 13.4], "r": 1.0}, {"t": "dot", "c": [8.6, 14.6], "r": 1.0}, {"t": "dot", "c": [12, 13.4], "r": 1.0}], "wx_thunder": [{"t": "dot", "c": [5.2, 8.0], "r": 2.8}, {"t": "dot", "c": [9.4, 6.0], "r": 3.8}, {"t": "dot", "c": [12.6, 8.4], "r": 2.4}, {"t": "fill", "p": [[5.2, 8.0], [12.6, 8.0], [12.6, 10.799999999999999], [5.2, 10.799999999999999]]}, {"t": "line", "p": [[10.4, 9.2], [5.8, 13.4], [8.2, 13.4], [6.6, 16], [11.4, 11.8], [9, 11.8], [10.4, 9.2]], "w": 1.6, "bg": true}, {"t": "fill", "p": [[10.4, 9.2], [5.8, 13.4], [8.2, 13.4], [6.6, 16], [11.4, 11.8], [9, 11.8]]}], "wx_fog": [{"t": "line", "p": [[2, 5], [14, 5]], "w": 1.6}, {"t": "line", "p": [[3.5, 8.5], [12.5, 8.5]], "w": 1.6}, {"t": "line", "p": [[2, 12], [14, 12]], "w": 1.6}]};
function icon(ctx, key, x, y, size, color) {
  const k = size / 16;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ICONS[key].forEach(e => {
    const col = e.bg ? C.bg : color;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.beginPath();
    if (e.t === "line" || e.t === "fill") { e.p.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); }
    else { ctx.arc(e.c[0], e.c[1], e.r, 0, Math.PI * 2); }
    if (e.t === "line" || e.t === "ring") { ctx.lineWidth = e.w; ctx.stroke(); } else { ctx.closePath(); ctx.fill(); }
  });
  ctx.restore();
}

// Arc around any center, angles in clock degrees.
function arcAt(ctx, cx, cy, r, a0, a1, color, width) {
  if (Math.abs(a1 - a0) < 0.3) return;
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "butt";
  if (a1 >= a0) ctx.arc(cx, cy, r, rad(a0), rad(a1)); else ctx.arc(cx, cy, r, rad(a0), rad(a1), true);
  ctx.stroke();
}
function advance(ctx) { return Math.max(...[..."0123456789"].map(d => ctx.measureText(d).width)); }
function tabWidth(ctx, t) { const a = advance(ctx); return [...t].reduce((s, ch) => s + (/\d/.test(ch) ? a : ctx.measureText(ch).width), 0); }
function measure(t, font) { const c = document.createElement("canvas").getContext("2d"); c.font = font; return tabWidth(c, t); }
function text(ctx, t, x, y, font, color, align = "left") {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "left";
  const a = advance(ctx), w = tabWidth(ctx, t);
  let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  for (const ch of t) {
    const cw = /\d/.test(ch) ? a : ctx.measureText(ch).width;
    ctx.fillText(ch, cx + (cw - ctx.measureText(ch).width) / 2, y);
    cx += cw;
  }
  return w;
}
function roundRect(ctx, x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// Segment glyphs: seven segments for digits, fourteen for letters. Same geometry as the watch fonts.
const SEG7 = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g", " ": "" };
const SEG14 = {
  A: "abcefGH", D: "abcdil", E: "adefG", F: "aefG", H: "bcefGH", I: "adil", M: "bcefhj", N: "bcefhm",
  O: "abcdef", P: "abefGH", R: "abefGHm", S: "acdfGH", T: "ail", U: "bcdef", W: "bcefkm"
};
function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
function hSeg(ctx, x0, x1, y, t) { const h = t / 2; poly(ctx, [[x0, y], [x0 + h, y - h], [x1 - h, y - h], [x1, y], [x1 - h, y + h], [x0 + h, y + h]]); }
function vSeg(ctx, x, y0, y1, t) { const h = t / 2; poly(ctx, [[x, y0], [x + h, y0 + h], [x + h, y1 - h], [x, y1], [x - h, y1 - h], [x - h, y0 + h]]); }
function dSeg(ctx, x0, y0, x1, y1, t) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len * t * 0.45, ny = dx / len * t * 0.45;
  poly(ctx, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
}
function segments(ctx, x, y, w, h, t) {
  const g = Math.max(1, t * 0.18), L = x + t / 2, R = x + w - t / 2, T = y + t / 2, M = y + h / 2, B = y + h - t / 2, Cx = x + w / 2;
  const d = t * 1.1;
  return {
    a: () => hSeg(ctx, L + g, R - g, T, t), b: () => vSeg(ctx, R, T + g, M - g, t), c: () => vSeg(ctx, R, M + g, B - g, t),
    d: () => hSeg(ctx, L + g, R - g, B, t), e: () => vSeg(ctx, L, M + g, B - g, t), f: () => vSeg(ctx, L, T + g, M - g, t),
    g: () => hSeg(ctx, L + g, R - g, M, t),
    G: () => hSeg(ctx, L + g, Cx - g, M, t), H: () => hSeg(ctx, Cx + g, R - g, M, t),
    i: () => vSeg(ctx, Cx, T + g, M - g, t), l: () => vSeg(ctx, Cx, M + g, B - g, t),
    h: () => dSeg(ctx, L + d, T + d, Cx - t * 0.6, M - t * 0.8, t), j: () => dSeg(ctx, R - d, T + d, Cx + t * 0.6, M - t * 0.8, t),
    k: () => dSeg(ctx, Cx - t * 0.6, M + t * 0.8, L + d, B - d, t), m: () => dSeg(ctx, Cx + t * 0.6, M + t * 0.8, R - d, B - d, t)
  };
}
// One string of segment glyphs. Letters use fourteen segments, everything else seven.
// Unlit segments show only behind digits; behind letters they turn to noise.
function segText(ctx, str, x, y, w, h, t, on, off) {
  const sp = t * 0.9, cw = t * 1.2;
  let cx = x;
  for (const ch of str) {
    if (ch === ":") {
      ctx.fillStyle = on;
      ctx.fillRect(cx + (cw - t) / 2, y + h * 0.3 - t / 2, t, t);
      ctx.fillRect(cx + (cw - t) / 2, y + h * 0.7 - t / 2, t, t);
      cx += cw + sp; continue;
    }
    const letter = ch in SEG14, segs = segments(ctx, cx, y, w, h, t);
    const all = letter ? "abcdefGHilhjkm" : (ch === "-" ? "g" : "abcdefg");
    const lit = letter ? SEG14[ch] : SEG7[ch];
    for (const k of all) {
      const isOn = lit.includes(k);
      if (!isOn && (!off || letter)) continue;
      ctx.fillStyle = isOn ? on : off; segs[k]();
    }
    cx += w + sp;
  }
}
const segWidth = (str, w, t) => [...str].reduce((s, ch) => s + (ch === ":" ? t * 1.2 : w) + t * 0.9, 0) - t * 0.9;

// Text along the bottom bezel, upright, centered at 6 o'clock with its baseline on radius r.
function bottomArcText(ctx, str, r, font, color, spacing) {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "center";
  const widths = [...str].map(ch => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let pos = -total / 2;
  [...str].forEach((ch, i) => {
    const mid = pos + (widths[i] - spacing) / 2;
    const th = Math.PI / 2 - mid / r;
    ctx.save(); ctx.translate(CX + r * Math.cos(th), CY + r * Math.sin(th)); ctx.rotate(th - Math.PI / 2);
    ctx.fillText(ch, 0, 0); ctx.restore();
    pos += widths[i];
  });
  ctx.textAlign = "left";
}


export function draw(canvas, date, aod) {
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 454, 454);
  // No drift: the stripes alternate each minute, so the time stays put when the watch wakes.
  ctx.save();
  ctx.textBaseline = "alphabetic";
  const SMALL = `400 16px ${WATCH}`, LB = `700 22px ${WATCH}`, VAL = `700 26px ${WATCH}`, ROW = `700 28px ${WATCH}`, ROWS = `700 26px ${WATCH}`, BIG = `700 48px ${WATCH}`;

  // LCD panel
  roundRect(ctx, 74, 162, 296, 150, 12, aod ? null : C.panel, aod ? C.off : C.panelLine, 2);
  const ghost = aod ? null : C.ghost;
  const ink = aod ? C.muted : C.ink;
  // Day of the week, then month-day in its own inset box
  text(ctx, DAYS[date.getDay()], 90, 204, `700 34px ${WATCH}`, aod ? C.faint : ink);
  roundRect(ctx, 230, 167, 128, 46, 6, aod ? null : C.inset, aod ? C.off : C.panelLine, 1.5);
  const dateStr = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  segText(ctx, dateStr, 294 - segWidth(dateStr, 18, 5) / 2, 173, 18, 34, 5, aod ? C.faint : ink, aod ? null : C.insetGhost);
  // Time; the leading hour digit goes dark rather than showing a zero
  const h12 = date.getHours() % 12 || 12;
  const timeStr = `${h12 < 10 ? " " : ""}${h12}:${pad(date.getMinutes())}`;
  if (ghost) segText(ctx, "88:88", 90, 224, 42, 74, 10, ghost, null);
  segText(ctx, timeStr, 90, 224, 42, 74, 10, ink, null);
  if (!aod) {
    text(ctx, date.getHours() < 12 ? "AM" : "PM", 316, 244, LB, C.muted);
    segText(ctx, pad(date.getSeconds()), 316, 266, 16, 32, 4, C.accent, ghost);
  }

  if (!aod) {
    // Sport rings: each fills from 12 o'clock toward its weekly target
    S.sports.forEach((s, i) => {
      const x = 117 + i * 110, y = 100;
      arcAt(ctx, x, y, 50, 0, 360, C.track, 7);
      arcAt(ctx, x, y, 50, 0, 360 * Math.min(1, s.min / s.target), C[s.c], 7);
      icon(ctx, s.c, x - 12, 60, 24, C[s.c]);
      const vw = measure(s.val, VAL), uw = measure(s.unit, SMALL);
      const x0 = x - (vw + 2 + uw) / 2;
      text(ctx, s.val, x0, 112, VAL, C.ink);
      text(ctx, s.unit, x0 + vw + 2, 112, SMALL, C.muted);
      text(ctx, hm(s.min), x, 136, LB, C.muted, "center");
    });

    // Status down the left
    [["bt", S.status.bt], ["dnd", S.status.dnd], ["alarm", S.status.alarm]].forEach(([k, on], i) => {
      icon(ctx, k, 28, 176 + i * 44, 30, on ? C.ink : C.off);
    });

    // Wind dial: the arrow points where the wind is blowing
    const wx = 410, wy = 190, wr = 21;
    ctx.beginPath(); ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.fillRect(wx - 1, wy - wr - 4, 2, 5);
    const to = (S.wind.from + 180) * Math.PI / 180;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(to);
    ctx.fillStyle = C.ink; poly(ctx, [[0, -wr + 3], [9, 10], [0, 6], [-9, 10]]);
    ctx.restore();
    text(ctx, `${S.wind.mph} MPH`, wx, 236, LB, C.ink, "center");
    // Temperature
    // Current conditions over the temperature
    icon(ctx, S.cond, wx - 14, 248, 28, C.ink);
    // Digits centered on the column; the degree sign hangs off to the right
    text(ctx, `${S.tempF}°`, wx + measure("°", ROW) / 2, 306, ROW, C.ink, "center");
  }

  if (!aod) {
    // Under the panel: steps from its left edge across the left half, battery from the middle,
    // heart rate ending at its right edge
    [["steps", S.steps.toLocaleString("en-US"), C.ink, "L"], ["battery", `${S.battery}%`, C.ink, "M"], ["hr", String(S.hr), C.hot, "R"]]
      .forEach(([k, val, col, a]) => {
        const vw = measure(val, ROWS), x0 = a === "L" ? 74 : a === "M" ? 227 : 370 - (24 + 4 + vw);
        icon(ctx, k, x0, 330, 24, col);
        text(ctx, val, x0 + 28, 352, ROWS, C.ink);
      });

    // Race countdown along the bottom bezel
    const daysLeft = dayDiff(S.race.date, date);
    text(ctx, String(daysLeft), CX, 403, BIG, C.ink, "center");
    bottomArcText(ctx, `${daysLeft === 1 ? "DAY" : "DAYS"} UNTIL ${S.race.label}`, 210, LB, C.muted, 1.5);
  }
  ctx.restore();

  if (aod) {
    ctx.fillStyle = "#000";
    for (let y = date.getMinutes() % 2; y < 454; y += 2) ctx.fillRect(0, y, 454, 1);
  }
}

