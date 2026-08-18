/* =====================================================================
   Home — lista de rankings
   ===================================================================== */

import { listRankings } from "./db.js";
import {
  $, ICON, esc, montarNav, montarFooter, pillMovimiento, avatarFallback, movimiento,
  claseBadge, TITULO_BOSS, sinPuesto, etiquetaPuesto,
} from "./ui.js";

montarNav("rankings");
montarFooter();
$("#searchIcon").innerHTML = ICON.buscar;
$("#bannerIcon").innerHTML = ICON.chispa;

const lista = $("#lista");
const inputQ = $("#q");
const selOrden = $("#orden");

let datos = [];

/* -------------------------------------------------------------- render */

function skeletons(n = 8) {
  lista.innerHTML = Array.from({ length: n }, () => `<div class="skeleton"></div>`).join("");
}

function tarjeta(p) {
  const esBoss = p.puesto === 1;
  const subtitulo = p.etiqueta_principal || (esBoss ? TITULO_BOSS : (p.tagline || p.carrera || "—"));
  return `
    <a class="rank-card${esBoss ? " rank-card--boss" : ""}" href="/perfil/?id=${encodeURIComponent(p.id)}">
      <div class="rank-badge${claseBadge(p.puesto)}">${etiquetaPuesto(p.puesto)}</div>
      <img class="rank-avatar" src="${esc(p.foto_frente || "")}" alt=""
           loading="lazy" onerror="this.src='${avatarFallback(p.nombre)}'">
      <div class="rank-body">
        <div class="rank-name">${esc(p.nombre)}</div>
        <div class="rank-tag${esBoss || p.etiqueta_principal ? " rank-tag--boss" : ""}">${esc(subtitulo)}</div>
      </div>
      ${pillMovimiento(p.puesto, p.puesto_anterior)}
      <span class="rank-chevron">${ICON.chevron}</span>
    </a>`;
}

function vacio(titulo, texto) {
  lista.innerHTML = `
    <div class="empty">
      ${ICON.vacio}
      <h3>${esc(titulo)}</h3>
      <p>${esc(texto)}</p>
    </div>`;
}

/** Cuántos puestos se muestran como casilleros aunque estén vacíos. */
const SLOTS = 50;

/** Casillero de un puesto todavía sin dueño. */
function slotVacante(puesto) {
  const clase =
    puesto === 1 ? " slot--boss" : puesto === 2 ? " slot--plata" : puesto === 3 ? " slot--bronce" : "";
  const titulo = puesto === 1 ? TITULO_BOSS : `PUESTO #${puesto}`;
  return `
    <div class="rank-card rank-card--vacante${clase}">
      <div class="rank-badge rank-badge--vacante">${puesto}</div>
      <div class="rank-avatar rank-avatar--vacante">${ICON.trofeo}</div>
      <div class="rank-body">
        <div class="rank-name">${titulo}</div>
      </div>
      <span class="pill pill--sin">NO ASIGNADO</span>
    </div>`;
}

/** Cada perfil va en el casillero de su puesto; los que no tienen, al final. */
function conCasilleros(filas) {
  const porNumero = new Map(filas.filter((p) => !sinPuesto(p.puesto)).map((p) => [p.puesto, p]));
  const sueltos = filas.filter((p) => sinPuesto(p.puesto));
  const tope = Math.max(SLOTS, ...porNumero.keys(), 0);

  const html = [];
  for (let i = 1; i <= tope; i++) {
    html.push(porNumero.has(i) ? tarjeta(porNumero.get(i)) : slotVacante(i));
  }
  return html.join("") + sueltos.map(tarjeta).join("");
}

/** Pantalla de lanzamiento: se muestra mientras el ranking está vacío. */
function pantallaLanzamiento() {
  // El bloque va PRIMERO: con 50 casilleros, abajo de todo no lo vería nadie.
  lista.innerHTML = `
    <div class="launch">
      <div class="launch__badge">${ICON.fuego} PRIMERA EDICIÓN</div>
      <h3>El ranking se está armando</h3>
      <p>
        Estamos recibiendo y verificando las primeras postulaciones.
        Cuando cierre la lista publicamos la edición inaugural completa.
      </p>
      <a class="btn btn--primary" href="/entrar/">${ICON.entrar} Quiero estar en la primera edición</a>
      <div class="launch__pasos">
        <div><b>01</b> Subís tus dos fotos</div>
        <div><b>02</b> Verificamos que seas de ORT</div>
        <div><b>03</b> Entras y competis por el puesto</div>
      </div>
    </div>

    <div class="slots-titulo">
      <span>Los ${SLOTS} puestos en juego</span>
    </div>

    ${Array.from({ length: SLOTS }, (_, i) => slotVacante(i + 1)).join("")}`;
}

