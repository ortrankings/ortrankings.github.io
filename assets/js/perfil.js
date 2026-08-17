/* =====================================================================
   Perfil individual
   ===================================================================== */

import { getPerfil, listRankings, votar, yaVoto } from "./db.js";
import { SITE } from "./config.js";
import {
  $, ICON, esc, montarNav, montarFooter, pillMovimiento, avatarFallback,
  igLimpio, toast, sinPuesto, etiquetaPuesto, TITULO_BOSS,
} from "./ui.js";

montarNav("rankings");
montarFooter();
$("#backIcon").innerHTML = ICON.atras;

const cont = $("#contenido");
const id = new URLSearchParams(location.search).get("id");

/* ------------------------------------------------------------- helpers */

function contarHasta(el, destino) {
  const desde = Number(el.dataset.v || 0);
  el.dataset.v = destino;

  // En pestañas en segundo plano requestAnimationFrame no corre: si animáramos,
  // el número quedaría clavado en 0. Ahí escribimos el valor final y listo.
  const sinAnimacion =
    document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (sinAnimacion || desde === destino) {
    el.textContent = destino;
    return;
  }

  const dur = 700;
  const t0 = performance.now();
  (function paso(t) {
    const k = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(desde + (destino - desde) * eased);
    if (k < 1) requestAnimationFrame(paso);
    else el.textContent = destino;
  })(t0);
}

function abrirLightbox(src) {
  const lb = $("#lightbox");
  lb.querySelector("img").src = src;
  lb.classList.add("is-open");
}
$("#lightbox").addEventListener("click", (e) => e.currentTarget.classList.remove("is-open"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("#lightbox").classList.remove("is-open");
});

/* -------------------------------------------------------------- render */

