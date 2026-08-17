/* =====================================================================
   Panel de administración
   ===================================================================== */

import {
  DEMO, sesion, login, logout,
  listSolicitudes, aceptarSolicitud, rechazarSolicitud, reabrirSolicitud, borrarSolicitud,
  listRankingsAdmin, actualizarPerfil, borrarPerfil, publicarOrden,
} from "./db.js";
import {
  $, $$, ICON, esc, montarNav, montarFooter, avatarFallback, igLimpio,
  pillMovimiento, toast,
} from "./ui.js";

const vista = $("#vista");
let ranking = [];        // orden actual en pantalla
let rankingOriginal = []; // orden tal como está en la base
let tabActual = "pendientes";

/* ----------------------------------------------------------- lightbox */

function abrirLightbox(src) {
  const lb = $("#lightbox");
  lb.querySelector("img").src = src;
  lb.classList.add("is-open");
}
$("#lightbox").addEventListener("click", (e) => e.currentTarget.classList.remove("is-open"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("#lightbox").classList.remove("is-open");
});
document.addEventListener("click", (e) => {
  const img = e.target.closest("[data-zoom]");
  if (img) abrirLightbox(img.src);
});

/* ---------------------------------------------------------- arranque */

$("#iconCandado").innerHTML = ICON.candado;
$("#iconSalir").innerHTML = ICON.salir;

(async function arranque() {
  if (DEMO) {
    $("#login").hidden = false;
    $("#loginAlerta").innerHTML = `
      <div class="notice notice--warn" style="margin-bottom:15px">${ICON.alerta}
        <div><strong>Modo demo.</strong> Cargá tu URL y tu clave anon en
        <code>assets/js/config.js</code> para poder entrar al panel.</div>
      </div>`;
    $("#formLogin").querySelectorAll("input,button").forEach((el) => (el.disabled = true));
    return;
  }
  const s = await sesion();
  if (s) entrarAlPanel(s);
  else $("#login").hidden = false;
})();

$("#formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#btnLogin");
  btn.disabled = true;
  btn.textContent = "Entrando…";
  $("#loginAlerta").innerHTML = "";
  try {
    const s = await login($("#email").value.trim(), $("#pass").value);
    $("#login").hidden = true;
    entrarAlPanel(s);
  } catch (err) {
    $("#loginAlerta").innerHTML = `
      <div class="notice notice--err" style="margin-bottom:15px">${ICON.alerta}<div>${esc(err.message)}</div></div>`;
    btn.disabled = false;
    btn.innerHTML = `${ICON.candado} Entrar`;
  }
});

function entrarAlPanel(s) {
  $("#panel").hidden = false;
  montarNav();
  montarFooter();
  $("#quien").textContent = `Sesión iniciada como ${s?.user?.email || "admin"}`;
  $("#btnSalir").addEventListener("click", async () => {
    await logout();
    location.reload();
  });
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.remove("is-active"));
      t.classList.add("is-active");
      tabActual = t.dataset.tab;
      cargarTab();
    })
  );
  refrescarContadores();
  cargarTab();
}

async function refrescarContadores() {
  try {
    const [pend, rech, rank] = await Promise.all([
      listSolicitudes("pendiente"),
      listSolicitudes("rechazada"),
      listRankingsAdmin(),
    ]);
    $("#cPend").textContent = pend.length;
    $("#cRech").textContent = rech.length;
    $("#cRank").textContent = rank.length;
  } catch { /* silencioso */ }
}

function cargando() {
  vista.innerHTML = Array.from({ length: 3 }, () => `<div class="skeleton" style="height:150px;margin-bottom:11px"></div>`).join("");
}

function error(err) {
  vista.innerHTML = `<div class="notice notice--err">${ICON.alerta}<div>${esc(err.message)}</div></div>`;
}

