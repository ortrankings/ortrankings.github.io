/* =====================================================================
   Panel de administración
   ===================================================================== */

import {
  DEMO, sesion, login, logout,
  listSolicitudes, aceptarSolicitud, rechazarSolicitud, reabrirSolicitud, borrarSolicitud,
  listRankingsAdmin, actualizarPerfil, borrarPerfil, publicarOrden,
  intercambiarFotos, reemplazarFoto, listCopes, borrarCope,
} from "./db.js";
import {
  $, $$, ICON, esc, montarNav, montarFooter, avatarFallback, igLimpio,
  pillMovimiento, toast, CATEGORIAS, totalScore, etiquetaPuesto, sinPuesto,
} from "./ui.js";

const vista = $("#vista");
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
    const [pend, rech, rank, copes] = await Promise.all([
      listSolicitudes("pendiente"),
      listSolicitudes("rechazada"),
      listRankingsAdmin(),
      listCopes(),
    ]);
    $("#cPend").textContent = pend.length;
    $("#cRech").textContent = rech.length;
    $("#cRank").textContent = rank.length;
    $("#cCope").textContent = copes.length;
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
  else if (tabActual === "cope") verCopes();
  else verRanking();
}

/* -------------------------------------------------------- solicitudes */

function tarjetaSolicitud(s, esPendiente, puestoSugerido) {
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
               value="${puestoSugerido}" aria-label="Puesto (vacio = sin asignar)">
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
    const [sols, rank] = await Promise.all([listSolicitudes(estado), listRankingsAdmin()]);
    const ocupados = rank.map((r) => r.puesto).filter((n) => Number.isInteger(n));
    const puestoSugerido = ocupados.length ? Math.max(...ocupados) + 1 : 1;

    if (!sols.length) {
      vista.innerHTML = `
        <div class="empty">${ICON.vacio}
          <h3>${estado === "pendiente" ? "No hay solicitudes pendientes" : "No hay solicitudes rechazadas"}</h3>
          <p>${estado === "pendiente" ? "Cuando alguien se postule desde /entrar aparece acá." : ""}</p>
        </div>`;
      return;
    }

    vista.innerHTML = sols
      .map((s) => tarjetaSolicitud(s, estado === "pendiente", puestoSugerido))
      .join("");

    vista.querySelectorAll("[data-aceptar]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const card = btn.closest(".sol-card");
        const sol = sols.find((x) => x.id === card.dataset.id);
        const tagline = card.querySelector("[data-tagline]").value.trim();
        const crudo = card.querySelector("[data-puesto]").value.trim();
        const puesto = crudo === "" ? null : Number(crudo);
        if (puesto !== null && (!Number.isInteger(puesto) || puesto < 1)) {
          toast("Puesto invalido: un numero entero, o vacio para no asignar", "err");
          return;
        }
        btn.disabled = true;
        try {
          await aceptarSolicitud(sol, { puesto, tagline });
          toast(puesto === null ? `${sol.nombre} entro sin puesto` : `${sol.nombre} entro al puesto #${puesto}`);
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
/* El puesto ya no se guarda: sale de ordenar por puntaje. Acá solo se ve
   ese orden y se puede editar cada perfil o cerrar la edición actual. */

let ranking = [];
let rankingOriginal = [];

function filaRanking(p, i) {
  const oculto = !p.activo;
  return `
    <div class="order-row${oculto ? " order-row--oculto" : ""}" data-id="${p.id}" data-idx="${i}">
      <span class="pos">${etiquetaPuesto(p.puesto)}</span>
      <img src="${esc(p.foto_frente || "")}" alt="" onerror="this.src='${avatarFallback(p.nombre)}'">
      <div class="nm">
        ${esc(p.nombre)}${oculto ? ' <span class="pill pill--flat">oculto</span>' : ""}
        ${p.etiqueta_principal ? `<span class="pill pill--new" style="background:none;color:var(--gold)">${esc(p.etiqueta_principal)}</span>` : ""}
        <small>${esc(p.tagline || p.carrera || "—")} · base #${p.puesto_base ?? "—"}${
          p.desplazamiento ? ` ${p.desplazamiento > 0 ? "▲" : "▼"}${Math.abs(p.desplazamiento)} por votos` : ""
        } · ${p.votos || 0} votos · ${p.copes || 0} cope</small>
      </div>
      ${!oculto ? pillMovimiento(p.puesto, p.puesto_anterior) : ""}
      <div class="order-arrows">
        <button type="button" data-sube aria-label="Subir">${ICON.flechaArriba}</button>
        <button type="button" data-baja aria-label="Bajar">${ICON.flechaAbajo}</button>
      </div>
      <button class="btn btn--ghost btn--sm" data-fotos title="Cambiar la foto que se ve">Foto</button>
      <button class="btn btn--ghost btn--sm" data-score title="Cargar el Influence Breakdown">
        Score ${totalScore(p) || "—"}
      </button>
      <button class="btn btn--ghost btn--sm" data-editar>Editar</button>
      <button class="btn btn--danger btn--sm" data-borrar-perfil
              aria-label="Borrar del ranking" title="Borrar del ranking">${ICON.papelera}</button>
    </div>`;
}

function pintarRanking() {
  vista.innerHTML = `
    <div class="notice notice--info" style="margin-bottom:13px">${ICON.info}
      <div>Vos asignás el <strong>puesto base</strong>; desde ahí lo mueven los votos:
      cada <strong>5 votos netos</strong> (votos menos COPE) vale un lugar, en vivo.
      Con las flechitas y <strong>Publicar orden</strong> reasignás las bases.</div>
    </div>
    <div id="filas">${ranking.map(filaRanking).join("")}</div>
    <div class="sticky-save" ${hayCambios() ? "" : 'style="display:none"'}>
      <p>Hay cambios sin publicar.</p>
      <button class="btn btn--ghost btn--sm" id="btnDeshacer">Deshacer</button>
      <button class="btn btn--primary btn--sm" id="btnPublicar">Publicar orden</button>
    </div>`;

  conectarFilas();
}

function conectarFilas() {
  const cont = $("#filas");
  if (!cont) return;

  cont.querySelectorAll("[data-editar]").forEach((b) =>
    b.addEventListener("click", () => editar(b.closest(".order-row").dataset.id))
  );

  cont.querySelectorAll("[data-fotos]").forEach((b) =>
    b.addEventListener("click", () => panelFotos(b.closest(".order-row").dataset.id))
  );

  cont.querySelectorAll("[data-score]").forEach((b) =>
    b.addEventListener("click", () => panelScore(b.closest(".order-row").dataset.id))
  );

  cont.querySelectorAll("[data-borrar-perfil]").forEach((b) =>
    b.addEventListener("click", async () => {
      const fila = b.closest(".order-row");
      const p = ranking.find((x) => x.id === fila.dataset.id);
      if (!confirm(`¿Borrar a "${p?.nombre}" del ranking?\n\nSe elimina el perfil, sus votos y sus copes. No se puede deshacer.`)) return;
      b.disabled = true;
      try {
        await borrarPerfil(fila.dataset.id);
        toast("Perfil borrado");
        await verRanking();
      } catch (err) { toast(err.message, "err"); b.disabled = false; }
    })
  );

  cont.querySelectorAll("[data-sube]").forEach((b) =>
    b.addEventListener("click", () => mover(Number(b.closest(".order-row").dataset.idx), -1))
  );
  cont.querySelectorAll("[data-baja]").forEach((b) =>
    b.addEventListener("click", () => mover(Number(b.closest(".order-row").dataset.idx), 1))
  );

  $("#btnDeshacer")?.addEventListener("click", () => { ranking = [...rankingOriginal]; pintarRanking(); });
  $("#btnPublicar")?.addEventListener("click", publicar);
}

/** Mueve una fila y renumera: el puesto pasa a ser la posición en la lista. */
function mover(idx, delta) {
  const destino = idx + delta;
  if (destino < 0 || destino >= ranking.length) return;
  [ranking[idx], ranking[destino]] = [ranking[destino], ranking[idx]];
  ranking = ranking.map((p, i) => ({ ...p, puesto: p.activo ? i + 1 : null }));
  pintarRanking();
}

const hayCambios = () => ranking.some((p, i) => rankingOriginal[i]?.id !== p.id);

async function publicar() {
  const btn = $("#btnPublicar");
  btn.disabled = true;
  btn.textContent = "Publicando…";
  try {
    const filas = ranking
      .filter((p) => p.activo)
      .map((p, i) => {
        const original = rankingOriginal.find((o) => o.id === p.id);
        return { id: p.id, puestoViejo: original?.puesto ?? null, puestoNuevo: i + 1 };
      });
    await publicarOrden(filas);
    toast("Orden publicado");
    await verRanking();
  } catch (err) {
    toast(err.message, "err");
    btn.disabled = false;
    btn.textContent = "Publicar orden";
  }
}

/**
 * Panel para arreglar la foto de un perfil: si la persona subió las dos al
 * revés, se intercambian; si las dos están mal, se sube una nueva.
 */
function panelFotos(id) {
  const p = ranking.find((x) => x.id === id);
  if (!p) return;

  const fila = document.querySelector(`.order-row[data-id="${id}"]`);
  const previo = fila.nextElementSibling;
  if (previo?.classList.contains("panel-fotos")) { previo.remove(); return; }

  const caja = document.createElement("div");
  caja.className = "panel-fotos";
  caja.innerHTML = `
    <div class="panel-fotos__grid">
      <div class="panel-fotos__slot">
        <span class="drop__tag drop__tag--publica">SE PUBLICA</span>
        <img src="${esc(p.foto_frente || "")}" alt="Foto publicada" data-zoom
             onerror="this.src='${avatarFallback(p.nombre)}'">
      </div>
      <div class="panel-fotos__slot">
        <span class="drop__tag drop__tag--privada">GUARDADA</span>
        ${p.foto_alt
          ? `<img src="${esc(p.foto_alt)}" alt="Foto alternativa" data-zoom
                  onerror="this.src='${avatarFallback(p.nombre)}'">`
          : `<div class="panel-fotos__vacio">Sin segunda foto</div>`}
      </div>
    </div>
    <div class="sol-actions">
      <button class="btn btn--ok btn--sm" data-swap ${p.foto_alt ? "" : "disabled"}>
        Intercambiar
      </button>
      <label class="btn btn--ghost btn--sm" style="cursor:pointer">
        Subir otra
        <input type="file" accept="image/*" data-subir hidden>
      </label>
      <button class="btn btn--ghost btn--sm" data-cerrar>Cerrar</button>
    </div>`;
  fila.after(caja);

  caja.querySelector("[data-cerrar]").addEventListener("click", () => caja.remove());

  caja.querySelector("[data-swap]")?.addEventListener("click", async (e) => {
    e.currentTarget.disabled = true;
    try {
      await intercambiarFotos(id);
      toast("Fotos intercambiadas");
      await verRanking();
    } catch (err) { toast(err.message, "err"); e.currentTarget.disabled = false; }
  });

  caja.querySelector("[data-subir]").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Ese archivo no es una imagen", "err"); return; }
    toast("Subiendo…");
    try {
      await reemplazarFoto(id, file);
      toast("Foto reemplazada");
      await verRanking();
    } catch (err) { toast(err.message, "err"); }
  });
}

/**
 * Influence Breakdown: puntaje MANUAL de 6 categorías que suman sobre 100.
 * Es informativo — no mueve el puesto, que lo siguen definiendo los votos.
 */
function panelScore(id) {
  const p = ranking.find((x) => x.id === id);
  if (!p) return;

  const fila = document.querySelector(`.order-row[data-id="${id}"]`);
  const previo = fila.nextElementSibling;
  if (previo?.classList.contains("panel-score")) { previo.remove(); return; }
  fila.nextElementSibling?.classList.contains("panel-fotos") && fila.nextElementSibling.remove();

  const caja = document.createElement("div");
  caja.className = "panel-fotos panel-score";
  caja.innerHTML = `
    <div class="score-grid">
      ${CATEGORIAS.map(
        (c) => `
        <label class="score-campo">
          <span>${c.nombre}</span>
          <input class="input" type="number" min="0" max="100" data-campo="${c.campo}"
                 value="${Number(p[c.campo]) || 0}">
        </label>`
      ).join("")}
    </div>
    <div class="score-total">
      Total: <b id="scoreTotal">0</b> / 100
      <span class="muted" id="scoreAviso"></span>
    </div>
    <div class="sol-actions">
      <button class="btn btn--ok btn--sm" data-guardar>Guardar</button>
      <button class="btn btn--ghost btn--sm" data-cerrar>Cerrar</button>
    </div>`;
  fila.after(caja);

  const inputs = [...caja.querySelectorAll("[data-campo]")];
  const recalcular = () => {
    const total = inputs.reduce((a, i) => a + (Number(i.value) || 0), 0);
    caja.querySelector("#scoreTotal").textContent = total;
    caja.querySelector("#scoreAviso").textContent =
      total > 100 ? "  ← te pasaste de 100" : total ? "" : "  (sin puntuar, no se muestra el gráfico)";
    caja.querySelector("#scoreTotal").style.color = total > 100 ? "var(--down)" : "";
  };
  inputs.forEach((i) => i.addEventListener("input", recalcular));
  recalcular();

  caja.querySelector("[data-cerrar]").addEventListener("click", () => caja.remove());

  caja.querySelector("[data-guardar]").addEventListener("click", async (e) => {
    const total = inputs.reduce((a, i) => a + (Number(i.value) || 0), 0);
    if (total > 100 && !confirm(`El total da ${total}, más de 100. ¿Guardar igual?`)) return;
    const campos = {};
    inputs.forEach((i) => { campos[i.dataset.campo] = Math.max(0, Number(i.value) || 0); });
    e.currentTarget.disabled = true;
    try {
      await actualizarPerfil(id, campos);
      toast(`Score guardado: ${total}/100`);
      await verRanking();
    } catch (err) { toast(err.message, "err"); e.currentTarget.disabled = false; }
  });
}

async function editar(id) {
  const p = ranking.find((x) => x.id === id);
  if (!p) return;

  const puestoTexto = prompt(
    `Puesto BASE de ${p.nombre} (desde ahi lo mueven los votos).
Vacio = sin puesto:`,
    p.puesto_base ?? ""
  );
  if (puestoTexto === null) return;
  const puestoBase = puestoTexto.trim() === "" ? null : Number(puestoTexto.trim());
  if (puestoBase !== null && (!Number.isInteger(puestoBase) || puestoBase < 1)) {
    toast("Puesto invalido: un numero entero, o vacio", "err");
    return;
  }

  const nombre = prompt("Nombre:", p.nombre);
  if (nombre === null) return;
  const tagline = prompt("Tagline (ej. Genetic Apex):", p.tagline || "");
  if (tagline === null) return;
  const etiquetaPrincipal = prompt(
    "Etiqueta principal (destacada en dorado junto al nombre, ej. Current Protagonist). Vacío para sacarla:",
    p.etiqueta_principal || ""
  );
  if (etiquetaPrincipal === null) return;
  const etiquetasTexto = prompt(
    "Etiquetas, separadas por coma (ej. genetics, hunter eyes, chad):",
    (p.etiquetas || []).join(", ")
  );
  if (etiquetasTexto === null) return;
  const dato = prompt("Dato a considerar:", p.dato || "");
  if (dato === null) return;
  const instagram = prompt("Instagram (sin @):", p.instagram || "");
  if (instagram === null) return;
  const visible = confirm("¿Que el perfil esté VISIBLE en el sitio?\n\nAceptar = visible · Cancelar = oculto");

  const etiquetas = etiquetasTexto.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12);

  try {
    await actualizarPerfil(id, {
      puesto: puestoBase,
      nombre: nombre.trim(),
      tagline: tagline.trim() || null,
      etiqueta_principal: etiquetaPrincipal.trim() || null,
      etiquetas,
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

/* ----------------------------------------------------------------- cope */

async function verCopes() {
  cargando();
  try {
    const copes = await listCopes();
    if (!copes.length) {
      vista.innerHTML = `
        <div class="empty">${ICON.vacio}
          <h3>No hay copes</h3>
          <p>Cuando alguien le ponga cope a un perfil con su justificación, aparece acá.</p>
        </div>`;
      return;
    }
    vista.innerHTML = copes
      .map(
        (c) => `
      <article class="sol-card" data-id="${c.id}">
        <h3 style="font-size:16px">${esc(c.rankings?.nombre || "Perfil eliminado")}</h3>
        <p class="small" style="margin:8px 0 0">${esc(c.mensaje)}</p>
        <dl class="kv" style="margin-top:9px">
          <dt>Fecha</dt><dd>${new Date(c.creado).toLocaleString("es-UY")}</dd>
        </dl>
        <div class="sol-actions">
          <button class="btn btn--ghost btn--sm" data-listo>Marcar como revisado</button>
        </div>
      </article>`
      )
      .join("");

    vista.querySelectorAll("[data-listo]").forEach((b) =>
      b.addEventListener("click", async () => {
        const card = b.closest(".sol-card");
        try {
          await borrarCope(card.dataset.id);
          card.remove();
          refrescarContadores();
        } catch (err) { toast(err.message, "err"); }
      })
    );
  } catch (err) { error(err); }
}
