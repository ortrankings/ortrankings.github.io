/* =====================================================================
   Capa de datos — Supabase, con modo DEMO automático
   ---------------------------------------------------------------------
   Si config.js todavía no tiene las claves, el sitio funciona igual
   leyendo /assets/data/demo.json (solo lectura, votos en localStorage).
   Así podés ver el diseño andando antes de crear el proyecto Supabase.

   EL PUESTO NUNCA SE GUARDA: se calcula siempre ordenando por `puntaje`
   (cada voto suma, cada cope resta). Lo único que se guarda es
   `puesto_anterior`, una foto del puesto la última vez que el admin
   "cerró la edición" — de ahí salen las flechas verde/roja.
   ===================================================================== */

import { SUPABASE_URL, SUPABASE_ANON_KEY, configurado } from "./config.js";

export const DEMO = !configurado();

let _sb = null;

export async function sb() {
  if (DEMO) return null;
  if (_sb) return _sb;
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _sb;
}

/* ------------------------------------------------------------ helpers */

function boom(error) {
  if (error) throw new Error(error.message || "Error de conexión con la base de datos");
}

export function votanteId() {
  let id = localStorage.getItem("ort_votante");
  if (!id) {
    id = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now());
    localStorage.setItem("ort_votante", id);
  }
  return id;
}

const votosLocales = () => JSON.parse(localStorage.getItem("ort_votos") || "{}");
const copesLocales = () => JSON.parse(localStorage.getItem("ort_copes") || "{}");

export const yaVoto = (perfilId) => Boolean(votosLocales()[perfilId]);
export const yaCope = (perfilId) => Boolean(copesLocales()[perfilId]);

function marcarVoto(perfilId) {
  const v = votosLocales();
  v[perfilId] = Date.now();
  localStorage.setItem("ort_votos", JSON.stringify(v));
}

function marcarCope(perfilId) {
  const v = copesLocales();
  v[perfilId] = Date.now();
  localStorage.setItem("ort_copes", JSON.stringify(v));
}

/** Ordena por puntaje (cada voto +20, cada cope -20) y le pone el número de puesto. */
function conPuesto(filas) {
  const ordenado = [...filas].sort(
    (a, b) => (b.puntaje || 0) - (a.puntaje || 0) || a.nombre.localeCompare(b.nombre, "es")
  );
  return ordenado.map((r, i) => ({ ...r, puesto: i + 1 }));
}

/** Llama a la Edge Function "votar" — único lugar donde se crean votos y copes. */
async function llamarVotar(payload) {
  const url = `${SUPABASE_URL}/functions/v1/votar`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo procesar la solicitud");
  return data;
}

/* -------------------------------------------------------- demo dataset */

let _demo = null;
async function demoData() {
  if (_demo) return _demo;
  const res = await fetch("/assets/data/demo.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar el dataset de demostración");
  _demo = await res.json();
  return _demo;
}

/* ------------------------------------------------------------ público */

/** Retrato de relleno para el modo demo (degradé + iniciales, sin fotos reales). */
function demoFoto(nombre, w = 640, h = 800) {
  const hue = [...String(nombre)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const ini = String(nombre).split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},30%,25%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 40) % 360},34%,10%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<text x="50%" y="50%" dy=".34em" text-anchor="middle" font-family="Inter,Arial,sans-serif" ` +
    `font-size="${Math.round(Math.min(w, h) * 0.34)}" font-weight="800" fill="rgba(255,255,255,.22)">${ini}</text>` +
    `</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** Ranking completo, con el puesto ya calculado a partir del puntaje. */
export async function listRankings() {
  if (DEMO) {
    const d = await demoData();
    const extraVotos = votosLocales();
    const filas = d.rankings.map((r) => {
      const votosExtra = extraVotos[r.id] ? 1 : 0;
      return {
        ...r,
        votos: (r.votos || 0) + votosExtra,
        puntaje: (r.puntaje ?? (r.votos || 0) * 20) + votosExtra * 20,
        foto_frente: r.foto_frente || demoFoto(r.nombre),
      };
    });
    return conPuesto(filas);
  }
  const c = await sb();
  const { data, error } = await c
    .from("rankings")
    .select("id,puesto_anterior,nombre,tagline,etiqueta_principal,etiquetas,carrera,instagram,dato,foto_frente,votos,puntaje,sc_aesthetics,sc_frame,sc_facial_harmony,sc_status,sc_consistency,sc_momentum")
    .eq("activo", true);
  boom(error);
  return conPuesto(data || []);
}

