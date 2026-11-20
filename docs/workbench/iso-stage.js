/* ============================================================================
 * iso-stage.js — Course-Agnostic 2.5D Isometric & Tactile Vector SVG Stage Engine
 * ============================================================================
 * Inspired by designed-to-scale & Dilum Sanjaya's Protocol Explorer, built for
 * interactive system design, computer networking & CS fundamentals education
 * (SOA & Microservices, INT1433 Network Programming, INT11117 Intro to CS/C).
 *
 * Key capabilities:
 *   1. Isometric 2.5D projection + smooth rounded polygon geometry
 *   2. 14 rich entity primitives:
 *      - Core: block, db (cylinder), queue (message slots), device (laptop/phone/sensor),
 *        crowd (users), zone (floor boundary), ring (hash ring), panel (HUD/trace card), ghost
 *      - System Design & Networking: router (antenna + LEDs + ports), firewall (brick wall + shield),
 *        cloud (layered WAN/Internet mesh), rack (multi-blade server tower), frame (packet/memory strip)
 *   3. Smart polygon-clipped link routing with obstacle-aware pill placement & full viewBox framing
 *   4. 60fps requestAnimationFrame packet flow simulation + burst FX (ok/fail)
 *   5. Pan/zoom/fit + theme-aware Light (Warm Paper) & Dark (Charcoal) palettes
 * ============================================================================ */
