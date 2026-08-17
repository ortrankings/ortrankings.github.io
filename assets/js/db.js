/* =====================================================================
   Capa de datos — Supabase, con modo DEMO automático
   ---------------------------------------------------------------------
   Si config.js todavía no tiene las claves, el sitio funciona igual
   leyendo /assets/data/demo.json (solo lectura, votos en localStorage).
   Así podés ver el diseño andando antes de crear el proyecto Supabase.
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

export const yaVoto = (perfilId) => Boolean(votosLocales()[perfilId]);

function marcarVoto(perfilId) {
  const v = votosLocales();
  v[perfilId] = Date.now();
  localStorage.setItem("ort_votos", JSON.stringify(v));
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

/** Ranking completo, ordenado por puesto. */
export async function listRankings() {
  if (DEMO) {
    const d = await demoData();
    const extra = votosLocales();
    return d.rankings
      .map((r) => ({
        ...r,
        votos: (r.votos || 0) + (extra[r.id] ? 1 : 0),
        foto_perfil: r.foto_perfil || demoFoto(r.nombre, 300, 300),
        foto_frente: r.foto_frente || demoFoto(r.nombre),
      }))
      .sort((a, b) => a.puesto - b.puesto);
  }
  const c = await sb();
  const { data, error } = await c
    .from("rankings")
    .select("id,puesto,puesto_anterior,nombre,tagline,carrera,instagram,dato,foto_frente,votos")
    .eq("activo", true)
    .order("puesto", { ascending: true, nullsFirst: false });
  boom(error);
  return data || [];
}

export async function getPerfil(id) {
  if (DEMO) {
    const todos = await listRankings();
    return todos.find((r) => r.id === id) || null;
  }
  const c = await sb();
  const { data, error } = await c
    .from("rankings")
    .select("id,puesto,puesto_anterior,nombre,tagline,carrera,instagram,dato,foto_frente,votos")
    .eq("id", id)
    .eq("activo", true)
    .maybeSingle();
  boom(error);
  return data;
}

/** Suma un voto. Devuelve el total nuevo. Lanza si ya votó. */
export async function votar(perfilId) {
  if (yaVoto(perfilId)) throw new Error("Ya votaste a este perfil");

  if (DEMO) {
    marcarVoto(perfilId);
    const p = await getPerfil(perfilId);
    return p?.votos ?? 0;
  }

  const c = await sb();
  const { error } = await c.from("votos").insert({ perfil_id: perfilId, votante: votanteId() });
  if (error) {
    if (error.code === "23505") { marcarVoto(perfilId); throw new Error("Ya votaste a este perfil"); }
    boom(error);
  }
  marcarVoto(perfilId);
  const { data } = await c.from("rankings").select("votos").eq("id", perfilId).maybeSingle();
  return data?.votos ?? 0;
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

/** Acepta una solicitud: crea el perfil publicado y marca la solicitud. */
export async function aceptarSolicitud(sol, { puesto, tagline }) {
  const c = await sb();
  const { error: e1 } = await c.from("rankings").insert({
    puesto,
    puesto_anterior: null, // null = perfil nuevo → se muestra la chapa NUEVO
    nombre: sol.nombre,
    tagline: tagline || null,
    carrera: sol.carrera,
    instagram: sol.instagram,
    dato: sol.dato,
    foto_frente: sol.foto_frente,   // la de perfil queda solo en `solicitudes`
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

/** Ranking completo para el admin (incluye ocultos). */
export async function listRankingsAdmin() {
  const c = await sb();
  const { data, error } = await c
    .from("rankings")
    .select("*")
    .order("puesto", { ascending: true, nullsFirst: false });
  boom(error);
  return data || [];
}

export async function actualizarPerfil(id, campos) {
  const c = await sb();
  const { error } = await c.from("rankings").update(campos).eq("id", id);
  boom(error);
}

export async function borrarPerfil(id) {
  const c = await sb();
  const { error } = await c.from("rankings").delete().eq("id", id);
  boom(error);
}

/**
 * Publica un orden nuevo. Guarda el puesto viejo en `puesto_anterior`
 * para que el sitio calcule solo las flechas verde/roja de movimiento.
 * `filas` = [{ id, puestoViejo, puestoNuevo }]
 */
export async function publicarOrden(filas) {
  const c = await sb();
  const errores = [];
  for (const f of filas) {
    const { error } = await c
      .from("rankings")
      .update({ puesto: f.puestoNuevo, puesto_anterior: f.puestoViejo })
      .eq("id", f.id);
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