function render(p, vecinos) {
  document.title = sinPuesto(p.puesto)
    ? `${p.nombre} — ORT Rankings`
    : `${p.nombre} · #${p.puesto} — ORT Rankings`;
  const esBoss = p.puesto === 1;
  const medalla = esBoss
    ? " profile__rank--boss"
    : (!sinPuesto(p.puesto) && p.puesto <= 3 ? ` profile__rank--${p.puesto}` : "");
  const textoPuesto = sinPuesto(p.puesto)
    ? "PUESTO NO ASIGNADO"
    : (esBoss ? TITULO_BOSS : `PUESTO #${p.puesto}`);
  const foto = p.foto_frente || avatarFallback(p.nombre);
  const ig = igLimpio(p.instagram);
  const votado = yaVoto(p.id);

  cont.innerHTML = `
    <section class="profile__hero${esBoss ? " is-champion" : ""}">
      <span class="profile__watermark" aria-hidden="true">${etiquetaPuesto(p.puesto)}</span>
      <img class="profile__photo" src="${esc(foto)}" alt="${esc(p.nombre)}"
           id="fotoGrande" onerror="this.src='${avatarFallback(p.nombre)}'">
      <div class="profile__overlay">
        <div class="profile__rank${medalla}">
          ${esBoss ? ICON.fuego : ICON.trofeo} ${textoPuesto}
        </div>
        <h1 class="profile__name">${esc(p.nombre)}</h1>
        ${p.tagline ? `<p class="profile__tag">${esc(p.tagline)}</p>` : ""}
        <div class="profile__chips">
          ${pillMovimiento(p.puesto, p.puesto_anterior)}
          ${p.carrera ? `<span class="chip">${esc(p.carrera)}</span>` : ""}
          <span class="chip chip--verificado">${ICON.escudo} Verificado</span>
        </div>
      </div>
    </section>

    <div class="cards">
      <div class="vote-box">
        <div>
          <div class="vote-count" id="voteCount" data-v="0">0</div>
          <div class="muted">votos de la comunidad</div>
        </div>
        <button class="btn btn--primary" id="btnVotar" ${votado ? "disabled" : ""}>
          ${votado ? ICON.check : ICON.voto} ${votado ? "Ya votaste" : "Votar"}
        </button>
      </div>

      ${p.dato ? `
      <div class="card card--full">
        <h3>Dato a considerar</h3>
        <p>${esc(p.dato)}</p>
      </div>` : ""}

      <div class="card">
        <h3>Carrera</h3>
        <p>${esc(p.carrera || "No especificada")}</p>
      </div>

      <div class="card">
        <h3>Instagram</h3>
        <p>${ig
          ? `<a class="ig-link" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">${ICON.instagram} @${esc(ig)}</a>`
          : `<span class="muted">No compartido</span>`}</p>
      </div>

      <div class="card card--full profile__acciones">
        <button class="btn btn--ghost" id="btnCompartir">${ICON.chispa} Compartir perfil</button>
        <button class="btn btn--ghost" id="btnBaja">${ICON.escudo} Solicitar la baja</button>
      </div>

      <div class="card--full" id="avisoBaja"></div>
    </div>

    <nav class="vecinos">
      ${vecinos.prev
        ? `<a class="vecino" href="/perfil/?id=${encodeURIComponent(vecinos.prev.id)}">
             <span>${ICON.atras}</span>
             <div><small>${sinPuesto(vecinos.prev.puesto) ? "Sin puesto" : "Puesto #" + vecinos.prev.puesto}</small>${esc(vecinos.prev.nombre)}</div>
           </a>`
        : `<span></span>`}
      ${vecinos.next
        ? `<a class="vecino vecino--der" href="/perfil/?id=${encodeURIComponent(vecinos.next.id)}">
             <div><small>${sinPuesto(vecinos.next.puesto) ? "Sin puesto" : "Puesto #" + vecinos.next.puesto}</small>${esc(vecinos.next.nombre)}</div>
             <span>${ICON.chevron}</span>
           </a>`
        : `<span></span>`}
    </nav>`;

  contarHasta($("#voteCount"), p.votos || 0);
  $("#fotoGrande").addEventListener("click", () => abrirLightbox(foto));

  $("#btnVotar").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const total = await votar(p.id);
      contarHasta($("#voteCount"), total);
      btn.innerHTML = `${ICON.check} Ya votaste`;
      toast("¡Voto registrado!");
    } catch (err) {
      btn.innerHTML = `${ICON.check} Ya votaste`;
      toast(err.message, "err");
    }
  });

  $("#btnCompartir").addEventListener("click", async () => {
    const url = location.href;
    const texto = `${p.nombre} está #${p.puesto} en ORT Rankings`;
    try {
      if (navigator.share) await navigator.share({ title: texto, text: texto, url });
      else { await navigator.clipboard.writeText(url); toast("Link copiado"); }
    } catch { /* el usuario canceló */ }
  });

  // La baja NO es automática: se pide por DM y la verificamos antes de sacar el perfil.
  $("#btnBaja").addEventListener("click", () => {
    const caja = $("#avisoBaja");
    if (caja.innerHTML) { caja.innerHTML = ""; return; }
    caja.innerHTML = `
      <div class="notice notice--warn">${ICON.info}
        <div>
          <strong>Las bajas se piden por mensaje directo.</strong><br>
          Escribinos por DM a <strong>@${esc(SITE.instagram)}</strong> desde tu cuenta,
          contándonos que querés salir del ranking. Vamos a verificar que seas vos
          antes de dar de baja el perfil.
          <div style="margin-top:11px">
            <a class="btn btn--primary btn--sm"
               href="https://ig.me/m/${esc(SITE.instagram)}" target="_blank" rel="noopener">
              ${ICON.instagram} Abrir el DM
            </a>
          </div>
        </div>
      </div>`;
    caja.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/* ---------------------------------------------------------------- init */

(async function init() {
  if (!id) { location.replace("/"); return; }

  cont.innerHTML = `<div class="skeleton" style="height:60vh;border-radius:22px"></div>`;
  try {
    const [p, todos] = await Promise.all([getPerfil(id), listRankings()]);
    if (!p) {
      cont.innerHTML = `
        <div class="empty">${ICON.vacio}
          <h3>Perfil no encontrado</h3>
          <p>Este perfil ya no está en el ranking o el link es incorrecto.</p>
          <a class="btn btn--primary" href="/">Ver el ranking</a>
        </div>`;
      return;
    }
    const i = todos.findIndex((r) => r.id === p.id);
    render(p, { prev: todos[i - 1] || null, next: todos[i + 1] || null });
  } catch (err) {
    cont.innerHTML = `<div class="notice notice--err">${ICON.alerta}<div>${esc(err.message)}</div></div>`;
  }
})();