function cargarTab() {
  if (tabActual === "pendientes") verSolicitudes("pendiente");
  else if (tabActual === "rechazadas") verSolicitudes("rechazada");
  else verRanking();
}

/* -------------------------------------------------------- solicitudes */

function tarjetaSolicitud(s, esPendiente) {
  const ig = igLimpio(s.instagram);
  return `
    <article class="sol-card" data-id="${s.id}">
      <div class="sol-head">
        <div class="sol-photos">
          <img src="${esc(s.foto_perfil)}" alt="Foto de perfil" data-zoom
               onerror="this.src='${avatarFallback(s.nombre)}'">
          <img src="${esc(s.foto_frente)}" alt="Foto de frente" data-zoom
               onerror="this.src='${avatarFallback(s.nombre)}'">
        </div>
        <div class="sol-meta">
          <h3>${esc(s.nombre)}</h3>
          <dl class="kv">
            <dt>N.º estudiante</dt><dd class="secret">${esc(s.numero_estudiante)}</dd>
            <dt>Carrera</dt><dd>${esc(s.carrera)}</dd>
            <dt>Instagram</dt>
            <dd>${ig ? `<a href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">@${esc(ig)}</a>` : "—"}</dd>
            <dt>Dato</dt><dd>${esc(s.dato || "—")}</dd>
            <dt>Enviada</dt><dd>${new Date(s.creado).toLocaleString("es-UY")}</dd>
            ${s.nota_admin ? `<dt>Nota</dt><dd>${esc(s.nota_admin)}</dd>` : ""}
          </dl>
        </div>
      </div>

      ${esPendiente ? `
      <div class="sol-actions">
        <input class="input input--wide" placeholder="Tagline (ej. Genetic Apex)" data-tagline maxlength="60">
        <input class="input" type="number" min="1" placeholder="Puesto" data-puesto
               aria-label="Puesto (dejalo vacío para no asignar todavía)">
        <button class="btn btn--ok btn--sm" data-aceptar>${ICON.check} Aceptar</button>
        <button class="btn btn--danger btn--sm" data-rechazar>Rechazar</button>
      </div>` : `
      <div class="sol-actions">
        <button class="btn btn--ghost btn--sm" data-reabrir>Volver a pendientes</button>
        <button class="btn btn--danger btn--sm" data-borrar>${ICON.papelera} Borrar</button>
      </div>`}
    </article>`;
}

async function verSolicitudes(estado) {
  cargando();
  try {
    const sols = await listSolicitudes(estado);

    if (!sols.length) {
      vista.innerHTML = `
        <div class="empty">${ICON.vacio}
          <h3>${estado === "pendiente" ? "No hay solicitudes pendientes" : "No hay solicitudes rechazadas"}</h3>
          <p>${estado === "pendiente" ? "Cuando alguien se postule desde /entrar aparece acá." : ""}</p>
        </div>`;
      return;
    }

    vista.innerHTML = sols
      .map((s) => tarjetaSolicitud(s, estado === "pendiente"))
      .join("");

    vista.querySelectorAll("[data-aceptar]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const card = btn.closest(".sol-card");
        const sol = sols.find((x) => x.id === card.dataset.id);
        const crudo = card.querySelector("[data-puesto]").value.trim();
        const puesto = crudo === "" ? null : Number(crudo);   // vacío = sin puesto asignado
        const tagline = card.querySelector("[data-tagline]").value.trim();
        if (puesto !== null && (!Number.isInteger(puesto) || puesto < 1)) {
          toast("Puesto inválido: poné un número entero o dejalo vacío", "err");
          return;
        }
        btn.disabled = true;
        try {
          await aceptarSolicitud(sol, { puesto, tagline });
          toast(puesto === null ? `${sol.nombre} entró sin puesto asignado` : `${sol.nombre} entró al puesto #${puesto}`);
          card.remove();
          refrescarContadores();
        } catch (err) { toast(err.message, "err"); btn.disabled = false; }
      })
    );

    vista.querySelectorAll("[data-rechazar]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const card = btn.closest(".sol-card");
        const nota = prompt("Motivo del rechazo (opcional, queda solo para vos):") ?? "";
        btn.disabled = true;
        try {
          await rechazarSolicitud(card.dataset.id, nota);
          toast("Solicitud rechazada");
          card.remove();
          refrescarContadores();
        } catch (err) { toast(err.message, "err"); btn.disabled = false; }
      })
    );

    vista.querySelectorAll("[data-reabrir]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const card = btn.closest(".sol-card");
        try {
          await reabrirSolicitud(card.dataset.id);
          toast("Vuelve a pendientes");
          card.remove();
          refrescarContadores();
        } catch (err) { toast(err.message, "err"); }
      })
    );

    vista.querySelectorAll("[data-borrar]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("¿Borrar la solicitud definitivamente?")) return;
        const card = btn.closest(".sol-card");
        try {
          await borrarSolicitud(card.dataset.id);
          toast("Solicitud borrada");
          card.remove();
          refrescarContadores();
        } catch (err) { toast(err.message, "err"); }
      })
    );
  } catch (err) { error(err); }
}

