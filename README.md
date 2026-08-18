# ORT Rankings

Ranking **no oficial** de la comunidad ORT. Proyecto independiente, sin vínculo,
respaldo ni afiliación con la Universidad ORT Uruguay. Solo por diversión.

## Estructura

```
/            ranking completo, buscador y orden
/perfil/     perfil individual con votación
/entrar/     formulario de postulación en 3 pasos
/reglas/     requisitos y reglamento
/admin/      panel privado
```

Sitio estático servido por GitHub Pages. Los datos, las fotos y la sesión del panel
viven en Supabase.

## Estructura de archivos

| Ruta | Qué hay |
|---|---|
| `assets/css/style.css` | Todo el diseño. Los colores y medidas están en el bloque `:root`. |
| `assets/js/config.js` | Claves de Supabase, datos del sitio y lista de carreras. |
| `assets/js/db.js` | Acceso a datos. Sin claves configuradas cae en modo demo. |
| `assets/js/ui.js` | Iconos, navbar, pie y avisos. |
| `assets/img/logo.png` | Logo, cuadrado 1024×1024. |
| `supabase/schema.sql` | Tablas, políticas de seguridad y bucket de fotos. |
| `supabase/functions/votar/` | Edge Function: valida el captcha y crea votos y copes. |

## Cómo se arma el ranking

**El puesto no se guarda en ningún lado**: sale siempre de ordenar por la columna `puntaje`.

| Acción | Efecto |
|---|---|
| Un voto | **+20 puntos** |
| Un cope (voto en contra con justificación escrita) | **−20 puntos** |

Los mueven dos *triggers* de Postgres, así que el orden se actualiza solo. En el panel no se
arrastra a nadie: lo único manual es **Cerrar edición**, que guarda el puesto actual de cada uno
en `puesto_anterior` para que las flechas verde/roja comparen contra ese momento.

Cada persona puede votar **una vez por perfil** y copear **una vez por perfil**.

## Votos y cope: desplegar la Edge Function

Los votos y los copes **no** se insertan desde el navegador: la RLS se lo prohíbe. Todo pasa por
la función `votar`, que corre en el servidor con la clave `service_role`, valida el captcha y
aplica un tope diario por IP. Sin desplegarla, votar y copear no funcionan.

```bash
npx supabase login
npx supabase link --project-ref hvpewtyljxkappahbdyd
npx supabase functions deploy votar
```

### Captcha (Cloudflare Turnstile)

Es opcional pero recomendado: sin él, el tope por IP sigue funcionando, pero no hay filtro anti-bot.

1. Entrá a **dash.cloudflare.com → Turnstile → Add site**, tipo *Managed*, dominio
   `ortrankings.github.io`.
2. La **Site Key** (pública, empieza con `0x`) va en `assets/js/config.js` → `TURNSTILE_SITE_KEY`.
3. La **Secret Key** **nunca** va en el repo. Se carga como secreto del proyecto:

```bash
npx supabase secrets set TURNSTILE_SECRET_KEY=tu_secret_key
```

Mientras `TURNSTILE_SECRET_KEY` no esté cargado, la función deja pasar los votos sin captcha
(modo pre-lanzamiento). Los topes por defecto son 60 votos y 15 copes por IP por día, y se
cambian en `LIMITE_DIARIO` dentro de `supabase/functions/votar/index.ts`.

## Etiquetas del perfil

Desde **Ranking → Editar** en el panel se cargan:

- **Etiqueta principal**: se muestra en dorado al lado del nombre (ej. *Current Protagonist*).
- **Etiquetas**: separadas por coma, salen como chips de colores en el perfil. El color se
  deriva del texto, así que la misma etiqueta siempre tiene el mismo color.
- El **Score** (el puntaje) se muestra siempre como último chip.

## Privacidad

- El número de estudiante se guarda en `solicitudes`, tabla que la clave pública **no puede
  leer**. Solo es visible con la sesión del panel iniciada, y nunca se renderiza en el sitio.
- De las dos fotos del formulario, la **de frente** es la única pública. La **de perfil** no se
  publica ni se copia a la tabla del ranking: queda en `solicitudes`, solo para evaluar la
  solicitud.
- Los **copes no son públicos**: la justificación solo la ve el admin en el panel.
- Los perfiles se publican con el consentimiento de la persona. Las bajas se piden por mensaje
  directo y se verifican antes de aplicarse.

## Probarlo local

Hace falta un servidor: el sitio usa módulos de JavaScript y abrir el `index.html`
con doble clic no funciona.

```bash
python -m http.server 4321
```
