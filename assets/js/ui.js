/* =====================================================================
   UI compartida: iconos, navbar, footer, toasts, helpers
   ===================================================================== */

import { SITE } from "./config.js";
import { DEMO } from "./db.js";

/* ---------------------------------------------------------------- iconos */

export const ICON = {
  trofeo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  voto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
  entrar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`,
  reglas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" x2="20" y1="7" y2="7"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="17" y2="17"/></svg>`,
  cerrar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`,
  buscar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  arriba: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 7 22 7 22 13"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>`,
  abajo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 17 22 17 22 11"/><path d="m22 17-8.5-8.5-5 5L2 7"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  atras: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chispa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.94 14.06 2 22"/><path d="M12 3 13.9 8.6 19.5 10.5 13.9 12.4 12 18 10.1 12.4 4.5 10.5 10.1 8.6z"/><path d="M18 15h.01"/><path d="M20 19h.01"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
  camara: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  subir: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  checkCirculo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.8 10A10 10 0 1 1 17 3.34"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  alerta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  escudo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  fuego: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  grip: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>`,
  flechaArriba: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
  flechaAbajo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  salir: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  candado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  papelera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  ojo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  vacio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>`,
};

/* ----------------------------------------------------------------- utils */

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

export const igLimpio = (v) => String(v || "").trim().replace(/^@+/, "").replace(/\s+/g, "");

export const iniciales = (nombre) =>
  String(nombre || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();

/**
 * Avatar de reemplazo cuando la foto no carga o no existe.
 * Va URI-encodeado: si no, las comillas del SVG rompen el atributo onerror.
 */
export function avatarFallback(nombre) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">` +
    `<rect width="240" height="240" fill="#291b22"/>` +
    `<text x="50%" y="50%" dy=".34em" text-anchor="middle" font-family="Inter,Arial,sans-serif" ` +
    `font-size="88" font-weight="800" fill="#93838a">${iniciales(nombre)}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** Título honorífico del puesto 1. */
export const TITULO_BOSS = "TRUE ORT BOSS";

export const sinPuesto = (puesto) => puesto === null || puesto === undefined;

/** Lo que va dentro de la chapa de puesto: número, o "N/A" si todavía no se asignó. */
export function etiquetaPuesto(puesto) {
  return sinPuesto(puesto) ? "N/A" : String(puesto);
}

/** Clase modificadora de la chapa según el puesto. */
export function claseBadge(puesto) {
  if (sinPuesto(puesto)) return " rank-badge--sin";
  if (puesto === 1) return " rank-badge--boss";
  if (puesto <= 3) return ` rank-badge--${puesto}`;
  return "";
}

export function movimiento(puesto, anterior) {
  if (sinPuesto(puesto)) return { tipo: "sin", valor: 0 };
  if (anterior === null || anterior === undefined) return { tipo: "new", valor: 0 };
  const delta = anterior - puesto;
  if (delta > 0) return { tipo: "up", valor: delta };
  if (delta < 0) return { tipo: "down", valor: Math.abs(delta) };
  return { tipo: "flat", valor: 0 };
}

export function pillMovimiento(puesto, anterior) {
  const m = movimiento(puesto, anterior);
  if (m.tipo === "sin") return `<span class="pill pill--sin">SIN PUESTO</span>`;
  if (m.tipo === "new") return `<span class="pill pill--new">NUEVO</span>`;
  if (m.tipo === "up") return `<span class="pill pill--up">${ICON.arriba}+${m.valor}</span>`;
  if (m.tipo === "down") return `<span class="pill pill--down">${ICON.abajo}-${m.valor}</span>`;
  return `<span class="pill pill--flat">—</span>`;
}

/* ---------------------------------------------------------------- navbar */

const LINKS = [
  { href: "/", txt: "Rankings", icon: ICON.trofeo, key: "rankings" },
  { href: "/#votar", txt: "Votar", icon: ICON.voto, key: "votar" },
  { href: "/reglas/", txt: "Reglas", icon: ICON.reglas, key: "reglas" },
];

export function montarNav(actual) {
  const host = $("#nav");
  if (!host) return;

  host.innerHTML = `
    <nav class="nav">
      ${DEMO ? `<div class="demo-strip">MODO DEMO — datos de ejemplo. Cargá tus claves en <code>assets/js/config.js</code> para activar el sitio real.</div>` : ""}
      <div class="nav__inner">
        <a class="nav__brand" href="/">
          <img class="nav__logo" src="${SITE.logo}" alt="" onerror="this.style.display='none'">
          <span class="nav__name">${esc(SITE.nombre)}<span>${esc(SITE.sufijo)}</span></span>
        </a>
        <button class="nav__burger" type="button" aria-label="Abrir menú" aria-expanded="false">${ICON.menu}</button>
        <div class="nav__links" id="navLinks">
          ${LINKS.map(
            (l) => `<a class="nav__link" href="${l.href}"${l.key === actual ? ' aria-current="page"' : ""}>${l.icon}${l.txt}</a>`
          ).join("")}
          <a class="nav__link nav__cta" href="/entrar/">${ICON.entrar}Postularme</a>
        </div>
      </div>
    </nav>`;

  const burger = $(".nav__burger", host);
  const links = $("#navLinks", host);
  burger.addEventListener("click", () => {
    const abierto = links.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(abierto));
    burger.innerHTML = abierto ? ICON.cerrar : ICON.menu;
  });
  $$(".nav__link", host).forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      burger.innerHTML = ICON.menu;
      burger.setAttribute("aria-expanded", "false");
    })
  );
}

export function montarFooter() {
  const host = $("#footer");
  if (!host) return;
  host.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer__links">
          <a href="/">Rankings</a>
          <a href="/entrar/">Postularme</a>
          <a href="/reglas/">Reglas</a>
          <a href="https://instagram.com/${esc(SITE.instagram)}" target="_blank" rel="noopener">Instagram</a>
        </div>
        <p style="margin:0 auto;max-width:540px">
          <strong>Sitio NO oficial.</strong> ${esc(SITE.titulo)} es un proyecto independiente hecho
          por estudiantes, sin vínculo, respaldo ni afiliación con la Universidad ORT Uruguay.
          Solo por diversión. Todos los perfiles se publican con el consentimiento de la persona.
          Para pedir la baja, escribinos por DM a @${esc(SITE.instagram)}: verificamos y damos de baja.
        </p>
      </div>
    </footer>`;
}

/* ---------------------------------------------------------------- toasts */

export function toast(mensaje, tipo = "ok") {
  let wrap = $(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast toast--${tipo}`;
  el.innerHTML = `${tipo === "ok" ? ICON.checkCirculo : ICON.alerta}<span>${esc(mensaje)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s, transform .3s";
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    setTimeout(() => el.remove(), 320);
  }, 3200);
}
