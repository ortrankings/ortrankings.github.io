/* =====================================================================
   CONFIGURACIÓN — el único archivo que tenés que tocar
   ---------------------------------------------------------------------
   1. Entrá a https://supabase.com  →  New project (plan gratis).
   2. Settings → API  →  copiá "Project URL" y la clave "anon public".
   3. Pegalas acá abajo y guardá.

   La clave "anon" es PÚBLICA por diseño: se puede ver desde el navegador.
   Lo que protege los datos son las políticas RLS de supabase/schema.sql.
   NUNCA pegues acá la clave "service_role".
   ===================================================================== */

export const SUPABASE_URL = "https://hvpewtyljxkappahbdyd.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_VvAiIo3Ktkd6Gzo6vbBSSA_7uEzZidd";

/* --------------------------------------------------------------------- */

export const SITE = {
  nombre: "ORT",
  sufijo: "RANKINGS",
  titulo: "ORT Rankings",
  descripcion: "El ranking oficial de la comunidad ORT. Verificado, votado y actualizado.",
  instagram: "rankingsort",
  logo: "/assets/img/logo.png",
  /* Cuántos perfiles muestra la home antes del botón "ver más" */
  porPagina: 40,
};

export const CARRERAS = [
  "Ingeniería en Sistemas",
  "Analista en Tecnologías de la Información",
  "Licenciatura en Comunicación",
  "Licenciatura en Diseño",
  "Licenciatura en Administración",
  "Contador Público",
  "Licenciatura en Economía",
  "Ingeniería en Electrónica",
  "Ingeniería Industrial",
  "Licenciatura en Nutrición",
  "Licenciatura en Educación",
  "Arquitectura",
  "Otra",
];

export const configurado = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith("http"));