(function (global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TILE = 14; // Isometric half-tile unit (px)

  const A = (n) => {
    const v = Math.round(Number(n || 0) * 100) / 100;
    return Object.is(v, -0) ? '0' : String(v);
  };
  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v || 0)));
  const lerp = (a, b, t) => a + (b - a) * t;

  function worldCenter(wx, wy, z = 0) {
    return [wx * 34 + wy * 2.4, -wy * 34 + wx * 1.5 - z];
  }

  function iso(x, y, z = 0, refX = null, refY = null) {
    if (refX !== null && refY !== null) {
      const [cx, cy] = worldCenter(refX, refY, 0);
      const dx = x - refX;
      const dy = y - refY;
      return [cx + (dx + dy) * TILE, cy + (dx - dy) * (TILE * 0.5) - z];
    }
    return worldCenter(x, y, z);
  }

  function roundedPoly(pts, radii = 8) {
    const n = pts.length;
    if (n < 3) return '';
    const rList = Array.isArray(radii) ? radii : pts.map(() => radii);
    let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const v1x = p0[0] - p1[0], v1y = p0[1] - p1[1];
      const v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
      const l1 = Math.hypot(v1x, v1y) || 1;
      const l2 = Math.hypot(v2x, v2y) || 1;
      const r = Math.min(rList[i] || 6, l1 * 0.45, l2 * 0.45);
      const sx = p1[0] + (v1x / l1) * r;
      const sy = p1[1] + (v1y / l1) * r;
      const ex = p1[0] + (v2x / l2) * r;
      const ey = p1[1] + (v2y / l2) * r;
      d += (i === 0 ? `M${A(sx)},${A(sy)}` : ` L${A(sx)},${A(sy)}`) +
           ` Q${A(p1[0])},${A(p1[1])} ${A(ex)},${A(ey)}`;
    }
    return d + ' Z';
  }

  function roundedOpenPath(pts, radius = 8) {
    const n = pts.length;
    if (n < 2) return '';
    if (n === 2) return `M${A(pts[0][0])},${A(pts[0][1])} L${A(pts[1][0])},${A(pts[1][1])}`;
    let d = `M${A(pts[0][0])},${A(pts[0][1])}`;
    for (let i = 1; i < n - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const v1x = p0[0] - p1[0], v1y = p0[1] - p1[1];
      const v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
      const l1 = Math.hypot(v1x, v1y) || 1;
      const l2 = Math.hypot(v2x, v2y) || 1;
      const r = Math.min(radius, l1 * 0.45, l2 * 0.45);
      const sx = p1[0] + (v1x / l1) * r;
      const sy = p1[1] + (v1y / l1) * r;
      const ex = p1[0] + (v2x / l2) * r;
      const ey = p1[1] + (v2y / l2) * r;
      d += ` L${A(sx)},${A(sy)} Q${A(p1[0])},${A(p1[1])} ${A(ex)},${A(ey)}`;
    }
    const last = pts[n - 1];
    return d + ` L${A(last[0])},${A(last[1])}`;
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const textCache = new Map();
  let measureCtx = null;
  function measureText(str, fontSize = 11) {
    const s = String(str ?? '');
    if (!s) return 0;
    const key = `${fontSize}|${s}`;
    if (textCache.has(key)) return textCache.get(key);
    let w = s.length * fontSize * 0.63;
    if (typeof document !== 'undefined') {
      try {
        if (!measureCtx) {
          measureCtx = document.createElement('canvas').getContext('2d');
        }
        measureCtx.font = `700 ${fontSize}px Consolas, "JetBrains Mono", "Roboto", monospace`;
        w = Math.max(w * 0.92, measureCtx.measureText(s).width);
      } catch (e) { /* fallback */ }
    }
    textCache.set(key, w);
    return w;
  }

  /* ── Theme Palettes (Light Warm Paper, Dark Charcoal) ── */
  const PALETTES = {
    light: {
      ink: '#1d1b18',
      ink2: '#34302b',
      muted: '#6f6961',
      drop: '#1d1b18',
      shadowFill: '#6b5236',
      gridStroke: '#a8916f',
      gridOpacity: '0.28',
      zoneBg: '#fffaf2',
      cardBg: '#fbf6ef',
      cardLine: '#d8cebf',
      halo: {
        green: '#5fae57',
        blue: '#2563eb',
        amber: '#d97706',
        red: '#dc2626',
        violet: '#7c3aed',
        teal: '#0d9488'
      },
      blocks: {
        blue:   { top: ['#dce9f9', '#b8d3f2'], side: ['#a9c5e8', '#87aedc'] },
        green:  { top: ['#e2f2d5', '#c3e2ae'], side: ['#b3d79f', '#92c17b'] },
        orange: { top: ['#fde6cf', '#f8cba2'], side: ['#f3b47f', '#e5985b'] },
        purple: { top: ['#ebe2f7', '#d8c8ee'], side: ['#cbbae6', '#b19ad6'] },
        violet: { top: ['#ebe2f7', '#d8c8ee'], side: ['#cbbae6', '#b19ad6'] },
        yellow: { top: ['#fdf0c4', '#f9df97'], side: ['#f6cd82', '#e8b860'] },
        amber:  { top: ['#fdf0c4', '#f9df97'], side: ['#f6cd82', '#e8b860'] },
        red:    { top: ['#fce0dc', '#f6b8b0'], side: ['#f19b91', '#e07a6e'] },
        teal:   { top: ['#d6f2ee', '#b0e3dc'], side: ['#94d4cb', '#72beb4'] },
        slab:   { top: ['#f5eee4', '#e8dfd2'], side: ['#ddd3c4', '#c9beae'] },
        gray:   { top: ['#ece7df', '#ded7cc'], side: ['#cfc7bb', '#bcb2a4'] }
      },
      pills: {
        paper:  { bg: '#fbf6ef', fg: '#1d1b18', border: '#1d1b18' },
        green:  { bg: '#dcefd2', fg: '#1f4718', border: '#1d1b18' },
        amber:  { bg: '#fbe5bd', fg: '#6d4a0c', border: '#1d1b18' },
        orange: { bg: '#fde2c4', fg: '#7c3a0d', border: '#1d1b18' },
        red:    { bg: '#f8d5cf', fg: '#8f2a22', border: '#1d1b18' },
        violet: { bg: '#e7ddf5', fg: '#47306f', border: '#1d1b18' },
        blue:   { bg: '#d6e5f6', fg: '#184a7c', border: '#1d1b18' },
        teal:   { bg: '#d4f0eb', fg: '#114d46', border: '#1d1b18' },
        gray:   { bg: '#ebe5dc', fg: '#5c554c', border: '#5c554c' }
      }
    },
    dark: {
      ink: '#efe6d6',
      ink2: '#d8ccb8',
      muted: '#a3998b',
      drop: '#050403',
      shadowFill: '#000000',
      gridStroke: '#7a6c58',
      gridOpacity: '0.24',
      zoneBg: '#2e2923',
      cardBg: '#2b2620',
      cardLine: '#4a4238',
      halo: {
        green: '#7fc278',
        blue: '#60a5fa',
        amber: '#f59e0b',
        red: '#f87171',
        violet: '#a78bfa',
        teal: '#2dd4bf'
      },
      blocks: {
        blue:   { top: ['#3b5575', '#2e4460'], side: ['#253850', '#1d2c40'] },
        green:  { top: ['#3d5936', '#30472a'], side: ['#273b22', '#1e2e1a'] },
        orange: { top: ['#6e492e', '#593a24'], side: ['#4a2f1d', '#3b2516'] },
        purple: { top: ['#523f6e', '#423259'], side: ['#352849', '#291f39'] },
        violet: { top: ['#523f6e', '#423259'], side: ['#352849', '#291f39'] },
        yellow: { top: ['#695429', '#544320'], side: ['#453619', '#362a13'] },
        amber:  { top: ['#695429', '#544320'], side: ['#453619', '#362a13'] },
        red:    { top: ['#6e332d', '#592823'], side: ['#48201c', '#381815'] },
        teal:   { top: ['#2c5954', '#224743'], side: ['#1b3936', '#142c29'] },
        slab:   { top: ['#3d372f', '#322d26'], side: ['#29251f', '#211d18'] },
        gray:   { top: ['#453f37', '#38332c'], side: ['#2e2a24', '#24211c'] }
      },
      pills: {
        paper:  { bg: '#2e2923', fg: '#efe6d6', border: '#c6bfb7' },
        green:  { bg: '#2e4427', fg: '#c8eab9', border: '#8bc47a' },
        amber:  { bg: '#4f3e22', fg: '#f7dfa8', border: '#d9a74a' },
        orange: { bg: '#57381f', fg: '#fbd4a8', border: '#e5985b' },
        red:    { bg: '#522924', fg: '#f7bfb8', border: '#e07a6e' },
        violet: { bg: '#423159', fg: '#e2d2f7', border: '#b399d9' },
        blue:   { bg: '#273e57', fg: '#c6def7', border: '#7eb0e8' },
        teal:   { bg: '#1f4540', fg: '#bceee6', border: '#5ec7b9' },
        gray:   { bg: '#36312a', fg: '#c4baac', border: '#7d7365' }
      }
    }
  };

  /* ── Vector Icon Paths (24x24 viewBox) ── */
  const ICONS = {
    server:   '<rect x="3" y="4" width="18" height="6.5" rx="1.8"/><rect x="3" y="13.5" width="18" height="6.5" rx="1.8"/><line x1="7" y1="7.25" x2="7.01" y2="7.25" stroke-width="2.5"/><line x1="7" y1="16.75" x2="7.01" y2="16.75" stroke-width="2.5"/><line x1="12" y1="7.25" x2="17" y2="7.25"/><line x1="12" y1="16.75" x2="17" y2="16.75"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>',
    balancer: '<circle cx="5" cy="12" r="2.5"/><path d="M7.5 12h3.5M11 12c2.5 0 2.5-6 6-6M11 12c2.5 0 2.5 6 6 6M11 12h6"/><polyline points="15 3.8 17.5 6 15 8.2"/><polyline points="15 9.8 17.5 12 15 14.2"/><polyline points="15 15.8 17.5 18 15 20.2"/>',
    gateway:  '<rect x="3" y="3" width="6" height="18" rx="1.5"/><path d="M13 7h7M13 12h7M13 17h7"/><polyline points="17.5 4.8 20 7 17.5 9.2"/><polyline points="17.5 9.8 20 12 17.5 14.2"/><polyline points="17.5 14.8 20 17 17.5 19.2"/>',
    shield:   '<path d="M12 2.5 4.5 5.8v5.4c0 5.1 3.2 9.7 7.5 11.3 4.3-1.6 7.5-6.2 7.5-11.3V5.8L12 2.5Z"/><polyline points="9 12.2 11.2 14.4 15.5 9.8"/>',
    queue:    '<rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><line x1="7.5" y1="9.5" x2="7.5" y2="14.5"/><line x1="12" y1="9.5" x2="12" y2="14.5"/><line x1="16.5" y1="9.5" x2="16.5" y2="14.5"/>',
    code:     '<polyline points="8 8 4 12 8 16"/><polyline points="16 8 20 12 16 16"/><line x1="13.5" y1="6" x2="10.5" y2="18"/>',
    cpu:      '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="15" y1="18" x2="15" y2="22"/><line x1="2" y1="9" x2="6" y2="9"/><line x1="2" y1="15" x2="6" y2="15"/><line x1="18" y1="9" x2="22" y2="9"/><line x1="18" y1="15" x2="22" y2="15"/>',
    cache:    '<polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2"/>',
    search:   '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/>',
    user:     '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.5-3.8 4.3-5.8 7.5-5.8s6 2 7.5 5.8"/>',
    globe:    '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 3.8 9A14 14 0 0 1 12 21a14 14 0 0 1-3.8-9A14 14 0 0 1 12 3Z"/>',
    gear:     '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    lock:     '<rect x="4.5" y="11" width="15" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    alert:    '<path d="M10.3 3.9 1.8 18.2a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13.5"/><line x1="12" y1="17.2" x2="12.01" y2="17.2" stroke-width="2.5"/>',
    check:    '<polyline points="4.5 12.5 9.5 17.5 19.5 6.5"/>',
    replay:   '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/>',
    memory:   '<rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="6" x2="7" y2="18"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="17" y1="6" x2="17" y2="18"/><line x1="7" y1="2" x2="7" y2="6"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="17" y1="2" x2="17" y2="6"/>',
    terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2.2"/><polyline points="7 9.5 10.5 12.5 7 15.5"/><line x1="12.5" y1="15.5" x2="17" y2="15.5"/>',
    wifi:     '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2"/>',
    layers:   '<polygon points="12 2.5 2.5 7.5 12 12.5 21.5 7.5 12 2.5"/><polyline points="2.5 12.5 12 17.5 21.5 12.5"/><polyline points="2.5 17.5 12 22.5 21.5 17.5"/>',
    router:   '<rect x="2.5" y="13" width="19" height="7" rx="2"/><line x1="6.5" y1="16.5" x2="6.51" y2="16.5" stroke-width="2.6"/><line x1="10.5" y1="16.5" x2="10.51" y2="16.5" stroke-width="2.6"/><line x1="17" y1="13" x2="17" y2="6"/><path d="M13.8 8.5a4.5 4.5 0 0 1 6.4 0"/><path d="M12 6a7.5 7.5 0 0 1 10 0"/>',
    cloud:    '<path d="M6.5 19h11a4.5 4.5 0 0 0 .9-8.9A6 6 0 0 0 6.8 8.4 4.2 4.2 0 0 0 6.5 19Z"/>',
    firewall: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9.3" x2="21" y2="9.3"/><line x1="3" y1="14.7" x2="21" y2="14.7"/><line x1="9" y1="4" x2="9" y2="9.3"/><line x1="15" y1="9.3" x2="15" y2="14.7"/><line x1="9" y1="14.7" x2="9" y2="20"/>',
    packet:   '<rect x="2.5" y="6" width="19" height="12" rx="2"/><line x1="8.5" y1="6" x2="8.5" y2="18"/><line x1="15.5" y1="6" x2="15.5" y2="18"/>',
    key:      '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.8 12.2 20 3"/><path d="M16 7l3 3"/><path d="M18.5 4.5l2.5 2.5"/>',
    cert:     '<rect x="4" y="3" width="16" height="14" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M10.5 12.2 9.5 21l2.5-1.5L14.5 21l-1-8.8"/>',
    phone:    '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><line x1="11" y1="18.5" x2="13" y2="18.5" stroke-width="2.4"/>',
    sensor:   '<circle cx="12" cy="14" r="4"/><path d="M8.5 8.5a5 5 0 0 1 7 0"/><path d="M6 6a8.5 8.5 0 0 1 12 0"/>',
    stack:    '<rect x="4" y="4" width="16" height="4.2" rx="1.2"/><rect x="4" y="10" width="16" height="4.2" rx="1.2"/><rect x="4" y="16" width="16" height="4.2" rx="1.2"/>',
    binary:   '<rect x="4" y="5" width="5" height="6" rx="1.5"/><line x1="15" y1="5" x2="15" y2="11"/><rect x="13" y="13" width="5" height="6" rx="1.5"/><line x1="6.5" y1="13" x2="6.5" y2="19"/>'
  };

  function drawIconAt(name, cx, cy, size = 20, color = '#1d1b18', strokeWidth = 1.9) {
    const body = ICONS[name] || ICONS.server;
    const scale = size / 24;
    return `<g transform="translate(${A(cx - size / 2)} ${A(cy - size / 2)}) scale(${A(scale)})" fill="none" stroke="${color}" stroke-width="${A(strokeWidth / scale)}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  }

  /* ── SVG Defs Generator ── */
  function buildDefs(pal) {
    let grads = '';
    for (const [name, g] of Object.entries(pal.blocks)) {
      grads += `
        <linearGradient id="g-${name}-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${g.top[0]}"/>
          <stop offset="1" stop-color="${g.top[1]}"/>
        </linearGradient>
        <linearGradient id="g-${name}-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${g.side[0]}"/>
          <stop offset="1" stop-color="${g.side[1]}"/>
        </linearGradient>`;
    }
    return `
      ${grads}
      <linearGradient id="cyl-sheen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset="0.3" stop-color="#fff" stop-opacity="0.28"/>
        <stop offset="0.58" stop-color="#fff" stop-opacity="0.04"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.1"/>
      </linearGradient>
      <linearGradient id="screen-glare" x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0" stop-color="#fff" stop-opacity="0.35"/>
        <stop offset="0.48" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <filter id="blur-sm" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="blur-md" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="blur-lg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6.5"/></filter>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
      <marker id="arrow" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="5.4" markerHeight="5.4" orient="auto-start-reverse" markerUnits="strokeWidth">
        <path d="M1,1.3 L9,5 L1,8.7 Z" fill="${pal.ink}" stroke="${pal.ink}" stroke-width="1" stroke-linejoin="round"/>
      </marker>
      <marker id="arrow-muted" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse" markerUnits="strokeWidth">
        <path d="M1,1.3 L9,5 L1,8.7 Z" fill="${pal.muted}" stroke="${pal.muted}" stroke-width="1" stroke-linejoin="round"/>
      </marker>
      <marker id="arrow-red" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="5.4" markerHeight="5.4" orient="auto-start-reverse" markerUnits="strokeWidth">
        <path d="M1,1.3 L9,5 L1,8.7 Z" fill="#c0392b" stroke="#c0392b" stroke-width="1" stroke-linejoin="round"/>
      </marker>
      <marker id="arrow-green" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="5.4" markerHeight="5.4" orient="auto-start-reverse" markerUnits="strokeWidth">
        <path d="M1,1.3 L9,5 L1,8.7 Z" fill="#2f8a43" stroke="#2f8a43" stroke-width="1" stroke-linejoin="round"/>
      </marker>
      <pattern id="iso-grid" patternUnits="userSpaceOnUse" x="0" y="-7" width="28" height="14">
        <path d="M0 7 L14 0 L28 7 L14 14 Z" fill="none" stroke="${pal.gridStroke}" stroke-opacity="${pal.gridOpacity}" stroke-width="0.85"/>
      </pattern>`;
  }

  /* ── Tactile Pill Tag & CPU Meter Renderers ── */
  function pillDims(text, opts = {}) {
    const fontSize = opts.size || 10.5;
    const icon = opts.icon || null;
    const lines = String(text ?? '').split('\n');
    const lineH = Math.round(fontSize * 1.3);
    const maxTw = Math.max(...lines.map((l) => measureText(l, fontSize)));
    const iconPad = icon ? 15 : 0;
    const w = Math.max(38, maxTw + 20 + iconPad);
    const h = 21 + (lines.length - 1) * lineH;
    return { w, h, maxTw, iconPad, lines, lineH, fontSize };
  }

  function renderPill(cx, cy, text, opts = {}, pal = PALETTES.light) {
    const tone = pal.pills[opts.tone || 'paper'] || pal.pills.paper;
    const { w, h, maxTw, iconPad, lines, lineH, fontSize } = pillDims(text, opts);
    const x = cx - w / 2;
    const y = cy - h / 2;
    const icon = opts.icon || null;

    const textEls = lines
      .map((line, idx) => {
        const ty = cy + fontSize * 0.36 + (idx - (lines.length - 1) / 2) * lineH;
        return `<text x="${A(x + 10 + iconPad + maxTw / 2)}" y="${A(ty)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${tone.fg}">${esc(line)}</text>`;
      })
      .join('');

    return `
      <g class="pill">
        <rect x="${A(x + 1)}" y="${A(y + 2)}" width="${A(w)}" height="${A(h)}" rx="10.5" fill="${pal.drop}" opacity="0.88"/>
        <rect x="${A(x)}" y="${A(y)}" width="${A(w)}" height="${A(h)}" rx="10.5" fill="${tone.bg}" stroke="${tone.border}" stroke-width="1.35"/>
        ${icon ? drawIconAt(icon, x + 14.5, cy, 11.5, tone.fg, 2.2) : ''}
        ${textEls}
      </g>`;
  }

  function renderCpuPill(cx, cy, cpu, pal = PALETTES.light) {
    const pct = Math.round(clamp01(cpu) * 100);
    const barColor = cpu < 0.6 ? '#5fae57' : cpu < 0.85 ? '#e8a33a' : '#e5534b';
    const pillTone = pal.pills.paper;
    const w = 88, h = 21;
    const x = cx - w / 2, y = cy - h / 2;
    const barX = x + 23;
    return `
      <g class="pill">
        <rect x="${A(x + 1)}" y="${A(y + 2)}" width="${w}" height="${h}" rx="10.5" fill="${pal.drop}" opacity="0.88"/>
        <rect x="${A(x)}" y="${A(y)}" width="${w}" height="${h}" rx="10.5" fill="${pillTone.bg}" stroke="${pillTone.border}" stroke-width="1.35"/>
        ${drawIconAt('cpu', x + 12.5, cy, 11, pal.muted, 2.1)}
        <rect x="${A(barX)}" y="${A(cy - 3.5)}" width="28" height="7" rx="3.5" fill="${pal.cardLine}"/>
        <rect x="${A(barX)}" y="${A(cy - 3.5)}" width="${A(Math.max(3, 28 * clamp01(cpu)))}" height="7" rx="3.5" fill="${barColor}"/>
        <text x="${A(x + w - 8)}" y="${A(cy + 3.6)}" text-anchor="end" font-size="10.2" font-weight="800" fill="${pillTone.fg}">${pct}%</text>
      </g>`;
  }

  function renderFloorHalo(x0, x1, y0, y1, cx, cy, haloTone, pal) {
    if (!haloTone) return '';
    const col = pal.halo[haloTone] || pal.halo.green;
    const pad = 0.75;
    const pts = [
      iso(x0 - pad, y1 + pad, 0, cx, cy),
      iso(x1 + pad, y1 + pad, 0, cx, cy),
      iso(x1 + pad, y0 - pad, 0, cx, cy),
      iso(x0 - pad, y0 - pad, 0, cx, cy)
    ];
    return `<path d="${roundedPoly(pts, 10)}" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-opacity="0.65" stroke-width="1.6"/>`;
  }

  /* ── 3D Isometric Prism Geometry Builder ── */
  function buildPrism({ x0, x1, y0, y1, h, radius = 8, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 }) {
    const T = iso(x0, y1, h, cx, cy);
    const R = iso(x1, y1, h, cx, cy);
    const B = iso(x1, y0, h, cx, cy);
    const L = iso(x0, y0, h, cx, cy);
    const Rd = iso(x1, y1, 0, cx, cy);
    const Bd = iso(x1, y0, 0, cx, cy);
    const Ld = iso(x0, y0, 0, cx, cy);
    const p = Math.max(1.5, Math.min(radius, h / 2 - 0.5));
    const ty = iso(cx, cy, h, cx, cy)[1];
    const outline = [T, R, Rd, Bd, Ld, L];
    return {
      T, R, B, L, Rd, Bd, Ld, ty, outline,
      sil: roundedPoly(outline, [radius + 1, p, p, radius + 2, p, p]),
      top: roundedPoly([T, R, B, L], [radius + 1, p, 6, p]),
      right: roundedPoly([B, R, Rd, Bd], [6, p, p, radius + 2]),
      bevel: roundedOpenPath([L, B, R], 7)
    };
  }

  function renderPrismFaces(prism, colorName, pal, strokeW = 1.85) {
    const c = pal.blocks[colorName] ? colorName : 'blue';
    return `
      <path d="${prism.sil}" fill="url(#g-${c}-side)"/>
      <path d="${prism.right}" fill="#000" opacity="0.09"/>
      <path d="${prism.top}" fill="url(#g-${c}-top)"/>
      <path d="${prism.bevel}" transform="translate(0 1.4)" fill="none" stroke="#fff" stroke-opacity="0.62" stroke-width="1.45" stroke-linecap="round"/>
      <path d="${prism.sil}" fill="none" stroke="${pal.ink}" stroke-width="${strokeW}" stroke-linejoin="round"/>`;
  }

  function renderGroundShadow(prism, h, lift, alpha, pal) {
    const dy = Math.min(9, 3 + h * 0.14) + lift;
    const fade = 1 - Math.min(1, lift / 140) * 0.8;
    return `<path d="${prism.sil}" transform="translate(0 ${A(dy)})" fill="${pal.shadowFill}" opacity="${A(alpha * fade)}" filter="url(#blur-lg)"/>`;
  }

  function boundsOfPoints(pts, pad = [12, 12, 12, 12]) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [
      Math.min(...xs) - pad[0],
      Math.min(...ys) - pad[1],
      Math.max(...xs) + pad[2],
      Math.max(...ys) + pad[3]
    ];
  }

  function placeTagStack(cx, topY, botY, pillSpecs, placedPills, opts = {}) {
    if (!pillSpecs.length) return { html: '', minX: cx, maxX: cx, minY: topY, maxY: botY };
    let below = opts.below === true;
    if (!below && !opts.forceAbove) {
      const collidesAbove = pillSpecs.some((ps, idx) => {
        const testY = topY - idx * 25;
        return placedPills.some((p) => Math.abs(cx - p.x) < (ps.w + p.w) * 0.52 && Math.abs(testY - p.y) < 23);
      });
      if (collidesAbove) below = true;
    }
    let py = below ? botY : topY;
    const stepY = below ? 25 : -25;
    let html = '';
    let minX = cx, maxX = cx, minY = topY, maxY = botY;
    for (const ps of pillSpecs) {
      html += `<g transform="translate(0 ${A(py)})">${ps.svg}</g>`;
      placedPills.push({ x: cx, y: py, w: ps.w, h: ps.h || 22 });
      minX = Math.min(minX, cx - ps.w / 2 - 4);
      maxX = Math.max(maxX, cx + ps.w / 2 + 4);
      minY = Math.min(minY, py - 14);
      maxY = Math.max(maxY, py + 14);
      py += stepY;
    }
    return { html, minX, maxX, minY, maxY };
  }

  /* ── Entity Defaults ── */
  const ENTITY_DEFAULTS = {
    block:    { s: 4.2, h: 48, color: 'blue', glyph: 'server', label: [], sub: '', heat: 0, dead: 0, dim: 0, opacity: 1, lift: 0, cpu: -1, tags: [], pills: 'above', halo: '' },
    db:       { r: 1.75, h: 40, color: 'purple', glyph: 'database', label: '', sub: '', opacity: 1, lift: 0, heat: 0, cpu: -1, tags: [] },
    queue:    { d: 2.2, w: 6.0, h: 20, color: 'orange', n: 3, slots: 6, label: '', opacity: 1, lift: 0, tags: [] },
    device:   { d: 3.4, w: 3.8, kind: 'laptop', label: '', sub: '', opacity: 1, lift: 0, tags: [], halo: '' },
    crowd:    { x0: -12, x1: -8, y0: -2, y1: 2, count: 6, label: '', opacity: 1, lift: 0, tags: [] },
    zone:     { x0: -5, x1: 5, y0: -5, y1: 5, label: '', tone: 'paper', dashed: true, opacity: 1 },
    ring:     { x: 0, y: 0, r: 9.5, nodes: [], keys: [], label: '', opacity: 1 },
    panel:    { x: 0, y: 0, dx: 0, dy: 0, title: '', icon: 'code', tone: 'paper', lines: [], bars: [], opacity: 1, lift: 0 },
    ghost:    { s: 4.0, label: '', opacity: 1 },
    router:   { d: 2.8, w: 4.6, h: 22, color: 'teal', label: '', sub: '', wifi: true, heat: 0, cpu: -1, opacity: 1, lift: 0, tags: [], halo: '' },
    firewall: { d: 1.9, w: 4.6, h: 46, color: 'orange', glyph: 'shield', label: '', sub: '', heat: 0, opacity: 1, lift: 0, tags: [], halo: '' },
    cloud:    { rw: 66, rh: 34, color: 'blue', glyph: 'cloud', label: [], sub: '', heat: 0, opacity: 1, lift: 0, tags: [] },
    rack:     { s: 3.5, h: 62, slots: 3, color: 'blue', glyph: 'server', label: '', sub: '', heat: 0, dead: 0, cpu: -1, opacity: 1, lift: 0, tags: [], halo: '' },
    frame:    { x: 0, y: 0, dx: 0, dy: 0, title: '', icon: 'packet', cells: [], pointers: [], note: '', opacity: 1, lift: 0 }
  };

  /* ── Entity Renderers ── */
  const RENDERERS = {
    block(e, pal, placedPills = []) {
      const labels = Array.isArray(e.label) ? e.label : (e.label ? [String(e.label)] : []);
      const maxLen = Math.max(0, ...labels.map((l) => String(l).length), String(e.sub || '').length);
      const mainFs = maxLen > 18 ? 11.0 : 12.2;
      const subFs = maxLen > 22 ? 9.6 : 10.2;
      const maxTextPx = Math.max(
        ...labels.map((l) => measureText(l, mainFs)),
        e.sub ? measureText(e.sub, subFs) : 0,
        0
      );
      // Full silhouette width between y=L[1] and y=Ld[1] is effS * 2 * TILE.
      // Guarantee generous padding on both sides so text NEVER crosses a 3D prism edge.
      const effS = Math.max(e.s || 4.2, (maxTextPx * 1.1 + 32) / (2 * TILE));
      const h = Math.max(e.h || 48, (labels.length >= 2 || e.sub) ? 50 : 44);
      const half = effS / 2;
      const prism = buildPrism({
        x0: e.x - half, x1: e.x + half,
        y0: e.y - half, y1: e.y + half,
        h, radius: e.radius ?? 9
      });
      const lift = e.lift || 0;
      const cx = prism.T[0];
      const cy = prism.ty; // = L[1] = R[1] (top of full-width band)

      // Keep ALL text inside [cy + 8, cy + h - 8] (strictly full-width vertical wall!)
      let labelSvg = '';
      if (labels.length === 1 && !e.sub) {
        labelSvg = `<text x="${A(cx)}" y="${A(cy + h * 0.46)}" text-anchor="middle" font-size="${mainFs}" font-weight="800" fill="${pal.ink}">${esc(labels[0])}</text>`;
      } else if (labels.length === 1 && e.sub) {
        labelSvg = `
          <text x="${A(cx)}" y="${A(cy + h * 0.34)}" text-anchor="middle" font-size="${mainFs}" font-weight="800" fill="${pal.ink}">${esc(labels[0])}</text>
          <text x="${A(cx)}" y="${A(cy + h * 0.64)}" text-anchor="middle" font-size="${subFs}" font-weight="600" fill="${pal.ink2}">${esc(e.sub)}</text>`;
      } else if (labels.length >= 2) {
        labelSvg = `
          <text x="${A(cx)}" y="${A(cy + h * 0.34)}" text-anchor="middle" font-size="${mainFs}" font-weight="800" fill="${pal.ink}">${esc(labels[0])}</text>
          <text x="${A(cx)}" y="${A(cy + h * 0.64)}" text-anchor="middle" font-size="${subFs + 0.6}" font-weight="700" fill="${pal.ink2}">${esc(labels[1])}</text>`;
      }

      const iconSvg = e.glyph ? drawIconAt(e.glyph, cx, labels.length ? cy - 8 : cy + 4, effS >= 5.5 ? 22 : 19, pal.ink, 1.9) : '';
      const deadSvg = e.dead > 0.05
        ? `<g opacity="${A(e.dead)}" stroke="#c0392b" stroke-width="3.2" stroke-linecap="round">
             <path d="M${A(cx - 10)},${A(cy - 10)} L${A(cx + 10)},${A(cy + 10)} M${A(cx + 10)},${A(cy - 10)} L${A(cx - 10)},${A(cy + 10)}"/>
           </g>`
        : '';

      const body = `
        <g opacity="${A(e.opacity)}">
          ${renderFloorHalo(e.x - half, e.x + half, e.y - half, e.y + half, e.x, e.y, e.halo, pal)}
          ${renderGroundShadow(prism, h, lift, 0.24, pal)}
          <g transform="translate(0 ${A(-lift)})">
            ${e.heat > 0.02 ? `<g class="pulse"><path d="${prism.sil}" fill="#e5534b" opacity="${A(e.heat * 0.65)}" filter="url(#glow)"/></g>` : ''}
            ${renderPrismFaces(prism, e.color || 'blue', pal)}
            ${e.heat > 0.02 ? `<path d="${prism.sil}" fill="#e5534b" opacity="${A(e.heat * 0.24)}"/>` : ''}
            ${e.dead > 0.05 ? `<path d="${prism.sil}" fill="#8f877c" opacity="${A(e.dead * 0.55)}"/><path d="${prism.sil}" fill="none" stroke="${pal.ink}" stroke-width="1.85"/>` : ''}
            <g opacity="${A(1 - (e.dead || 0) * 0.45 - (e.dim || 0) * 0.35)}">
              ${e.dead > 0.5 ? '' : iconSvg}
              ${labelSvg}
            </g>
            ${deadSvg}
          </g>
        </g>`;

      const pillSpecs = [];
      if (e.cpu >= 0) pillSpecs.push({ svg: renderCpuPill(cx, 0, e.cpu, pal), w: 92, h: 22 });
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(cx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(cx, prism.T[1] - lift - 16, prism.Bd[1] - lift + 19, pillSpecs, placedPills, { below: e.pills === 'below' });
      const over = stack.html ? `<g opacity="${A(e.opacity)}">${stack.html}</g>` : '';

      const poly = prism.outline.map(([px, py0]) => [px, py0 - lift]);
      const baseB = boundsOfPoints(poly, [18, 16, 18, 18]);
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], stack.minX), Math.min(baseB[1], stack.minY), Math.max(baseB[2], stack.maxX), Math.max(baseB[3], stack.maxY)]
      };
    },

    /* ── NEW: 2.5D Isometric Network Router (Protocol Explorer-inspired) ── */
    router(e, pal, placedPills = []) {
      const d = (e.d || 2.8) / 2;
      const w = (e.w || 4.6) / 2;
      const h = e.h || 22;
      const prism = buildPrism({
        x0: e.x - d, x1: e.x + d,
        y0: e.y - w, y1: e.y + w,
        h, radius: 5, cx: e.x, cy: e.y
      });
      const lift = e.lift || 0;
      const cx = prism.T[0];
      const c = pal.blocks[e.color || 'teal'] ? (e.color || 'teal') : 'teal';

      // Two antennas rising from back-right / back-left top corners
      const ant1Base = [lerp(prism.T[0], prism.R[0], 0.35), lerp(prism.T[1], prism.R[1], 0.35)];
      const ant2Base = [lerp(prism.T[0], prism.L[0], 0.35), lerp(prism.T[1], prism.L[1], 0.35)];
      const antH = 24;
      const antennasSvg = `
        <g stroke="${pal.ink}" stroke-linecap="round" fill="none">
          <line x1="${A(ant2Base[0])}" y1="${A(ant2Base[1])}" x2="${A(ant2Base[0] - 4)}" y2="${A(ant2Base[1] - antH)}" stroke-width="2.4"/>
          <circle cx="${A(ant2Base[0] - 4)}" cy="${A(ant2Base[1] - antH - 2)}" r="2.2" fill="${pal.ink}"/>
          <line x1="${A(ant1Base[0])}" y1="${A(ant1Base[1])}" x2="${A(ant1Base[0] + 4)}" y2="${A(ant1Base[1] - antH)}" stroke-width="2.4"/>
          <circle cx="${A(ant1Base[0] + 4)}" cy="${A(ant1Base[1] - antH - 2)}" r="2.2" fill="${pal.ink}"/>
          ${e.wifi !== false ? `
            <path d="M${A(ant1Base[0] - 2)},${A(ant1Base[1] - antH - 7)} Q${A(ant1Base[0] + 4)},${A(ant1Base[1] - antH - 12)} ${A(ant1Base[0] + 10)},${A(ant1Base[1] - antH - 7)}" stroke-width="1.35" opacity="0.7"/>
            <path d="M${A(ant1Base[0] - 5)},${A(ant1Base[1] - antH - 11)} Q${A(ant1Base[0] + 4)},${A(ant1Base[1] - antH - 18)} ${A(ant1Base[0] + 13)},${A(ant1Base[1] - antH - 11)}" stroke-width="1.2" opacity="0.45"/>
          ` : ''}
        </g>`;

      // Front-left face LEDs (3 status dots along L->B at mid-height)
      const ledColors = e.heat > 0.4 ? ['#e5534b', '#e5534b', '#f59e0b'] : ['#4caf50', '#4caf50', '#f59e0b'];
      let ledsSvg = '';
      for (let i = 0; i < 3; i++) {
        const t = 0.25 + i * 0.22;
        const lx = lerp(prism.L[0], prism.B[0], t);
        const ly = lerp(prism.L[1], prism.B[1], t) + h * 0.52;
        ledsSvg += `<circle cx="${A(lx)}" cy="${A(ly)}" r="2.3" fill="${ledColors[i]}" stroke="${pal.ink}" stroke-width="0.9"/>`;
      }

      // Front-right face Ethernet ports (3 small isometric port cutouts along B->R)
      let portsSvg = '';
      for (let i = 0; i < 3; i++) {
        const t0 = 0.18 + i * 0.24;
        const t1 = t0 + 0.15;
        const px0 = lerp(prism.B[0], prism.R[0], t0);
        const py0 = lerp(prism.B[1], prism.R[1], t0) + h * 0.34;
        const px1 = lerp(prism.B[0], prism.R[0], t1);
        const py1 = lerp(prism.B[1], prism.R[1], t1) + h * 0.34;
        portsSvg += `<polygon points="${A(px0)},${A(py0)} ${A(px1)},${A(py1)} ${A(px1)},${A(py1 + h * 0.42)} ${A(px0)},${A(py0 + h * 0.42)}" fill="${pal.ink}" opacity="0.72"/>`;
      }

      // Top face routing arrows emblem
      const topCx = (prism.T[0] + prism.B[0]) / 2;
      const topCy = (prism.T[1] + prism.B[1]) / 2;
      const topMark = `
        <g stroke="${pal.ink}" stroke-width="1.5" stroke-linecap="round" opacity="0.78">
          <line x1="${A(topCx - 11)}" y1="${A(topCy)}" x2="${A(topCx + 11)}" y2="${A(topCy)}"/>
          <polyline points="${A(topCx + 7)},${A(topCy - 3)} ${A(topCx + 11)},${A(topCy)} ${A(topCx + 7)},${A(topCy + 3)}" fill="none"/>
          <polyline points="${A(topCx - 7)},${A(topCy - 3)} ${A(topCx - 11)},${A(topCy)} ${A(topCx - 7)},${A(topCy + 3)}" fill="none"/>
        </g>`;

      const body = `
        <g opacity="${A(e.opacity)}">
          ${renderFloorHalo(e.x - d, e.x + d, e.y - w, e.y + w, e.x, e.y, e.halo, pal)}
          ${renderGroundShadow(prism, h, lift, 0.24, pal)}
          <g transform="translate(0 ${A(-lift)})">
            ${e.heat > 0.02 ? `<g class="pulse"><path d="${prism.sil}" fill="#e5534b" opacity="${A(e.heat * 0.6)}" filter="url(#glow)"/></g>` : ''}
            ${antennasSvg}
            ${renderPrismFaces(prism, c, pal)}
            ${topMark}
            ${ledsSvg}
            ${portsSvg}
          </g>
        </g>`;

      let over = '';
      let minX = prism.L[0], maxX = prism.R[0], minY = ant1Base[1] - antH - 18 - lift, maxY = prism.Bd[1] - lift;
      if (e.label) {
        const lblText = e.sub ? `${e.label} · ${e.sub}` : String(e.label);
        const dim = pillDims(lblText, { icon: 'router' });
        const ly = prism.Bd[1] - lift + 18;
        over += renderPill(cx, ly, lblText, { icon: 'router', tone: 'paper' }, pal);
        placedPills.push({ x: cx, y: ly, w: dim.w, h: dim.h });
        minX = Math.min(minX, cx - dim.w / 2 - 4);
        maxX = Math.max(maxX, cx + dim.w / 2 + 4);
        maxY = Math.max(maxY, ly + dim.h / 2 + 4);
      }
      const pillSpecs = [];
      if (e.cpu >= 0) pillSpecs.push({ svg: renderCpuPill(cx, 0, e.cpu, pal), w: 92, h: 22 });
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(cx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(cx, ant1Base[1] - antH - 22 - lift, maxY + 24, pillSpecs, placedPills, { forceAbove: true });
      over += stack.html;
      if (over) over = `<g opacity="${A(e.opacity)}">${over}</g>`;

      const poly = prism.outline.map(([px, py0]) => [px, py0 - lift]);
      const baseB = boundsOfPoints(poly, [16, 40, 16, 16]);
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], minX, stack.minX), Math.min(baseB[1], minY, stack.minY), Math.max(baseB[2], maxX, stack.maxX), Math.max(baseB[3], maxY, stack.maxY)]
      };
    },

    /* ── NEW: 2.5D Isometric Firewall / TLS Security Barrier ── */
    firewall(e, pal, placedPills = []) {
      const d = (e.d || 1.9) / 2;
      const w = (e.w || 4.6) / 2;
      const h = e.h || 46;
      const prism = buildPrism({
        x0: e.x - d, x1: e.x + d,
        y0: e.y - w, y1: e.y + w,
        h, radius: 5, cx: e.x, cy: e.y
      });
      const lift = e.lift || 0;
      const cx = prism.T[0];
      const c = pal.blocks[e.color || 'orange'] ? (e.color || 'orange') : 'orange';

      // Isometric brick masonry mortar lines on front-left & front-right faces
      let brickLines = '';
      const courses = 3;
      for (let k = 1; k < courses; k++) {
        const dy = (h * k) / courses;
        brickLines += `<line x1="${A(prism.L[0])}" y1="${A(prism.L[1] + dy)}" x2="${A(prism.B[0])}" y2="${A(prism.B[1] + dy)}" stroke="${pal.ink}" stroke-opacity="0.32" stroke-width="1.15"/>`;
        brickLines += `<line x1="${A(prism.B[0])}" y1="${A(prism.B[1] + dy)}" x2="${A(prism.R[0])}" y2="${A(prism.R[1] + dy)}" stroke="${pal.ink}" stroke-opacity="0.32" stroke-width="1.15"/>`;
      }
      for (let k = 0; k < courses; k++) {
        const dy0 = (h * k) / courses;
        const dy1 = (h * (k + 1)) / courses;
        const offsets = k % 2 === 0 ? [0.33, 0.67] : [0.5];
        for (const t of offsets) {
          const rx = lerp(prism.B[0], prism.R[0], t);
          const ry = lerp(prism.B[1], prism.R[1], t);
          brickLines += `<line x1="${A(rx)}" y1="${A(ry + dy0)}" x2="${A(rx)}" y2="${A(ry + dy1)}" stroke="${pal.ink}" stroke-opacity="0.3" stroke-width="1.1"/>`;
        }
      }

      // Centered circular shield/lock emblem on front crest
      const badgeX = prism.B[0];
      const badgeY = prism.B[1] + h * 0.42;
      const emblemSvg = `
        <g>
          <circle cx="${A(badgeX)}" cy="${A(badgeY)}" r="15.5" fill="${pal.cardBg}" stroke="${pal.ink}" stroke-width="1.7"/>
          ${drawIconAt(e.glyph || 'shield', badgeX, badgeY, 17, pal.ink, 2.0)}
        </g>`;

      const body = `
        <g opacity="${A(e.opacity)}">
          ${renderFloorHalo(e.x - d, e.x + d, e.y - w, e.y + w, e.x, e.y, e.halo, pal)}
          ${renderGroundShadow(prism, h, lift, 0.24, pal)}
          <g transform="translate(0 ${A(-lift)})">
            ${e.heat > 0.02 ? `<g class="pulse"><path d="${prism.sil}" fill="#e5534b" opacity="${A(e.heat * 0.65)}" filter="url(#glow)"/></g>` : ''}
            ${renderPrismFaces(prism, c, pal)}
            ${brickLines}
            ${emblemSvg}
          </g>
        </g>`;

      let over = '';
      let minX = prism.L[0], maxX = prism.R[0], minY = prism.T[1] - lift, maxY = prism.Bd[1] - lift;
      if (e.label) {
        const lblText = e.sub ? `${e.label} · ${e.sub}` : String(e.label);
        const dim = pillDims(lblText, { icon: e.glyph || 'shield' });
        const ly = prism.Bd[1] - lift + 18;
        over += renderPill(cx, ly, lblText, { icon: e.glyph || 'shield', tone: 'paper' }, pal);
        placedPills.push({ x: cx, y: ly, w: dim.w, h: dim.h });
        minX = Math.min(minX, cx - dim.w / 2 - 4);
        maxX = Math.max(maxX, cx + dim.w / 2 + 4);
        maxY = Math.max(maxY, ly + dim.h / 2 + 4);
      }
      const pillSpecs = [];
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(cx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(cx, prism.T[1] - lift - 16, maxY + 24, pillSpecs, placedPills, { forceAbove: true });
      over += stack.html;
      if (over) over = `<g opacity="${A(e.opacity)}">${over}</g>`;

      const poly = prism.outline.map(([px, py0]) => [px, py0 - lift]);
      const baseB = boundsOfPoints(poly, [18, 16, 18, 18]);
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], minX, stack.minX), Math.min(baseB[1], minY, stack.minY), Math.max(baseB[2], maxX, stack.maxX), Math.max(baseB[3], maxY, stack.maxY)]
      };
    },

    /* ── NEW: 2.5D Isometric Network Cloud (Internet / WAN / Packet Loss) ── */
    cloud(e, pal, placedPills = []) {
      const labels = Array.isArray(e.label) ? e.label : (e.label ? [String(e.label)] : []);
      const mainFs = 11.8;
      const subFs = 9.8;
      const maxTextPx = Math.max(
        ...labels.map((l) => measureText(l, mainFs)),
        e.sub ? measureText(e.sub, subFs) : 0,
        0
      );
      const rw = Math.max(e.rw || 68, maxTextPx * 0.62 + 30);
      const rh = Math.max(e.rh || 36, (labels.length >= 2 || e.sub) ? 40 : 34);
      const [cx, baseY] = iso(e.x, e.y, 14);
      const lift = e.lift || 0;
      const cy = baseY - lift;
      const c = pal.blocks[e.color || 'blue'] ? (e.color || 'blue') : 'blue';

      // Smooth puffy cloud path scaled to rw x rh
      const cloudPath = (ox, oy) => {
        const w = rw, h = rh;
        return `M ${A(ox - w * 0.58)},${A(oy + h * 0.56)}
                C ${A(ox - w * 1.05)},${A(oy + h * 0.56)} ${A(ox - w * 1.08)},${A(oy - h * 0.25)} ${A(ox - w * 0.56)},${A(oy - h * 0.34)}
                C ${A(ox - w * 0.44)},${A(oy - h * 0.96)} ${A(ox + w * 0.16)},${A(oy - h * 1.02)} ${A(ox + w * 0.32)},${A(oy - h * 0.46)}
                C ${A(ox + w * 0.78)},${A(oy - h * 0.58)} ${A(ox + w * 1.08)},${A(oy - h * 0.04)} ${A(ox + w * 0.84)},${A(oy + h * 0.38)}
                C ${A(ox + w * 0.78)},${A(oy + h * 0.56)} ${A(ox + w * 0.52)},${A(oy + h * 0.56)} ${A(ox + w * 0.44)},${A(oy + h * 0.56)} Z`;
      };

      const pMain = cloudPath(cx, cy);
      const pDepth = cloudPath(cx, cy + 7);

      let labelSvg = '';
      if (labels.length === 1 && !e.sub) {
        labelSvg = `<text x="${A(cx)}" y="${A(cy + 10)}" text-anchor="middle" font-size="${mainFs}" font-weight="800" fill="${pal.ink}">${esc(labels[0])}</text>`;
      } else if (labels.length === 1 && e.sub) {
        labelSvg = `
          <text x="${A(cx)}" y="${A(cy + 4)}" text-anchor="middle" font-size="${mainFs}" font-weight="800" fill="${pal.ink}">${esc(labels[0])}</text>
          <text x="${A(cx)}" y="${A(cy + 17)}" text-anchor="middle" font-size="${subFs}" font-weight="600" fill="${pal.ink2}">${esc(e.sub)}</text>`;
      } else if (labels.length >= 2) {
        labelSvg = `
          <text x="${A(cx)}" y="${A(cy + 4)}" text-anchor="middle" font-size="${mainFs}" font-weight="800" fill="${pal.ink}">${esc(labels[0])}</text>
          <text x="${A(cx)}" y="${A(cy + 17)}" text-anchor="middle" font-size="${subFs + 0.6}" font-weight="700" fill="${pal.ink2}">${esc(labels[1])}</text>`;
      }

      const body = `
        <g opacity="${A(e.opacity)}">
          <ellipse cx="${A(cx)}" cy="${A(cy + rh * 0.85 + 8)}" rx="${A(rw * 0.85)}" ry="${A(rh * 0.32)}" fill="${pal.shadowFill}" opacity="0.2" filter="url(#blur-lg)"/>
          ${e.heat > 0.02 ? `<g class="pulse"><path d="${pMain}" fill="#e5534b" opacity="${A(e.heat * 0.55)}" filter="url(#glow)"/></g>` : ''}
          <path d="${pDepth}" fill="url(#g-${c}-side)" stroke="${pal.ink}" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="${pMain}" fill="url(#g-${c}-top)" stroke="${pal.ink}" stroke-width="1.85" stroke-linejoin="round"/>
          ${e.glyph ? drawIconAt(e.glyph, cx, cy - rh * 0.42, 16, pal.ink, 1.8) : ''}
          ${labelSvg}
        </g>`;

      const pillSpecs = [];
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(cx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(cx, cy - rh - 12, cy + rh * 0.72 + 24, pillSpecs, placedPills, { forceAbove: true });
      const over = stack.html ? `<g opacity="${A(e.opacity)}">${stack.html}</g>` : '';

      const poly = [];
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12;
        poly.push([cx + rw * 0.94 * Math.cos(a), cy + rh * 0.68 * Math.sin(a)]);
      }
      const baseB = [cx - rw - 12, cy - rh - 10, cx + rw + 12, cy + rh * 0.75 + 16];
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], stack.minX), Math.min(baseB[1], stack.minY), Math.max(baseB[2], stack.maxX), Math.max(baseB[3], stack.maxY)]
      };
    },

    /* ── NEW: 2.5D Isometric Multi-Blade Server Rack Tower ── */
    rack(e, pal, placedPills = []) {
      const s = e.s || 3.5;
      const half = s / 2;
      const h = e.h || 62;
      const slots = Math.max(2, Math.min(5, e.slots || 3));
      const prism = buildPrism({
        x0: e.x - half, x1: e.x + half,
        y0: e.y - half, y1: e.y + half,
        h, radius: 6
      });
      const lift = e.lift || 0;
      const cx = prism.T[0];
      const cy = prism.ty;
      const c = pal.blocks[e.color || 'blue'] ? (e.color || 'blue') : 'blue';

      // Horizontal blade bay seams + glowing LED status dot per server bay
      let baysSvg = '';
      for (let i = 1; i < slots; i++) {
        const dy = (h * i) / slots;
        baysSvg += `<line x1="${A(prism.L[0] + 1)}" y1="${A(prism.L[1] + dy)}" x2="${A(prism.B[0])}" y2="${A(prism.B[1] + dy)}" stroke="${pal.ink}" stroke-opacity="0.55" stroke-width="1.35"/>`;
        baysSvg += `<line x1="${A(prism.B[0])}" y1="${A(prism.B[1] + dy)}" x2="${A(prism.R[0] - 1)}" y2="${A(prism.R[1] + dy)}" stroke="${pal.ink}" stroke-opacity="0.45" stroke-width="1.25"/>`;
      }
      for (let i = 0; i < slots; i++) {
        const midDy = (h * (i + 0.52)) / slots;
        const ledX = lerp(prism.L[0], prism.B[0], 0.24);
        const ledY = lerp(prism.L[1], prism.B[1], 0.24) + midDy;
        const ledCol = e.dead > 0.5 ? '#8f877c' : (e.heat > 0.45 || (e.cpu >= 0.85)) ? '#e5534b' : (e.cpu >= 0.6 ? '#f59e0b' : '#4caf50');
        baysSvg += `<circle cx="${A(ledX)}" cy="${A(ledY)}" r="2.4" fill="${ledCol}" stroke="${pal.ink}" stroke-width="0.9"/>`;
        // Front vent bar on left face
        const vx0 = lerp(prism.L[0], prism.B[0], 0.44);
        const vy0 = lerp(prism.L[1], prism.B[1], 0.44) + midDy;
        const vx1 = lerp(prism.L[0], prism.B[0], 0.82);
        const vy1 = lerp(prism.L[1], prism.B[1], 0.82) + midDy;
        baysSvg += `<line x1="${A(vx0)}" y1="${A(vy0)}" x2="${A(vx1)}" y2="${A(vy1)}" stroke="${pal.ink}" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>`;
      }

      const body = `
        <g opacity="${A(e.opacity)}">
          ${renderFloorHalo(e.x - half, e.x + half, e.y - half, e.y + half, e.x, e.y, e.halo, pal)}
          ${renderGroundShadow(prism, h, lift, 0.26, pal)}
          <g transform="translate(0 ${A(-lift)})">
            ${e.heat > 0.02 ? `<g class="pulse"><path d="${prism.sil}" fill="#e5534b" opacity="${A(e.heat * 0.65)}" filter="url(#glow)"/></g>` : ''}
            ${renderPrismFaces(prism, c, pal)}
            ${baysSvg}
            ${drawIconAt(e.glyph || 'server', cx, cy, 19, pal.ink, 1.85)}
          </g>
        </g>`;

      let over = '';
      let minX = prism.L[0], maxX = prism.R[0], minY = prism.T[1] - lift, maxY = prism.Bd[1] - lift;
      if (e.label) {
        const lblText = e.sub ? `${e.label} · ${e.sub}` : String(e.label);
        const dim = pillDims(lblText, { icon: e.glyph || 'server' });
        const ly = prism.Bd[1] - lift + 18;
        over += renderPill(cx, ly, lblText, { icon: e.glyph || 'server', tone: 'paper' }, pal);
        placedPills.push({ x: cx, y: ly, w: dim.w, h: dim.h });
        minX = Math.min(minX, cx - dim.w / 2 - 4);
        maxX = Math.max(maxX, cx + dim.w / 2 + 4);
        maxY = Math.max(maxY, ly + dim.h / 2 + 4);
      }
      const pillSpecs = [];
      if (e.cpu >= 0) pillSpecs.push({ svg: renderCpuPill(cx, 0, e.cpu, pal), w: 92, h: 22 });
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(cx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(cx, prism.T[1] - lift - 16, maxY + 24, pillSpecs, placedPills, { forceAbove: true });
      over += stack.html;
      if (over) over = `<g opacity="${A(e.opacity)}">${over}</g>`;

      const poly = prism.outline.map(([px, py0]) => [px, py0 - lift]);
      const baseB = boundsOfPoints(poly, [16, 16, 16, 16]);
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], minX, stack.minX), Math.min(baseB[1], minY, stack.minY), Math.max(baseB[2], maxX, stack.maxX), Math.max(baseB[3], maxY, stack.maxY)]
      };
    },

    /* ── NEW: Packet / Byte / Memory Frame Inspector Strip (Protocol Explorer-inspired) ── */
    frame(e, pal) {
      const [bx, by] = iso(e.x || 0, e.y || 0, 0);
      const cx = bx + (e.dx || 0);
      const topY = by + (e.dy || 0) - (e.lift || 0);
      const cells = (e.cells || []).map((c) => (typeof c === 'string' ? { label: c } : c));
      const pointers = e.pointers || [];
      const hasSub = cells.some((c) => c.sub);
      const cellH = hasSub ? 40 : 28;
      const cellGap = 5;

      const cellWidths = cells.map((c) => {
        const lw = measureText(c.label || '', 10.6);
        const sw = c.sub ? measureText(c.sub, 9.2) : 0;
        return Math.max(54, Math.max(lw, sw) + 18);
      });
      const totalCellsW = cellWidths.reduce((s, w) => s + w, 0) + Math.max(0, cells.length - 1) * cellGap;
      const titleW = measureText((e.title || 'FRAME').toUpperCase(), 10.8) + 46;
      const noteW = e.note ? measureText(e.note, 9.8) + 26 : 0;
      const w = Math.max(190, totalCellsW + 24, titleW, noteW);
      const x = cx - w / 2;
      const ptrH = pointers.length ? 26 : 0;
      const noteH = e.note ? 18 : 0;
      const h = 28 + 10 + cellH + ptrH + noteH + 10;

      let cellsSvg = '';
      let curX = x + (w - totalCellsW) / 2;
      const cellY = topY + 36;
      const cellCenters = [];
      cells.forEach((c, idx) => {
        const cw = cellWidths[idx];
        const tone = pal.pills[c.tone || 'paper'] || pal.pills.paper;
        const isAct = !!c.active;
        const cyOff = isAct ? -2 : 0;
        cellsSvg += `
          <g>
            ${isAct ? `<rect x="${A(curX + 1)}" y="${A(cellY + cyOff + 2.5)}" width="${A(cw)}" height="${A(cellH)}" rx="7" fill="${pal.drop}" opacity="0.82"/>` : ''}
            <rect x="${A(curX)}" y="${A(cellY + cyOff)}" width="${A(cw)}" height="${A(cellH)}" rx="7" fill="${tone.bg}" stroke="${tone.border}" stroke-width="${isAct ? '1.8' : '1.25'}"/>
            <text x="${A(curX + cw / 2)}" y="${A(cellY + cyOff + (hasSub ? 16 : 18))}" text-anchor="middle" font-size="10.6" font-weight="800" fill="${tone.fg}">${esc(c.label || '')}</text>
            ${c.sub ? `<text x="${A(curX + cw / 2)}" y="${A(cellY + cyOff + 31)}" text-anchor="middle" font-size="9.2" font-weight="600" fill="${tone.fg}" opacity="0.86">${esc(c.sub)}</text>` : ''}
          </g>`;
        cellCenters.push(curX + cw / 2);
        curX += cw + cellGap;
      });

      let ptrsSvg = '';
      if (pointers.length) {
        const pBaseY = cellY + cellH + 5;
        for (const p of pointers) {
          const px = cellCenters[p.idx] ?? cx;
          const pTone = pal.pills[p.tone || 'blue'] || pal.pills.blue;
          ptrsSvg += `
            <g>
              <line x1="${A(px)}" y1="${A(pBaseY + 9)}" x2="${A(px)}" y2="${A(pBaseY + 1)}" stroke="${pTone.fg}" stroke-width="1.6"/>
              <polygon points="${A(px - 3.5)},${A(pBaseY + 4.5)} ${A(px)},${A(pBaseY - 0.5)} ${A(px + 3.5)},${A(pBaseY + 4.5)}" fill="${pTone.fg}"/>
              <text x="${A(px)}" y="${A(pBaseY + 20)}" text-anchor="middle" font-size="9.6" font-weight="800" fill="${pTone.fg}">${esc(p.label || '')}</text>
            </g>`;
        }
      }

      const noteSvg = e.note
        ? `<text x="${A(x + w / 2)}" y="${A(topY + h - 8)}" text-anchor="middle" font-size="9.6" font-weight="600" fill="${pal.muted}">${esc(e.note)}</text>`
        : '';

      const over = `
        <g class="frame-card" opacity="${A(e.opacity)}">
          <rect x="${A(x + 2)}" y="${A(topY + 3)}" width="${A(w)}" height="${A(h)}" rx="10" fill="${pal.drop}" opacity="0.86"/>
          <rect x="${A(x)}" y="${A(topY)}" width="${A(w)}" height="${A(h)}" rx="10" fill="${pal.cardBg}" stroke="${pal.ink}" stroke-width="1.5"/>
          <line x1="${A(x)}" y1="${A(topY + 26)}" x2="${A(x + w)}" y2="${A(topY + 26)}" stroke="${pal.cardLine}" stroke-width="1.2"/>
          ${drawIconAt(e.icon || 'packet', x + 15, topY + 13, 13, pal.ink, 2)}
          <text x="${A(x + 28)}" y="${A(topY + 17)}" font-size="10.6" font-weight="800" letter-spacing="0.03em" fill="${pal.ink}">${esc((e.title || 'FRAME').toUpperCase())}</text>
          ${cellsSvg}
          ${ptrsSvg}
          ${noteSvg}
        </g>`;
      return {
        body: '',
        over,
        poly: [[x, topY], [x + w, topY], [x + w, topY + h], [x, topY + h]],
        bounds: [x - 8, topY - 8, x + w + 8, topY + h + 8],
        obstacle: { x: x + w / 2, y: topY + h / 2, w: w + 10, h: h + 10 }
      };
    },

    db(e, pal, placedPills = []) {
      const rx = Math.SQRT2 * TILE * (e.r || 1.75);
      const ry = rx / 2;
      const [cx, baseY] = iso(e.x, e.y, 0);
      const lift = e.lift || 0;
      const botY = baseY - lift;
      const topY = botY - (e.h || 40);
      const bodyPath = `M${A(cx - rx)},${A(topY)} V${A(botY)} A${A(rx)},${A(ry)} 0 0 0 ${A(cx + rx)},${A(botY)} V${A(topY)} Z`;
      const outlinePath = `M${A(cx - rx)},${A(topY)} V${A(botY)} A${A(rx)},${A(ry)} 0 0 0 ${A(cx + rx)},${A(botY)} V${A(topY)}`;
      const c = pal.blocks[e.color || 'purple'] ? (e.color || 'purple') : 'purple';

      const fillLevel = e.cpu >= 0 ? clamp01(e.cpu) : (e.fill ? clamp01(e.fill) : 0);
      let fillSvg = '';
      if (fillLevel > 0.02) {
        const fy = botY - fillLevel * (e.h || 40);
        const [fBg, fLine] = fillLevel < 0.65 ? ['#cfe8c0', '#4caf50'] : fillLevel < 0.85 ? ['#f9dca3', '#d99a2b'] : ['#f5bdb2', '#d9473d'];
        const fPath = `M${A(cx - rx)},${A(fy)} A${A(rx)},${A(ry)} 0 0 0 ${A(cx + rx)},${A(fy)} V${A(botY)} A${A(rx)},${A(ry)} 0 0 1 ${A(cx - rx)},${A(botY)} Z`;
        fillSvg = `<path d="${fPath}" fill="${fBg}" opacity="0.82"/><path d="M${A(cx - rx + 1)},${A(fy)} A${A(rx - 1)},${A(ry - 0.5)} 0 0 0 ${A(cx + rx - 1)},${A(fy)}" fill="none" stroke="${fLine}" stroke-width="1.5"/>`;
      }

      const body = `
        <g opacity="${A(e.opacity)}">
          <ellipse cx="${A(cx)}" cy="${A(baseY + 5)}" rx="${A(rx + 3)}" ry="${A(ry + 1.5)}" fill="${pal.shadowFill}" opacity="0.22" filter="url(#blur-md)"/>
          ${e.heat > 0.02 ? `<g class="pulse"><path d="${bodyPath}" fill="#e5534b" opacity="${A(e.heat * 0.65)}" filter="url(#glow)"/></g>` : ''}
          <path d="${bodyPath}" fill="url(#g-${c}-side)"/>
          ${fillSvg}
          <path d="${bodyPath}" fill="url(#cyl-sheen)"/>
          <ellipse cx="${A(cx)}" cy="${A(topY)}" rx="${A(rx)}" ry="${A(ry)}" fill="url(#g-${c}-top)"/>
          <path d="M${A(cx - rx + 3)},${A(topY + 2)} A${A(rx - 3)},${A(ry - 1.5)} 0 0 0 ${A(cx + rx - 3)},${A(topY + 2)}" fill="none" stroke="#fff" stroke-opacity="0.65" stroke-width="1.4"/>
          <path d="${outlinePath}" fill="none" stroke="${pal.ink}" stroke-width="1.85" stroke-linejoin="round"/>
          <ellipse cx="${A(cx)}" cy="${A(topY)}" rx="${A(rx)}" ry="${A(ry)}" fill="none" stroke="${pal.ink}" stroke-width="1.85"/>
          ${drawIconAt(e.glyph || 'database', cx, topY + ry + (e.h || 40) * 0.42, 18, pal.ink, 1.8)}
        </g>`;

      let over = '';
      let minX = cx - rx, maxX = cx + rx, minY = topY - ry, maxY = botY + ry;
      if (e.label) {
        const lblText = e.sub ? `${e.label} · ${e.sub}` : String(e.label);
        const dim = pillDims(lblText, { icon: 'database' });
        const ly = botY + ry + 16;
        over += renderPill(cx, ly, lblText, { icon: 'database', tone: 'paper' }, pal);
        placedPills.push({ x: cx, y: ly, w: dim.w, h: dim.h });
        minX = Math.min(minX, cx - dim.w / 2 - 4);
        maxX = Math.max(maxX, cx + dim.w / 2 + 4);
        maxY = Math.max(maxY, ly + dim.h / 2 + 4);
      }
      const pillSpecs = [];
      if (e.cpu >= 0) pillSpecs.push({ svg: renderCpuPill(cx, 0, e.cpu, pal), w: 92, h: 22 });
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(cx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(cx, topY - ry - 15, maxY + 24, pillSpecs, placedPills, { forceAbove: true });
      over += stack.html;
      if (over) over = `<g opacity="${A(e.opacity)}">${over}</g>`;

      const poly = [];
      for (let i = 0; i <= 8; i++) poly.push([cx - rx * Math.cos((Math.PI * i) / 8), topY - ry * Math.sin((Math.PI * i) / 8)]);
      for (let i = 0; i <= 8; i++) poly.push([cx + rx * Math.cos((Math.PI * i) / 8), botY + ry * Math.sin((Math.PI * i) / 8)]);
      const baseB = boundsOfPoints(poly, [16, 16, 16, 14]);

      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], minX, stack.minX), Math.min(baseB[1], minY, stack.minY), Math.max(baseB[2], maxX, stack.maxX), Math.max(baseB[3], maxY, stack.maxY)]
      };
    },

    queue(e, pal, placedPills = []) {
      const d = (e.d || 2.2) / 2;
      const w = (e.w || 5.6) / 2;
      const h = e.h || 20;
      const prism = buildPrism({
        x0: e.x - d, x1: e.x + d,
        y0: e.y - w, y1: e.y + w,
        h, radius: 6, cx: e.x, cy: e.y
      });
      const lift = e.lift || 0;
      const slots = e.slots || 6;
      const filled = Math.min(slots, Math.max(0, e.n ?? 3));
      const slotStep = ((e.w || 5.6) - 0.8) / slots;

      let msgBlocks = '';
      for (let i = 0; i < slots; i++) {
        const sy0 = e.y - w + 0.4 + i * slotStep + 0.08;
        const sy1 = sy0 + slotStep - 0.16;
        if (i < filled) {
          const ratio = filled / slots;
          const mColor = ratio > 0.8 ? 'red' : ratio > 0.5 ? 'yellow' : 'green';
          const mp = buildPrism({
            x0: e.x - d + 0.32, x1: e.x + d - 0.32,
            y0: sy0, y1: sy1,
            h: h + 6, radius: 3, cx: e.x, cy: e.y
          });
          msgBlocks += renderPrismFaces(mp, mColor, pal, 1.35);
        }
      }

      const body = `
        <g opacity="${A(e.opacity)}">
          ${renderGroundShadow(prism, h, lift, 0.22, pal)}
          <g transform="translate(0 ${A(-lift)})">
            ${renderPrismFaces(prism, e.color || 'orange', pal)}
            ${msgBlocks}
          </g>
        </g>`;

      const [cx, topY] = prism.T;
      const [, botY] = prism.Bd;
      let over = '';
      let minX = prism.L[0], maxX = prism.R[0], minY = topY - lift, maxY = botY - lift;
      if (e.label) {
        const dim = pillDims(e.label, { icon: 'queue' });
        const ly = botY - lift + 18;
        over += renderPill(cx, ly, e.label, { icon: 'queue', tone: 'paper' }, pal);
        placedPills.push({ x: cx, y: ly, w: dim.w, h: dim.h });
        minX = Math.min(minX, cx - dim.w / 2 - 4);
        maxX = Math.max(maxX, cx + dim.w / 2 + 4);
        maxY = Math.max(maxY, ly + dim.h / 2 + 4);
      }
      const pillSpecs = [];
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(cx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(cx, topY - lift - 16, maxY + 24, pillSpecs, placedPills, { forceAbove: true });
      over += stack.html;
      if (over) over = `<g opacity="${A(e.opacity)}">${over}</g>`;
      const poly = prism.outline.map(([px, py0]) => [px, py0 - lift]);
      const baseB = boundsOfPoints(poly, [16, 16, 16, 14]);
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], minX, stack.minX), Math.min(baseB[1], minY, stack.minY), Math.max(baseB[2], maxX, stack.maxX), Math.max(baseB[3], maxY, stack.maxY)]
      };
    },

    device(e, pal, placedPills = []) {
      const d = (e.d || 3.4) / 2;
      const w = (e.w || 3.8) / 2;
      const baseH = 9;
      const slab = buildPrism({
        x0: e.x - d, x1: e.x + d,
        y0: e.y - w, y1: e.y + w,
        h: baseH, radius: 8
      });
      const lift = e.lift || 0;
      const [scx, scy] = iso(e.x, e.y, baseH + 2);
      const kind = e.kind || 'laptop';
      let topH = 40;
      let gadgetSvg = '';

      if (kind === 'phone') {
        topH = 44;
        gadgetSvg = `
          <g transform="translate(${A(scx)} ${A(scy)})">
            <rect x="-13" y="-42" width="26" height="44" rx="4.5" fill="#3d3935" stroke="${pal.ink}" stroke-width="1.6"/>
            <rect x="-10.5" y="-39" width="21" height="36" rx="2.5" fill="#fbf8f4"/>
            <rect x="-4" y="-37.5" width="8" height="2" rx="1" fill="#3d3935"/>
            <rect x="-8" y="-32" width="16" height="6" rx="1.8" fill="#a9c5e8"/>
            <rect x="-8" y="-23" width="16" height="5" rx="1.5" fill="#e4d9cb"/>
            <rect x="-8" y="-15" width="11" height="5" rx="1.5" fill="#b3d79f"/>
            <circle cx="0" cy="-0.5" r="1.4" fill="#c9beae"/>
          </g>`;
      } else if (kind === 'sensor') {
        topH = 38;
        gadgetSvg = `
          <g transform="translate(${A(scx)} ${A(scy)})">
            <line x1="9" y1="-22" x2="9" y2="-36" stroke="${pal.ink}" stroke-width="2" stroke-linecap="round"/>
            <circle cx="9" cy="-37.5" r="2.2" fill="#4caf50" stroke="${pal.ink}" stroke-width="1"/>
            <path d="M4,-39 Q9,-44 14,-39" fill="none" stroke="${pal.ink}" stroke-width="1.2" opacity="0.65"/>
            <rect x="-17" y="-24" width="34" height="26" rx="4" fill="#e8dfd2" stroke="${pal.ink}" stroke-width="1.6"/>
            <circle cx="-4" cy="-11" r="7" fill="#fbf8f4" stroke="${pal.ink}" stroke-width="1.4"/>
            <line x1="-4" y1="-11" x2="0" y2="-15" stroke="#c0392b" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="10" cy="-15" r="2.3" fill="#4caf50" stroke="${pal.ink}" stroke-width="0.9"/>
            <circle cx="10" cy="-7" r="2.3" fill="#f59e0b" stroke="${pal.ink}" stroke-width="0.9"/>
          </g>`;
      } else {
        const scrW = (w * 1.45) * TILE;
        const scrH = 38;
        topH = scrH;
        gadgetSvg = `
          <g transform="translate(${A(scx)} ${A(scy)})">
            <polygon points="${A(-scrW * 0.56)},1 ${A(scrW * 0.56)},1 ${A(scrW * 0.78)},12 ${A(-scrW * 0.78)},12" fill="#d8cfc2" stroke="${pal.ink}" stroke-width="1.5" stroke-linejoin="round"/>
            <line x1="${A(-scrW * 0.45)}" y1="4.5" x2="${A(scrW * 0.45)}" y2="4.5" stroke="${pal.muted}" stroke-width="1" stroke-dasharray="3 2.5"/>
            <line x1="${A(-scrW * 0.52)}" y1="7.8" x2="${A(scrW * 0.52)}" y2="7.8" stroke="${pal.muted}" stroke-width="1" stroke-dasharray="3 2.5"/>
            <rect x="${A(-scrW / 2)}" y="${A(-scrH)}" width="${A(scrW)}" height="${A(scrH)}" rx="3.5" fill="#3d3935" stroke="${pal.ink}" stroke-width="1.6"/>
            <rect x="${A(-scrW / 2 + 2.5)}" y="${A(-scrH + 2.5)}" width="${A(scrW - 5)}" height="${A(scrH - 5)}" rx="2" fill="#fbf8f4"/>
            <rect x="${A(-scrW / 2 + 5)}" y="${A(-scrH + 6)}" width="${A(scrW * 0.52)}" height="5" rx="2" fill="#cbbae6"/>
            <rect x="${A(-scrW / 2 + 5)}" y="${A(-scrH + 14)}" width="${A(scrW - 10)}" height="6" rx="2" fill="#e4d9cb"/>
            <rect x="${A(-scrW / 2 + 5)}" y="${A(-scrH + 23)}" width="${A(scrW * 0.68)}" height="6" rx="2" fill="#dcefd2"/>
            <rect x="${A(-scrW / 2 + 2.5)}" y="${A(-scrH + 2.5)}" width="${A(scrW - 5)}" height="${A(scrH - 5)}" rx="2" fill="url(#screen-glare)"/>
          </g>`;
      }

      const body = `
        <g opacity="${A(e.opacity)}">
          ${renderFloorHalo(e.x - d, e.x + d, e.y - w, e.y + w, e.x, e.y, e.halo, pal)}
          ${renderGroundShadow(slab, baseH, lift, 0.2, pal)}
          <g transform="translate(0 ${A(-lift)})">
            ${renderPrismFaces(slab, 'slab', pal, 1.6)}
            ${gadgetSvg}
          </g>
        </g>`;

      const lblIcon = kind === 'phone' ? 'phone' : kind === 'sensor' ? 'sensor' : 'user';
      let over = '';
      let minX = slab.L[0], maxX = slab.R[0], minY = scy - topH - lift, maxY = slab.Bd[1] - lift;
      if (e.label) {
        const lblText = e.sub ? `${e.label} · ${e.sub}` : String(e.label);
        const dim = pillDims(lblText, { icon: lblIcon });
        const ly = slab.Bd[1] - lift + 17;
        over += renderPill(scx, ly, lblText, { icon: lblIcon, tone: 'paper' }, pal);
        placedPills.push({ x: scx, y: ly, w: dim.w, h: dim.h });
        minX = Math.min(minX, scx - dim.w / 2 - 4);
        maxX = Math.max(maxX, scx + dim.w / 2 + 4);
        maxY = Math.max(maxY, ly + dim.h / 2 + 4);
      }
      const pillSpecs = [];
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(scx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(scx, scy - topH - lift - 16, maxY + 24, pillSpecs, placedPills, { forceAbove: true });
      over += stack.html;
      if (over) over = `<g opacity="${A(e.opacity)}">${over}</g>`;
      const poly = slab.outline.map(([px, py0]) => [px, py0 - lift]);
      const baseB = boundsOfPoints([...poly, [scx, scy - topH - lift]], [16, 16, 16, 16]);
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], minX, stack.minX), Math.min(baseB[1], minY, stack.minY), Math.max(baseB[2], maxX, stack.maxX), Math.max(baseB[3], maxY, stack.maxY)]
      };
    },

    crowd(e, pal, placedPills = []) {
      const slab = buildPrism({
        x0: e.x0, x1: e.x1,
        y0: e.y0, y1: e.y1,
        h: 9, radius: 8
      });
      const lift = e.lift || 0;
      const shirts = ['#f3b47f', '#a9c5e8', '#b3d79f', '#cbbae6', '#f6cd82'];
      const cx = (e.x0 + e.x1) / 2;
      const cy = (e.y0 + e.y1) / 2;
      const count = Math.max(1, Math.min(18, e.count || 6));
      let peopleSvg = '';
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const dx = ((e.x1 - e.x0) * 0.65) / Math.max(1, cols);
      const dy = ((e.y1 - e.y0) * 0.65) / Math.max(1, rows);

      let idx = 0;
      for (let r = 0; r < rows && idx < count; r++) {
        for (let c = 0; c < cols && idx < count; c++) {
          const px = e.x0 + (e.x1 - e.x0) * 0.22 + c * dx;
          const py = e.y0 + (e.y1 - e.y0) * 0.22 + r * dy;
          const [sx, sy] = iso(px, py, 10, cx, cy);
          const shirt = shirts[idx % shirts.length];
          peopleSvg += `
            <g transform="translate(${A(sx)} ${A(sy)}) scale(1.15)">
              <ellipse cx="0" cy="0" rx="5.2" ry="2.5" fill="${pal.shadowFill}" opacity="0.18"/>
              <path d="M-4.8,0 V-8.5 A4.8,4.8 0 0 1 4.8,-8.5 V0 A4.8,2.2 0 0 1 -4.8,0 Z" fill="${shirt}" stroke="${pal.ink}" stroke-width="1.25"/>
              <circle cx="0" cy="-16.5" r="4.1" fill="#fdf6ec" stroke="${pal.ink}" stroke-width="1.25"/>
            </g>`;
          idx++;
        }
      }

      const [scx] = iso(cx, cy, 0);
      const body = `
        <g opacity="${A(e.opacity)}">
          ${renderGroundShadow(slab, 9, lift, 0.2, pal)}
          <g transform="translate(0 ${A(-lift)})">
            ${renderPrismFaces(slab, 'slab', pal, 1.55)}
            ${peopleSvg}
          </g>
        </g>`;

      let over = '';
      let minX = slab.L[0], maxX = slab.R[0], minY = slab.T[1] - 24 - lift, maxY = slab.Bd[1] - lift;
      if (e.label) {
        const dim = pillDims(e.label, { icon: 'user' });
        const ly = slab.Bd[1] - lift + 17;
        over += renderPill(scx, ly, e.label, { icon: 'user', tone: 'paper' }, pal);
        placedPills.push({ x: scx, y: ly, w: dim.w, h: dim.h });
        minX = Math.min(minX, scx - dim.w / 2 - 4);
        maxX = Math.max(maxX, scx + dim.w / 2 + 4);
        maxY = Math.max(maxY, ly + dim.h / 2 + 4);
      }
      const pillSpecs = [];
      for (const t of e.tags || []) {
        const tagObj = typeof t === 'string' ? { text: t } : t;
        const dim = pillDims(tagObj.text, tagObj);
        pillSpecs.push({ svg: renderPill(scx, 0, tagObj.text, tagObj, pal), w: dim.w, h: dim.h });
      }
      const stack = placeTagStack(scx, slab.T[1] - lift - 26, maxY + 24, pillSpecs, placedPills, { forceAbove: true });
      over += stack.html;
      if (over) over = `<g opacity="${A(e.opacity)}">${over}</g>`;
      const poly = slab.outline.map(([px, py0]) => [px, py0 - lift]);
      const baseB = boundsOfPoints(poly, [16, 28, 16, 16]);
      return {
        body,
        over,
        poly,
        bounds: [Math.min(baseB[0], minX, stack.minX), Math.min(baseB[1], minY, stack.minY), Math.max(baseB[2], maxX, stack.maxX), Math.max(baseB[3], maxY, stack.maxY)]
      };
    },

    zone(e, pal) {
      const pts = [
        iso(e.x0, e.y0, 0),
        iso(e.x0, e.y1, 0),
        iso(e.x1, e.y1, 0),
        iso(e.x1, e.y0, 0)
      ];
      const pillPal = pal.pills[e.tone || 'paper'] || pal.pills.paper;
      const toneFill = (e.tone && e.tone !== 'paper') ? pillPal.bg : pal.zoneBg;
      const dashAttr = e.dashed !== false ? 'stroke-dasharray="6 5"' : '';
      const [lx, ly] = pts[1];
      const labelText = e.label ? e.label.toUpperCase() : '';
      const labelSvg = labelText
        ? `<text x="${A(lx + 14)}" y="${A(ly + 19)}" font-size="10.2" font-weight="800" letter-spacing="1.0" fill="${e.tone && e.tone !== 'paper' ? pillPal.fg : pal.muted}">${esc(labelText)}</text>`
        : '';
      const body = `
        <g opacity="${A(e.opacity)}">
          <path d="${roundedPoly(pts, 10)}" fill="${toneFill}" fill-opacity="0.42" stroke="${pal.ink}" stroke-opacity="0.48" stroke-width="1.5" ${dashAttr}/>
          ${labelSvg}
        </g>`;
      return { body, over: '', poly: pts, bounds: boundsOfPoints(pts, [14, 14, 14, 14]) };
    },

    ring(e, pal) {
      const r = e.r || 9.5;
      const [cx, cy] = iso(e.x || 0, e.y || 0, 0);
      const ptOnRing = (deg, rad = r) => {
        const radAngle = (deg * Math.PI) / 180;
        return iso((e.x || 0) + rad * Math.cos(radAngle), (e.y || 0) + rad * Math.sin(radAngle), 0);
      };
      const ringPts = [];
      for (let a = 0; a < 360; a += 10) ringPts.push(ptOnRing(a, r));
      const ringPath = roundedPoly(ringPts, 4);

      let keysSvg = '';
      for (const deg of e.keys || []) {
        const [kx, ky] = ptOnRing(deg, r);
        keysSvg += `<circle cx="${A(kx)}" cy="${A(ky)}" r="3.6" fill="#f3b47f" stroke="${pal.ink}" stroke-width="1.3"/>`;
      }
      const over = e.label ? renderPill(cx, cy, e.label, { tone: 'paper', icon: 'replay' }, pal) : '';
      const body = `
        <g opacity="${A(e.opacity)}">
          <path d="${ringPath}" fill="${pal.zoneBg}" fill-opacity="0.35" stroke="${pal.ink}" stroke-opacity="0.6" stroke-width="1.8" stroke-dasharray="6 4"/>
          ${keysSvg}
        </g>`;
      return { body, over, poly: ringPts, bounds: boundsOfPoints(ringPts, [24, 24, 24, 24]) };
    },

    panel(e, pal) {
      const [bx, by] = iso(e.x || 0, e.y || 0, 0);
      const lines = e.lines || [];
      const bars = e.bars || [];
      const maxLineW = Math.max(
        measureText((e.title || 'PANEL').toUpperCase(), 11) + 34,
        ...lines.map((l) => measureText(l, 10.8) + 26),
        bars.length ? 220 : 165
      );
      const w = e.w || Math.max(185, maxLineW + 12);
      const h = 36 + lines.length * 18 + bars.length * 22 + 10;
      const x = (e.center !== false ? bx - w / 2 : bx) + (e.dx || 0);
      const y = by + (e.dy || 0) - (e.lift || 0);

      let contentSvg = '';
      let curY = y + 44;
      for (const raw of lines) {
        const str = String(raw);
        let fg = pal.ink2;
        if (str.startsWith('!')) fg = pal.pills.red.fg;
        else if (str.startsWith('+')) fg = pal.pills.green.fg;
        else if (str.startsWith('>')) fg = pal.pills.blue.fg;
        else if (str.startsWith('~')) fg = pal.pills.amber.fg;
        else if (str.startsWith('#')) fg = pal.muted;
        contentSvg += `<text x="${A(x + 12)}" y="${A(curY)}" font-size="10.8" font-weight="600" fill="${fg}">${esc(str)}</text>`;
        curY += 18;
      }
      for (const b of bars) {
        const ratio = clamp01(b.val ?? 0.5);
        const bColor = ratio > 0.8 ? '#e5534b' : ratio > 0.5 ? '#e8a33a' : '#5fae57';
        contentSvg += `
          <text x="${A(x + 12)}" y="${A(curY)}" font-size="10.2" font-weight="700" fill="${pal.ink}">${esc(b.label)}</text>
          <rect x="${A(x + 82)}" y="${A(curY - 8)}" width="${A(Math.max(40, w - 144))}" height="8" rx="4" fill="${pal.cardLine}"/>
          <rect x="${A(x + 82)}" y="${A(curY - 8)}" width="${A(Math.max(4, Math.max(40, w - 144) * ratio))}" height="8" rx="4" fill="${bColor}"/>
          <text x="${A(x + w - 12)}" y="${A(curY)}" text-anchor="end" font-size="10" font-weight="700" fill="${pal.muted}">${esc(b.text || '')}</text>`;
        curY += 22;
      }

      const over = `
        <g class="panel-card" opacity="${A(e.opacity)}">
          <rect x="${A(x + 2)}" y="${A(y + 3)}" width="${A(w)}" height="${A(h)}" rx="10" fill="${pal.drop}" opacity="0.86"/>
          <rect x="${A(x)}" y="${A(y)}" width="${A(w)}" height="${A(h)}" rx="10" fill="${pal.cardBg}" stroke="${pal.ink}" stroke-width="1.5"/>
          <line x1="${A(x)}" y1="${A(y + 26)}" x2="${A(x + w)}" y2="${A(y + 26)}" stroke="${pal.cardLine}" stroke-width="1.2"/>
          ${drawIconAt(e.icon || 'code', x + 15, y + 13, 13, pal.ink, 2)}
          <text x="${A(x + 28)}" y="${A(y + 17)}" font-size="10.8" font-weight="800" letter-spacing="0.03em" fill="${pal.ink}">${esc((e.title || 'PANEL').toUpperCase())}</text>
          ${contentSvg}
        </g>`;
      return {
        body: '',
        over,
        poly: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
        bounds: [x - 8, y - 8, x + w + 8, y + h + 8],
        obstacle: { x: x + w / 2, y: y + h / 2, w: w + 10, h: h + 10 }
      };
    },

    ghost(e, pal) {
      const half = (e.s || 4.0) / 2;
      const pts = [
        iso(e.x - half, e.y - half, 0),
        iso(e.x - half, e.y + half, 0),
        iso(e.x + half, e.y + half, 0),
        iso(e.x + half, e.y - half, 0)
      ];
      const [cx, cy] = iso(e.x, e.y, 0);
      const body = `
        <g opacity="${A(e.opacity)}">
          <path d="${roundedPoly(pts, 7)}" fill="${pal.zoneBg}" fill-opacity="0.3" stroke="${pal.muted}" stroke-width="1.5" stroke-dasharray="5 4"/>
        </g>`;
      const over = e.label ? renderPill(cx, cy, e.label, { tone: 'gray' }, pal) : '';
      return { body, over, poly: pts, bounds: boundsOfPoints(pts, [16, 16, 16, 16]) };
    }
  };

  /* ── Entity Center & Polygon Clipping ── */
  function entityCenter(e) {
    if (e.type === 'crowd' || e.type === 'zone') {
      return iso((e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, 0);
    }
    if (e.type === 'cloud') {
      return iso(e.x || 0, e.y || 0, 14);
    }
    return iso(e.x || 0, e.y || 0, (e.h || 20) * 0.35);
  }

  function clipRayToPoly(fromPt, toPt, poly, pad = 6) {
    if (!poly || poly.length < 3) return fromPt;
    const dx = toPt[0] - fromPt[0];
    const dy = toPt[1] - fromPt[1];
    const len = Math.hypot(dx, dy);
    if (len < 1) return fromPt;
    let bestT = null;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const sx = b[0] - a[0], sy = b[1] - a[1];
      const denom = dx * sy - dy * sx;
      if (Math.abs(denom) < 1e-6) continue;
      const u = ((a[0] - fromPt[0]) * dy - (a[1] - fromPt[1]) * dx) / denom;
      const t = ((a[0] - fromPt[0]) * sy - (a[1] - fromPt[1]) * sx) / denom;
      if (u >= -0.01 && u <= 1.01 && t > 0 && t < 0.95) {
        if (bestT === null || t > bestT) bestT = t;
      }
    }
    if (bestT === null) return fromPt;
    const tPad = Math.min(0.92, bestT + pad / len);
    return [fromPt[0] + dx * tPad, fromPt[1] + dy * tPad];
  }

  function depthKey(e) {
    if (e.type === 'zone' || e.type === 'ring') return -10000;
    if (e.type === 'ghost') return -5000;
    if (e.type === 'panel' || e.type === 'frame') return 10000;
    const wx = e.type === 'crowd' ? (e.x0 + e.x1) / 2 : (e.x || 0);
    const wy = e.type === 'crowd' ? (e.y0 + e.y1) / 2 : (e.y || 0);
    return wx - wy;
  }

  /* ── Stage Class (Interactive SVG Canvas + Packet Animation) ── */
  class IsoStage {
    constructor(hostEl, opts = {}) {
      this.host = hostEl;
      this.theme = opts.theme || (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
      this.svg = document.createElementNS(SVG_NS, 'svg');
      this.svg.setAttribute('class', 'stage-svg');
      this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this.svg.setAttribute('role', 'img');

      const pal = PALETTES[this.theme] || PALETTES.light;
      this.svg.innerHTML = `
        <defs class="defs-theme">${buildDefs(pal)}</defs>
        <defs>
          <radialGradient id="grid-fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="650">
            <stop offset="0" stop-color="#fff"/>
            <stop offset="0.5" stop-color="#fff" stop-opacity="0.92"/>
            <stop offset="0.82" stop-color="#fff" stop-opacity="0.32"/>
            <stop offset="1" stop-color="#fff" stop-opacity="0"/>
          </radialGradient>
          <mask id="grid-mask" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8000" height="8000">
            <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#grid-fade)"/>
          </mask>
        </defs>
        <rect class="stage-grid" x="-4000" y="-4000" width="8000" height="8000" fill="url(#iso-grid)" mask="url(#grid-mask)"/>
        <g class="layer-floor"></g>
        <g class="layer-links"></g>
        <g class="layer-packets"></g>
        <g class="layer-ents"></g>
        <g class="layer-over"></g>
        <g class="layer-fx"></g>`;

      this.host.innerHTML = '';
      this.host.appendChild(this.svg);

      this.L = {
        defs: this.svg.querySelector('.defs-theme'),
        fade: this.svg.querySelector('#grid-fade'),
        floor: this.svg.querySelector('.layer-floor'),
        links: this.svg.querySelector('.layer-links'),
        packets: this.svg.querySelector('.layer-packets'),
        ents: this.svg.querySelector('.layer-ents'),
        over: this.svg.querySelector('.layer-over'),
        fx: this.svg.querySelector('.layer-fx')
      };

      this.scene = null;
      this.linkPolys = new Map();
      this.packets = [];
      this.flows = [];
      this.paused = false;
      this.viewBox = [-360, -240, 720, 480];
      this.userZoom = null;
      this.onViewChange = null;
      this.lastTime = performance.now();

      this._initGestures();
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this.fit(false));
        this._ro.observe(this.host);
      }

      const loop = (now) => {
        this._tick(now);
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    setTheme(theme) {
      this.theme = theme === 'dark' ? 'dark' : 'light';
      const pal = PALETTES[this.theme];
      this.L.defs.innerHTML = buildDefs(pal);
      if (this.scene) this.renderScene(this.scene, { keepPackets: true });
    }

    setPaused(paused) {
      this.paused = !!paused;
      return this.paused;
    }

    replay() {
      this.packets = [];
      this.L.packets.innerHTML = '';
      this.L.fx.innerHTML = '';
      for (const f of this.flows) f.acc = 0.85;
      if (this.scene) {
        this.host.classList.remove('is-fresh');
        void this.host.offsetWidth;
        this.host.classList.add('is-fresh');
      }
    }

    fit(resetZoom = true) {
      if (resetZoom) {
        this.userZoom = null;
        this.host.classList.remove('is-zoomed');
        if (this.onViewChange) this.onViewChange(false);
      }
      this._applyViewBox();
    }

    _applyViewBox() {
      const vb = this.userZoom || this.viewBox;
      if (!vb) return;
      this.svg.setAttribute('viewBox', `${A(vb[0])} ${A(vb[1])} ${A(vb[2])} ${A(vb[3])}`);
      const cx = vb[0] + vb[2] / 2;
      const cy = vb[1] + vb[3] / 2;
      const r = Math.max(vb[2], vb[3]) * 0.65;
      this.L.fade.setAttribute('cx', A(cx));
      this.L.fade.setAttribute('cy', A(cy));
      this.L.fade.setAttribute('r', A(r));
    }

    renderScene(scene, opts = {}) {
      this.scene = scene || { entities: {}, links: {}, flows: [] };
      const pal = PALETTES[this.theme] || PALETTES.light;
      const rawEnts = this.scene.entities || {};
      const ents = {};

      for (const [id, spec] of Object.entries(rawEnts)) {
        const type = spec.type || 'block';
        ents[id] = { ...(ENTITY_DEFAULTS[type] || {}), ...spec, type };
      }

      const sortedIds = Object.keys(ents).sort((a, b) => depthKey(ents[a]) - depthKey(ents[b]));

      let floorHtml = '';
      let entsHtml = '';
      let overHtml = '';
      const polys = {};
      const obstacles = [];
      let bounds = [Infinity, Infinity, -Infinity, -Infinity];
      const expandBounds = (b) => {
        if (!b) return;
        bounds[0] = Math.min(bounds[0], b[0]);
        bounds[1] = Math.min(bounds[1], b[1]);
        bounds[2] = Math.max(bounds[2], b[2]);
        bounds[3] = Math.max(bounds[3], b[3]);
      };

      const placedLabels = [];
      for (const id of sortedIds) {
        const e = ents[id];
        const renderer = RENDERERS[e.type] || RENDERERS.block;
        const res = renderer(e, pal, placedLabels);
        polys[id] = res.poly;
        expandBounds(res.bounds);
        if (e.type === 'zone' || e.type === 'ring' || e.type === 'ghost') {
          floorHtml += `<g data-ent="${esc(id)}">${res.body}</g>`;
        } else if (res.body) {
          entsHtml += `<g data-ent="${esc(id)}">${res.body}</g>`;
          // Register exact rendered polygon bbox as obstacle so link pills NEVER overlap entity bodies
          if (res.poly && res.poly.length) {
            const pb = boundsOfPoints(res.poly, [4, 4, 4, 4]);
            obstacles.push({
              x: (pb[0] + pb[2]) / 2,
              y: (pb[1] + pb[3]) / 2,
              w: pb[2] - pb[0],
              h: pb[3] - pb[1]
            });
          }
        }
        if (res.obstacle) {
          obstacles.push(res.obstacle);
        }
        if (res.over) {
          overHtml += `<g data-ent-over="${esc(id)}">${res.over}</g>`;
        }
      }

      // Render links & store geometry for packet animation
      this.linkPolys.clear();
      let linksHtml = '';
      let linkLabelsHtml = '';
      const rawLinks = this.scene.links || {};

      for (const [lid, lspec] of Object.entries(rawLinks)) {
        const fromEnt = ents[lspec.from];
        const toEnt = ents[lspec.to];
        if (!fromEnt || !toEnt) continue;
        const pStart = entityCenter(fromEnt);
        const pEnd = entityCenter(toEnt);
        const viaPts = (lspec.via || []).map((v) => iso(v[0], v[1], v[2] || 0));
        const firstTarget = viaPts.length ? viaPts[0] : pEnd;
        const lastSource = viaPts.length ? viaPts[viaPts.length - 1] : pStart;

        const clippedStart = clipRayToPoly(pStart, firstTarget, polys[lspec.from], 7);
        const clippedEnd = clipRayToPoly(pEnd, lastSource, polys[lspec.to], 9);
        const pts = [clippedStart, ...viaPts, clippedEnd];

        // Expand viewBox bounds for curved/via link points
        for (const p of pts) expandBounds([p[0] - 12, p[1] - 12, p[0] + 12, p[1] + 12]);

        const segs = [];
        let totalLen = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
          segs.push({ a: pts[i], b: pts[i + 1], len: d, start: totalLen });
          totalLen += d;
        }
        this.linkPolys.set(lid, { pts, segs, totalLen, spec: lspec });

        const pathD = roundedOpenPath(pts, 10);
        const styleCls =
          lspec.style === 'dashed' ? 'link link--dashed' :
          lspec.style === 'off' ? 'link link--off' :
          lspec.style === 'beat' ? 'link link--beat' :
          lspec.style === 'cut' ? 'link link--cut' : 'link';
        const markerEnd =
          lspec.style === 'off' ? 'url(#arrow-muted)' :
          lspec.style === 'cut' ? 'url(#arrow-red)' :
          lspec.style === 'beat' ? 'url(#arrow-green)' : 'url(#arrow)';
        const markerStart = lspec.both ? `marker-start="${markerEnd}"` : '';

        linksHtml += `<path class="${styleCls}" data-link="${esc(lid)}" d="${pathD}" ${markerStart} marker-end="${markerEnd}"/>`;

        if (lspec.label) {
          const baseAt = lspec.labelAt ?? 0.5;
          const p0 = pts[0], pLast = pts[pts.length - 1];
          const ang = Math.atan2(pLast[1] - p0[1], pLast[0] - p0[0]);
          const perpY = lspec.labelOffset ?? (Math.cos(ang) >= 0 ? -18 : 18);
          const dim = pillDims(lspec.label, { size: 10 });
          const lw = dim.w, lh = dim.h;

          const allObs = [...placedLabels, ...obstacles];
          const candidates = [];
          for (const atTry of [baseAt, 0.5, 0.38, 0.62, 0.28, 0.72]) {
            const pt = this._pointAlongLink(lid, atTry);
            if (!pt) continue;
            for (const dyTry of [perpY, -perpY, perpY * 1.9, -perpY * 1.9, perpY * 2.8, -perpY * 2.8]) {
              candidates.push([pt[0], pt[1] + dyTry]);
            }
          }

          let bestX = candidates.length ? candidates[0][0] : p0[0];
          let bestY = candidates.length ? candidates[0][1] : p0[1];
          let bestPenalty = Infinity;

          for (const [cx, cy] of candidates) {
            let penalty = 0;
            for (const prev of allObs) {
              const ph = prev.h || 24;
              const ox = Math.max(0, (lw + prev.w) * 0.52 - Math.abs(cx - prev.x));
              const oy = Math.max(0, (lh + ph) * 0.54 - Math.abs(cy - prev.y));
              if (ox > 0 && oy > 0) {
                penalty += ox * oy;
              }
            }
            if (penalty === 0) {
              bestX = cx;
              bestY = cy;
              break;
            }
            if (penalty < bestPenalty) {
              bestPenalty = penalty;
              bestX = cx;
              bestY = cy;
            }
          }

          placedLabels.push({ x: bestX, y: bestY, w: lw, h: lh });
          expandBounds([bestX - lw / 2 - 8, bestY - lh / 2 - 8, bestX + lw / 2 + 8, bestY + lh / 2 + 8]);
          linkLabelsHtml += `<g class="link-label">${renderPill(bestX, bestY, lspec.label, { tone: lspec.tone || 'paper', size: 10 }, pal)}</g>`;
        }
      }

      this.L.floor.innerHTML = floorHtml;
      this.L.links.innerHTML = linksHtml;
      this.L.ents.innerHTML = entsHtml;
      this.L.over.innerHTML = overHtml + linkLabelsHtml;

      // Calculate tight viewBox so diagram fills the stage prominently without clipping
      if (!isFinite(bounds[0])) bounds = [-220, -140, 220, 140];
      const padX = 24, padY = 18;
      const bw = Math.max(340, bounds[2] - bounds[0] + padX * 2);
      const bh = Math.max(210, bounds[3] - bounds[1] + padY * 2);
      const cx = (bounds[0] + bounds[2]) / 2;
      const cy = (bounds[1] + bounds[3]) / 2;
      this.viewBox = [cx - bw / 2, cy - bh / 2, bw, bh];
      if (!opts.keepZoom) this.userZoom = null;
      this._applyViewBox();

      if (!opts.keepPackets) {
        this.packets = [];
        this.L.packets.innerHTML = '';
        this.L.fx.innerHTML = '';
        this.flows = (this.scene.flows || []).map((f, idx) => ({
          route: f.route || [],
          rate: f.rate ?? 1.2,
          kind: f.kind || 'req',
          speed: f.speed || 1,
          fail: f.fail ?? 0,
          acc: 0.65 + (idx % 3) * 0.22
        }));
      }
    }

    _pointAlongLink(lid, t) {
      const info = this.linkPolys.get(lid);
      if (!info || info.totalLen <= 0) return null;
      const target = clamp01(t) * info.totalLen;
      for (const s of info.segs) {
        if (target <= s.start + s.len || s === info.segs[info.segs.length - 1]) {
          const localT = s.len > 0 ? (target - s.start) / s.len : 0;
          return [lerp(s.a[0], s.b[0], localT), lerp(s.a[1], s.b[1], localT)];
        }
      }
      return info.pts[info.pts.length - 1];
    }

    _spawnPacket(flow, hopIdx = 0) {
      const lid = flow.route[hopIdx];
      const info = this.linkPolys.get(lid);
      if (!info || info.totalLen < 4) return;
      const el = document.createElementNS(SVG_NS, 'g');
      const kind = flow.kind || 'req';
      const isSquare = kind === 'msg' || kind === 'heavy' || kind === 'poison' || kind === 'write';
      el.setAttribute('class', `pkt pkt--${kind}`);
      el.innerHTML = isSquare
        ? '<rect x="-5.5" y="-5.5" width="11" height="11" rx="2.5"/>'
        : '<circle cx="0" cy="0" r="5.2"/>';
      this.L.packets.appendChild(el);

      const linkFail = info.spec.fail ?? flow.fail ?? 0;
      const willFail = linkFail > 0 && Math.random() < linkFail;

      this.packets.push({
        el,
        flow,
        hopIdx,
        lid,
        dist: 0,
        totalLen: info.totalLen,
        speed: (145 + Math.random() * 20) * (flow.speed || 1),
        willFail,
        failAt: willFail ? 0.72 + Math.random() * 0.22 : 1
      });
    }

    _spawnFx(pt, kind = 'fail') {
      if (!pt) return;
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', `fx fx--${kind}`);
      g.setAttribute('transform', `translate(${A(pt[0])} ${A(pt[1])})`);
      if (kind === 'fail') {
        g.innerHTML = '<circle class="fx-ring" cx="0" cy="0" r="10"/><path class="fx-x" d="M-4,-4 L4,4 M4,-4 L-4,4"/>';
      } else {
        g.innerHTML = '<circle class="fx-ring" cx="0" cy="0" r="10"/>';
      }
      this.L.fx.appendChild(g);
      setTimeout(() => g.remove(), 700);
    }

    _tick(now) {
      const dt = Math.min(0.08, (now - this.lastTime) / 1000);
      this.lastTime = now;
      if (this.paused) return;

      for (const f of this.flows) {
        if (!f.route || !f.route.length) continue;
        f.acc += dt * (f.rate || 1);
        if (f.acc >= 1) {
          f.acc -= 1;
          if (this.packets.length < 48) this._spawnPacket(f, 0);
        }
      }

      for (let i = this.packets.length - 1; i >= 0; i--) {
        const p = this.packets[i];
        p.dist += p.speed * dt;
        const t = p.totalLen > 0 ? p.dist / p.totalLen : 1;
        const pos = this._pointAlongLink(p.lid, Math.min(1, t));
        if (pos) {
          p.el.setAttribute('transform', `translate(${A(pos[0])} ${A(pos[1])})`);
        }
        if (p.willFail && t >= p.failAt) {
          this._spawnFx(pos, 'fail');
          p.el.remove();
          this.packets.splice(i, 1);
          continue;
        }
        if (t >= 1) {
          if (p.flow.kind === 'kill' || p.flow.kind === 'poison') {
            this._spawnFx(pos, 'fail');
          } else if (p.hopIdx === p.flow.route.length - 1 && (p.flow.kind === 'res' || p.flow.kind === 'ping')) {
            this._spawnFx(pos, 'ok');
          }
          p.el.remove();
          this.packets.splice(i, 1);
          if (p.hopIdx + 1 < p.flow.route.length) {
            this._spawnPacket(p.flow, p.hopIdx + 1);
          }
        }
      }
    }

    _initGestures() {
      let dragging = false;
      let startX = 0, startY = 0;
      let startVb = null;

      this.host.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey && !this.userZoom) return;
        e.preventDefault();
        const cur = (this.userZoom || this.viewBox).slice();
        const factor = e.deltaY > 0 ? 1.12 : 0.89;
        const nw = Math.max(220, Math.min(1800, cur[2] * factor));
        const nh = Math.max(150, Math.min(1200, cur[3] * factor));
        const cx = cur[0] + cur[2] / 2;
        const cy = cur[1] + cur[3] / 2;
        this.userZoom = [cx - nw / 2, cy - nh / 2, nw, nh];
        this.host.classList.add('is-zoomed');
        if (this.onViewChange) this.onViewChange(true);
        this._applyViewBox();
      }, { passive: false });

      this.host.addEventListener('pointerdown', (e) => {
        if (!this.userZoom || e.button !== 0) return;
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startVb = this.userZoom.slice();
        this.host.classList.add('is-dragging');
        this.host.setPointerCapture(e.pointerId);
      });

      this.host.addEventListener('pointermove', (e) => {
        if (!dragging || !startVb) return;
        const rect = this.svg.getBoundingClientRect();
        const dx = ((e.clientX - startX) / Math.max(1, rect.width)) * startVb[2];
        const dy = ((e.clientY - startY) / Math.max(1, rect.height)) * startVb[3];
        this.userZoom = [startVb[0] - dx, startVb[1] - dy, startVb[2], startVb[3]];
        this._applyViewBox();
      });

      const stopDrag = () => {
        dragging = false;
        this.host.classList.remove('is-dragging');
      };
      this.host.addEventListener('pointerup', stopDrag);
      this.host.addEventListener('pointercancel', stopDrag);
    }
  }

  /* ── Declarative DSL Helpers for Scene Authoring ── */
  const DSL = {
    block:    (x, y, opts = {}) => ({ type: 'block', x, y, ...opts }),
    srv:      (x, y, label, opts = {}) => ({ type: 'block', x, y, glyph: 'server', label: Array.isArray(label) ? label : [label], ...opts }),
    gw:       (x, y, label, opts = {}) => ({ type: 'block', x, y, color: 'orange', glyph: 'gateway', label: Array.isArray(label) ? label : [label], ...opts }),
    lb:       (x, y, label, opts = {}) => ({ type: 'block', x, y, color: 'teal', glyph: 'balancer', label: Array.isArray(label) ? label : [label], ...opts }),
    db:       (x, y, label, opts = {}) => ({ type: 'db', x, y, label, ...opts }),
    queue:    (x, y, label, opts = {}) => ({ type: 'queue', x, y, label, ...opts }),
    dev:      (x, y, label, opts = {}) => ({ type: 'device', x, y, label, ...opts }),
    crowd:    (x0, x1, y0, y1, count, label, opts = {}) => ({ type: 'crowd', x0, x1, y0, y1, count, label, ...opts }),
    zone:     (x0, x1, y0, y1, label, opts = {}) => ({ type: 'zone', x0, x1, y0, y1, label, ...opts }),
    ring:     (x, y, nodes, opts = {}) => ({ type: 'ring', x, y, nodes, ...opts }),
    panel:    (x, y, title, lines, opts = {}) => ({ type: 'panel', x, y, title, lines, ...opts }),
    ghost:    (x, y, label, opts = {}) => ({ type: 'ghost', x, y, label, ...opts }),
    router:   (x, y, label, opts = {}) => ({ type: 'router', x, y, label, ...opts }),
    firewall: (x, y, label, opts = {}) => ({ type: 'firewall', x, y, label, ...opts }),
    cloud:    (x, y, label, opts = {}) => ({ type: 'cloud', x, y, label: Array.isArray(label) ? label : [label], ...opts }),
    rack:     (x, y, label, opts = {}) => ({ type: 'rack', x, y, label, ...opts }),
    frame:    (x, y, title, cells, opts = {}) => ({ type: 'frame', x, y, title, cells, ...opts }),
    link:     (from, to, opts = {}) => ({ from, to, ...opts }),
    flow:     (route, opts = {}) => ({ route: Array.isArray(route) ? route : [route], ...opts })
  };

  global.IsoStage = IsoStage;
  global.IsoDSL = DSL;
  global.IsoIcons = ICONS;
})(typeof window !== 'undefined' ? window : globalThis);