export async function getPerfil(id) {
  const todos = await listRankings();
  return todos.find((r) => r.id === id) || null;
}

/** Suma un voto pasando por Turnstile. Devuelve {votos, puntaje}. Lanza si ya votó. */
export async function votar(perfilId, turnstileToken) {
  if (yaVoto(perfilId)) throw new Error("Ya votaste a este perfil");

  if (DEMO) {
    marcarVoto(perfilId);
    const p = await getPerfil(perfilId);
    return { votos: p?.votos ?? 0, puntaje: p?.puntaje ?? 0 };
  }

  const data = await llamarVotar({
    perfil_id: perfilId,
    votante: votanteId(),
    tipo: "voto",
    turnstileToken,
  });
  marcarVoto(perfilId);
  return data;
}

/** Manda un "cope": dislike con justificación escrita, sin foto. Resta puntaje. */
export async function enviarCope(perfilId, mensaje, turnstileToken) {
  if (yaCope(perfilId)) throw new Error("Ya le pusiste cope a este perfil");
  if (!String(mensaje || "").trim()) throw new Error("Escribí una justificación");

  if (DEMO) {
    marcarCope(perfilId);
    return;
  }

  await llamarVotar({
    perfil_id: perfilId,
    votante: votanteId(),
    tipo: "cope",
    mensaje: mensaje.trim(),
    turnstileToken,
  });
  marcarCope(perfilId);
}

/* ------------------------------------------------------- solicitudes */

/** Sube una imagen al bucket `fotos` y devuelve la URL pública. */
export async function subirFoto(file, carpeta) {
  const c = await sb();
  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await c.storage.from("fotos").upload(nombre, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  boom(error);
  return c.storage.from("fotos").getPublicUrl(nombre).data.publicUrl;
}

export async function crearSolicitud(datos) {
  const c = await sb();
  const { error } = await c.from("solicitudes").insert({ ...datos, estado: "pendiente" });
  boom(error);
}

export async function crearReporte({ perfil_id, tipo, mensaje, contacto }) {
  if (DEMO) return;
  const c = await sb();
  const { error } = await c.from("reportes").insert({ perfil_id, tipo, mensaje, contacto });
  boom(error);
}

/* --------------------------------------------------------------- auth */

export async function sesion() {
  if (DEMO) return null;
  const c = await sb();
  const { data } = await c.auth.getSession();
  return data.session;
}

export async function login(email, password) {
  const c = await sb();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      error.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos"
        : error.message
    );
  }
  return data.session;
}

export async function logout() {
  const c = await sb();
  await c.auth.signOut();
}

/* -------------------------------------------------------------- admin */

export async function listSolicitudes(estado = "pendiente") {
  const c = await sb();
  const { data, error } = await c
    .from("solicitudes")
    .select("*")
    .eq("estado", estado)
    .order("creado", { ascending: true });
  boom(error);
  return data || [];
}

export async function contarSolicitudes() {
  const c = await sb();
  const q = (estado) =>
    c.from("solicitudes").select("id", { count: "exact", head: true }).eq("estado", estado);
  const [p, a, r] = await Promise.all([q("pendiente"), q("aceptada"), q("rechazada")]);
  return { pendiente: p.count || 0, aceptada: a.count || 0, rechazada: r.count || 0 };
}

/** Acepta una solicitud: crea el perfil con puntaje 0 y marca la solicitud. */
export async function aceptarSolicitud(sol, { tagline } = {}) {
  const c = await sb();
  const { error: e1 } = await c.from("rankings").insert({
    puesto_anterior: null, // null = perfil nuevo → se muestra la chapa NUEVO
    nombre: sol.nombre,
    tagline: tagline || null,
    carrera: sol.carrera,
    instagram: sol.instagram,
    dato: sol.dato,
    foto_frente: sol.foto_frente,   // la que se publica
    foto_alt: sol.foto_perfil,      // guardada por si las subieron al revés
    activo: true,
  });
  boom(e1);
  const { error: e2 } = await c.from("solicitudes").update({ estado: "aceptada" }).eq("id", sol.id);
  boom(e2);
}

