/* =====================================================================
   Formulario de postulación (3 pasos)
   ===================================================================== */

import { CARRERAS } from "./config.js";
import { subirFoto, crearSolicitud, DEMO } from "./db.js";
import { $, $$, ICON, esc, montarNav, montarFooter, igLimpio } from "./ui.js";

montarNav();
montarFooter();
$("#backIcon").innerHTML = ICON.atras;
$("#iconPerfil").innerHTML = ICON.camara;
$("#iconFrente").innerHTML = ICON.subir;
$("#iconInfo").innerHTML = ICON.info;
$("#iconAviso").innerHTML = ICON.alerta;
$("#iconExito").innerHTML = ICON.check;

const MAX_BYTES = 15 * 1024 * 1024;
const fotos = { perfil: null, frente: null };
let paso = 0;

/* ------------------------------------------------------------- carreras */

const selCarrera = $("#carrera");
selCarrera.insertAdjacentHTML(
  "beforeend",
  CARRERAS.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")
);
selCarrera.addEventListener("change", () => {
  const otra = selCarrera.value === "Otra";
  $("#otraWrap").hidden = !otra;
  if (otra) $("#otra").focus();
});

$("#dato").addEventListener("input", (e) => { $("#cuenta").textContent = e.target.value.length; });

/* ------------------------------------------------------ compresión img */

async function comprimir(file, maxLado = 1400, calidad = 0.86) {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", calidad));
    if (!blob) return file;
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    // HEIC u otros formatos que el navegador no decodifica: se sube tal cual
    return file;
  }
}

/* --------------------------------------------------------- drop zones */

function conectarDrop(dropId, inputId, clave) {
  const drop = $(dropId);
  const input = $(inputId);

  async function tomar(file) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(hei[cf])$/i.test(file.name)) {
      mostrarError("#errFotos", "Ese archivo no es una imagen.");
      return;
    }
    if (file.size > MAX_BYTES) {
      mostrarError("#errFotos", "La imagen supera los 15 MB. Probá con otra.");
      return;
    }
    limpiarError("#errFotos");
    drop.classList.remove("is-error");
    fotos[clave] = file;

    const url = URL.createObjectURL(file);
    drop.querySelector("img")?.remove();
    drop.querySelector(".drop__replace")?.remove();
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    drop.appendChild(img);
    const tag = document.createElement("span");
    tag.className = "drop__replace";
    tag.textContent = "Tocá para cambiar";
    drop.appendChild(tag);
  }

  input.addEventListener("change", (e) => tomar(e.target.files[0]));

  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); })
  );
  drop.addEventListener("drop", (e) => tomar(e.dataTransfer.files[0]));
}

conectarDrop("#dropPerfil", "#filePerfil", "perfil");
conectarDrop("#dropFrente", "#fileFrente", "frente");

/* -------------------------------------------------------- validaciones */

function mostrarError(sel, msg) {
  $(sel).innerHTML = `<div class="field-error" style="margin-top:9px">${esc(msg)}</div>`;
}
function limpiarError(sel) { $(sel).innerHTML = ""; }

function marcar(input, ok) {
  input.classList.toggle("is-error", !ok);
  const prev = input.parentElement.querySelector(".field-error");
  prev?.remove();
  return ok;
}

function validarPaso(n) {
  if (n === 0) {
    const ok = Boolean(fotos.perfil && fotos.frente);
    $("#dropPerfil").classList.toggle("is-error", !fotos.perfil);
    $("#dropFrente").classList.toggle("is-error", !fotos.frente);
    if (!ok) mostrarError("#errFotos", "Las dos fotos son obligatorias.");
    else limpiarError("#errFotos");
    return ok;
  }

  if (n === 1) {
    let ok = true;
    const nombre = $("#nombre");
    const estudiante = $("#estudiante");

    if (nombre.value.trim().length < 3) {
      ok = marcar(nombre, false);
      nombre.insertAdjacentHTML("afterend", `<div class="field-error">Escribí tu nombre y apellido.</div>`);
    } else marcar(nombre, true);

    if (!/^[0-9]{4,20}$/.test(estudiante.value.trim())) {
      marcar(estudiante, false);
      estudiante.insertAdjacentHTML("afterend", `<div class="field-error">Ingresá tu número de estudiante (solo dígitos).</div>`);
      ok = false;
    } else marcar(estudiante, true);

    if (!selCarrera.value) {
      selCarrera.classList.add("is-error");
      ok = false;
    } else selCarrera.classList.remove("is-error");

    return ok;
  }

  if (n === 2) {
    const ok = $("#consent").checked;
    $("#errConsent").innerHTML = ok
      ? ""
      : `<div class="field-error" style="margin-top:8px">Tenés que aceptar para poder enviar la solicitud.</div>`;
    return ok;
  }
  return true;
}

/* ------------------------------------------------------------ wizard */

function irA(n) {
  paso = n;
  $$(".fieldset").forEach((f) => f.classList.toggle("is-active", Number(f.dataset.paso) === n));
  $$(".step").forEach((s, i) => {
    s.classList.toggle("is-active", i === n);
    s.classList.toggle("is-done", i < n);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-siguiente]").forEach((b) =>
  b.addEventListener("click", () => { if (validarPaso(paso)) irA(paso + 1); })
);
$$("[data-anterior]").forEach((b) => b.addEventListener("click", () => irA(paso - 1)));

/* ------------------------------------------------------------- envío */

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validarPaso(2)) return;

  const btn = $("#btnEnviar");
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  $("#alerta").innerHTML = "";

  const paso2 = () => (btn.innerHTML = "Subiendo fotos…");
  const paso3 = () => (btn.innerHTML = "Enviando solicitud…");

  try {
    if (DEMO) {
      throw new Error(
        "Estás en modo demo: todavía no cargaste las claves de Supabase en assets/js/config.js, " +
        "así que la solicitud no se puede guardar."
      );
    }

    paso2();
    const [perfilChico, frenteGrande] = await Promise.all([
      comprimir(fotos.perfil, 600, 0.86),
      comprimir(fotos.frente, 1400, 0.88),
    ]);
    const [urlPerfil, urlFrente] = await Promise.all([
      subirFoto(perfilChico, "perfil"),
      subirFoto(frenteGrande, "frente"),
    ]);

    paso3();
    const carrera = selCarrera.value === "Otra" ? ($("#otra").value.trim() || "Otra") : selCarrera.value;

    await crearSolicitud({
      nombre: $("#nombre").value.trim(),
      numero_estudiante: $("#estudiante").value.trim(),
      carrera,
      instagram: igLimpio($("#instagram").value) || null,
      dato: $("#dato").value.trim() || null,
      foto_perfil: urlPerfil,
      foto_frente: urlFrente,
    });

    $("#form").hidden = true;
    $("#steps").hidden = true;
    $("#exito").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    $("#alerta").innerHTML = `
      <div class="notice notice--err" style="margin-bottom:16px">${ICON.alerta}
        <div><strong>No se pudo enviar.</strong><br>${esc(err.message)}</div>
      </div>`;
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