/* ------------------------------------------------------------ ranking */

function filaRanking(p, i) {
  return `
    <div class="order-row" draggable="true" data-id="${p.id}" data-idx="${i}">
      <span class="grip">${ICON.grip}</span>
      <span class="pos">${i + 1}</span>
      <img src="${esc(p.foto_frente || "")}" alt="" onerror="this.src='${avatarFallback(p.nombre)}'">
      <div class="nm">
        ${esc(p.nombre)}${p.activo ? "" : ' <span class="pill pill--flat">oculto</span>'}
        <small>${esc(p.tagline || p.carrera || "—")} · ${p.votos || 0} votos</small>
      </div>
      ${pillMovimiento(p.puesto, p.puesto_anterior)}
      <div class="order-arrows">
        <button type="button" data-sube aria-label="Subir">${ICON.flechaArriba}</button>
        <button type="button" data-baja aria-label="Bajar">${ICON.flechaAbajo}</button>
      </div>
      <button class="btn btn--ghost btn--sm" data-editar>Editar</button>
      <button class="btn btn--danger btn--sm" data-borrar-perfil
              aria-label="Borrar del ranking" title="Borrar del ranking">${ICON.papelera}</button>
    </div>`;
}

function pintarRanking() {
  const cambio = ranking.some((p, i) => rankingOriginal[i]?.id !== p.id);
  vista.innerHTML = `
    <div class="notice notice--info" style="margin-bottom:13px">${ICON.info}
      <div>Arrastrá o usá las flechas para reordenar. Al publicar, el sitio calcula solo
      las flechas verdes y rojas de movimiento comparando con el orden anterior.</div>
    </div>
    <div id="filas">${ranking.map(filaRanking).join("")}</div>
    <div class="sticky-save" ${cambio ? "" : 'style="display:none"'} id="barraGuardar">
      <p>Hay cambios sin publicar.</p>
      <button class="btn btn--ghost btn--sm" id="btnDeshacer">Deshacer</button>
      <button class="btn btn--primary btn--sm" id="btnPublicar">Publicar orden</button>
    </div>`;

  conectarFilas();
}

