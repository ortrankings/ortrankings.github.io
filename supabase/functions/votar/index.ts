// =====================================================================
//  Edge Function "votar" — único lugar donde se pueden crear votos y copes
//  ---------------------------------------------------------------------
//  El navegador NUNCA inserta directo en las tablas `votos` / `copes`
//  (la política RLS se lo prohíbe a propósito). Todo pasa por acá, que:
//
//    1. Verifica el captcha de Cloudflare Turnstile contra su secreto
//       (el secreto vive solo en el servidor, nunca en el navegador).
//    2. Frena a una IP que hace demasiados intentos en el día.
//    3. Inserta el voto o el cope usando la clave service_role, que
//       se salta la RLS — por eso el navegador no puede hacerlo solo.
//
//  Se despliega con:
//    npx supabase functions deploy votar --project-ref <ref>
//
//  Necesita, cargados como secretos del proyecto (no en el repo):
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (los pone Supabase solos)
//    TURNSTILE_SECRET_KEY                       (lo cargás vos)
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIMITE_DIARIO = { voto: 60, cope: 15 };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function verificarTurnstile(token: string, ip: string): Promise<boolean> {
  const secreto = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secreto) {
    // Todavía no se configuró Turnstile: se deja pasar (modo pre-lanzamiento).
    console.warn("TURNSTILE_SECRET_KEY no configurado: captcha desactivado");
    return true;
  }
  if (!token) return false;

  const form = new FormData();
  form.append("secret", secreto);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = await r.json();
  return Boolean(data.success);
}

function obtenerIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "0.0.0.0";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const { perfil_id, votante, tipo, turnstileToken, mensaje } = body || {};
  if (!perfil_id || !votante || !["voto", "cope"].includes(tipo)) {
    return json({ error: "Faltan datos" }, 400);
  }
  if (tipo === "cope" && !String(mensaje || "").trim()) {
    return json({ error: "El cope necesita una justificación escrita" }, 400);
  }

  const ip = obtenerIp(req);

  const ok = await verificarTurnstile(turnstileToken, ip);
  if (!ok) return json({ error: "No pasaste la verificación. Probá de nuevo." }, 403);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // --- límite por IP y por día ---------------------------------------
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: fila } = await supabase
    .from("intentos_ip")
    .select("cantidad")
    .eq("ip", ip)
    .eq("ambito", tipo)
    .eq("dia", hoy)
    .maybeSingle();

  const cantidadActual = fila?.cantidad ?? 0;
  if (cantidadActual >= LIMITE_DIARIO[tipo as "voto" | "cope"]) {
    return json({ error: "Alcanzaste el límite de intentos por hoy. Volvé mañana." }, 429);
  }

  await supabase
    .from("intentos_ip")
    .upsert(
      { ip, ambito: tipo, dia: hoy, cantidad: cantidadActual + 1 },
      { onConflict: "ip,ambito,dia" },
    );

  // --- inserción real --------------------------------------------------
  if (tipo === "voto") {
    const { error } = await supabase.from("votos").insert({ perfil_id, votante, ip });
    if (error) {
      if (error.code === "23505") return json({ error: "Ya votaste a este perfil" }, 409);
      return json({ error: error.message }, 500);
    }
  } else {
    const { error } = await supabase
      .from("copes")
      .insert({ perfil_id, votante, ip, mensaje: String(mensaje).trim().slice(0, 500) });
    if (error) {
      if (error.code === "23505") return json({ error: "Ya le pusiste cope a este perfil" }, 409);
      return json({ error: error.message }, 500);
    }
  }

  const { data: perfil } = await supabase
    .from("rankings")
    .select("votos, puntaje")
    .eq("id", perfil_id)
    .maybeSingle();

  return json({ ok: true, votos: perfil?.votos ?? 0, puntaje: perfil?.puntaje ?? 0 });
});