export async function rechazarSolicitud(id, nota) {
  const c = await sb();
  const { error } = await c
    .from("solicitudes")
    .update({ estado: "rechazada", nota_admin: nota || null })
    .eq("id", id);
  boom(error);
}

export async function reabrirSolicitud(id) {
  const c = await sb();
  const { error } = await c
    .from("solicitudes")
    .update({ estado: "pendiente", nota_admin: null })
    .eq("id", id);
  boom(error);
}

export async function borrarSolicitud(id) {
  const c = await sb();
  const { error } = await c.from("solicitudes").delete().eq("id", id);
  boom(error);
}

/** Ranking completo para el admin: activos con puesto calculado, ocultos al final sin puesto. */
export async function listRankingsAdmin() {
  const c = await sb();
  const { data, error } = await c.from("rankings").select("*");
  boom(error);
  const todos = data || [];
  const activos = conPuesto(todos.filter((r) => r.activo));
  const ocultos = todos
    .filter((r) => !r.activo)
    .sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0))
    .map((r) => ({ ...r, puesto: null }));
  return [...activos, ...ocultos];
}

export async function actualizarPerfil(id, campos) {
  const c = await sb();
  const { error } = await c.from("rankings").update(campos).eq("id", id);
  boom(error);
}

/** Intercambia la foto pública por la otra que quedó guardada. */
export async function intercambiarFotos(id) {
  const c = await sb();
  const { data, error } = await c
    .from("rankings")
    .select("foto_frente,foto_alt")
    .eq("id", id)
    .maybeSingle();
  boom(error);
  if (!data?.foto_alt) throw new Error("Este perfil no tiene una segunda foto guardada");
  const { error: e2 } = await c
    .from("rankings")
    .update({ foto_frente: data.foto_alt, foto_alt: data.foto_frente })
    .eq("id", id);
  boom(e2);
}

/** Reemplaza la foto pública por una nueva, y guarda la anterior como alternativa. */
export async function reemplazarFoto(id, file) {
  const url = await subirFoto(file, "frente");
  const c = await sb();
  const { data } = await c.from("rankings").select("foto_frente").eq("id", id).maybeSingle();
  const { error } = await c
    .from("rankings")
    .update({ foto_frente: url, foto_alt: data?.foto_frente || null })
    .eq("id", id);
  boom(error);
}

export async function borrarPerfil(id) {
  const c = await sb();
  const { error } = await c.from("rankings").delete().eq("id", id);
  boom(error);
}

/**
 * "Cierra la edición": guarda el puesto actual (calculado por puntaje) de
 * cada activo como `puesto_anterior`, para que la próxima vez las flechas
 * verde/roja comparen contra este momento. No mueve a nadie ni toca puntajes.
 */
export async function cerrarEdicion() {
  const activos = await listRankings();
  const c = await sb();
  const errores = [];
  for (const r of activos) {
    const { error } = await c.from("rankings").update({ puesto_anterior: r.puesto }).eq("id", r.id);
    if (error) errores.push(error.message);
  }
  if (errores.length) throw new Error(errores[0]);
}

export async function listReportes() {
  const c = await sb();
  const { data, error } = await c
    .from("reportes")
    .select("*, rankings(nombre)")
    .order("creado", { ascending: false });
  boom(error);
  return data || [];
}

export async function borrarReporte(id) {
  const c = await sb();
  const { error } = await c.from("reportes").delete().eq("id", id);
  boom(error);
}

/** Los "cope" (dislike con justificación) pendientes de revisar. */
export async function listCopes() {
  const c = await sb();
  const { data, error } = await c
    .from("copes")
    .select("*, rankings(nombre)")
    .order("creado", { ascending: false });
  boom(error);
  return data || [];
}

export async function borrarCope(id) {
  const c = await sb();
  const { error } = await c.from("copes").delete().eq("id", id);
  boom(error);
}