function pintar() {
  const q = inputQ.value.trim().toLowerCase();
  const orden = selOrden.value;

  let filas = datos.filter((p) => {
    if (!q) return true;
    return [p.nombre, p.tagline, p.etiqueta_principal, p.instagram, ...(p.etiquetas || [])]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  if (orden === "votos") {
    filas = [...filas].sort((a, b) => (b.votos || 0) - (a.votos || 0) || a.puesto - b.puesto);
  } else if (orden === "sube") {
    const d = (p) => { const m = movimiento(p.puesto, p.puesto_anterior); return m.tipo === "up" ? m.valor : -1; };
    filas = [...filas].sort((a, b) => d(b) - d(a) || a.puesto - b.puesto);
  } else if (orden === "nuevos") {
    filas = filas.filter((p) => p.puesto_anterior === null || p.puesto_anterior === undefined);
  } else {
    filas = [...filas].sort((a, b) => {
      if (sinPuesto(a.puesto) && sinPuesto(b.puesto)) return a.nombre.localeCompare(b.nombre, "es");
      if (sinPuesto(a.puesto)) return 1;
      if (sinPuesto(b.puesto)) return -1;
      return a.puesto - b.puesto;
    });
  }

  if (!filas.length) {
    if (datos.length) vacio("Sin resultados", "Probá con otro nombre, carrera o filtro.");
    else pantallaLanzamiento();
    return;
  }

  // Los casilleros vacíos solo tienen sentido en el orden por puesto y sin buscar.
  const conSlots = !q && orden === "puesto";
  lista.innerHTML = conSlots ? conCasilleros(filas) : filas.map(tarjeta).join("");
}

function pintarStats() {
  const total = datos.length;
  const votos = datos.reduce((a, p) => a + (p.votos || 0), 0);
  const nuevos = datos.filter((p) => p.puesto_anterior === null || p.puesto_anterior === undefined).length;
  $("#stats").innerHTML = `
    <div class="stat"><b>${total}</b><span>en el ranking</span></div>
    <div class="stat"><b>${votos}</b><span>votos</span></div>
    <div class="stat"><b>${nuevos}</b><span>nuevos</span></div>`;
}

/* ------------------------------------------------- popup de bienvenida */

/**
 * Se abre una sola vez por navegador, y solo mientras el ranking está vacío.
 * Al cerrarlo queda igual el bloque de lanzamiento en la página.
 */
function popupBienvenida() {
  if (localStorage.getItem("ort_intro_visto")) return;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal__caja" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">
      <button class="modal__cerrar" type="button" aria-label="Cerrar">${ICON.cerrar}</button>
      <div class="launch__badge">${ICON.fuego} PRIMERA EDICIÓN</div>
      <h2 id="modalTitulo">EL RANKING SE ESTÁ ARMANDO</h2>
      <p>
        Estamos recibiendo y verificando las primeras postulaciones.
        Cuando cierre la lista publicamos la edición inaugural completa.
      </p>
      <div class="launch__pasos">
        <div><b>01</b> Subís tus dos fotos</div>
        <div><b>02</b> Verificamos que seas de ORT</div>
        <div><b>03</b> Entras y competis por el puesto</div>
      </div>
      <a class="btn btn--primary btn--block" href="/entrar/">
        ${ICON.entrar} Quiero estar en la primera edición
      </a>
      <button class="modal__despues" type="button">Ver el ranking primero</button>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";
  // Reflow forzado en vez de requestAnimationFrame: en una pestaña en segundo
  // plano rAF no corre, y el popup quedaría invisible pero tapando la página.
  void modal.offsetWidth;
  modal.classList.add("is-open");

  const cerrar = () => {
    localStorage.setItem("ort_intro_visto", "1");
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => modal.remove(), 220);
    document.removeEventListener("keydown", porEscape);
  };
  const porEscape = (e) => { if (e.key === "Escape") cerrar(); };

  modal.querySelector(".modal__cerrar").addEventListener("click", cerrar);
  modal.querySelector(".modal__despues").addEventListener("click", cerrar);
  modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });
  modal.querySelector(".btn--primary").addEventListener("click", () =>
    localStorage.setItem("ort_intro_visto", "1")
  );
  document.addEventListener("keydown", porEscape);
  modal.querySelector(".modal__cerrar").focus();
}

/* ---------------------------------------------------------------- init */

(async function init() {
  skeletons();
  try {
    datos = await listRankings();
    pintarStats();
    pintar();
    if (!datos.length) popupBienvenida();
  } catch (err) {
    lista.innerHTML = `
      <div class="notice notice--err">${ICON.alerta}
        <div><strong>No se pudo cargar el ranking.</strong><br>${esc(err.message)}</div>
      </div>`;
  }
})();

let t;
inputQ.addEventListener("input", () => { clearTimeout(t); t = setTimeout(pintar, 140); });
selOrden.addEventListener("change", pintar);