function conectarFilas() {
  const cont = $("#filas");
  if (!cont) return;

  cont.querySelectorAll("[data-sube]").forEach((b) =>
    b.addEventListener("click", () => mover(Number(b.closest(".order-row").dataset.idx), -1))
  );
  cont.querySelectorAll("[data-baja]").forEach((b) =>
    b.addEventListener("click", () => mover(Number(b.closest(".order-row").dataset.idx), 1))
  );
  cont.querySelectorAll("[data-editar]").forEach((b) =>
    b.addEventListener("click", () => editar(b.closest(".order-row").dataset.id))
  );

  cont.querySelectorAll("[data-borrar-perfil]").forEach((b) =>
    b.addEventListener("click", async () => {
      const fila = b.closest(".order-row");
      const p = ranking.find((x) => x.id === fila.dataset.id);
      if (!confirm(`¿Borrar a "${p?.nombre}" del ranking?\n\nSe elimina el perfil y sus votos. No se puede deshacer.`)) return;
      b.disabled = true;
      try {
        await borrarPerfil(fila.dataset.id);
        toast("Perfil borrado");
        await verRanking();
      } catch (err) { toast(err.message, "err"); b.disabled = false; }
    })
  );

  let arrastrado = null;
  cont.querySelectorAll(".order-row").forEach((row) => {
    row.addEventListener("dragstart", () => { arrastrado = row; row.classList.add("is-drag"); });
    row.addEventListener("dragend", () => { row.classList.remove("is-drag"); arrastrado = null; });
    row.addEventListener("dragover", (e) => { e.preventDefault(); row.classList.add("is-over"); });
    row.addEventListener("dragleave", () => row.classList.remove("is-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("is-over");
      if (!arrastrado || arrastrado === row) return;
      const desde = Number(arrastrado.dataset.idx);
      const hasta = Number(row.dataset.idx);
      const [item] = ranking.splice(desde, 1);
      ranking.splice(hasta, 0, item);
      pintarRanking();
    });
  });

  $("#btnDeshacer")?.addEventListener("click", () => { ranking = [...rankingOriginal]; pintarRanking(); });
  $("#btnPublicar")?.addEventListener("click", publicar);
}

function mover(idx, delta) {
  const destino = idx + delta;
  if (destino < 0 || destino >= ranking.length) return;
  [ranking[idx], ranking[destino]] = [ranking[destino], ranking[idx]];
  pintarRanking();
}

async function publicar() {
  const btn = $("#btnPublicar");
  btn.disabled = true;
  btn.textContent = "Publicando…";
  try {
    const filas = ranking.map((p, i) => ({
      id: p.id,
      puestoViejo: p.puesto,      // el que tenía antes de este cambio
      puestoNuevo: i + 1,
    }));
    await publicarOrden(filas);
    toast("Orden publicado");
    await verRanking();
  } catch (err) {
    toast(err.message, "err");
    btn.disabled = false;
    btn.textContent = "Publicar orden";
  }
}

async function editar(id) {
  const p = ranking.find((x) => x.id === id);
  if (!p) return;

  const nombre = prompt("Nombre:", p.nombre);
  if (nombre === null) return;
  const tagline = prompt("Tagline (ej. Genetic Apex):", p.tagline || "");
  if (tagline === null) return;
  const dato = prompt("Dato a considerar:", p.dato || "");
  if (dato === null) return;
  const instagram = prompt("Instagram (sin @):", p.instagram || "");
  if (instagram === null) return;
  const visible = confirm("¿Que el perfil esté VISIBLE en el sitio?\n\nAceptar = visible · Cancelar = oculto");

  try {
    await actualizarPerfil(id, {
      nombre: nombre.trim(),
      tagline: tagline.trim() || null,
      dato: dato.trim() || null,
      instagram: igLimpio(instagram) || null,
      activo: visible,
    });
    toast("Perfil actualizado");
    await verRanking();
  } catch (err) { toast(err.message, "err"); }
}

async function verRanking() {
  cargando();
  try {
    rankingOriginal = await listRankingsAdmin();
    ranking = [...rankingOriginal];
    if (!ranking.length) {
      vista.innerHTML = `
        <div class="empty">${ICON.vacio}
          <h3>El ranking está vacío</h3>
          <p>Aceptá una solicitud desde la pestaña Pendientes para empezar.</p>
        </div>`;
      return;
    }
    pintarRanking();
    refrescarContadores();
  } catch (err) { error(err); }
}
