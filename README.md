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

## Privacidad

- El número de estudiante se guarda en `solicitudes`, tabla que la clave pública **no puede
  leer**. Solo es visible con la sesión del panel iniciada, y nunca se renderiza en el sitio.
- De las dos fotos del formulario, la **de frente** es la única pública. La **de perfil** no se
  publica ni se copia a la tabla del ranking: queda en `solicitudes`, solo para evaluar la
  solicitud y asignar el puesto.
- Los perfiles se publican con el consentimiento de la persona. Las bajas se piden por mensaje
  directo y se verifican antes de aplicarse.

## Probarlo local

Hace falta un servidor: el sitio usa módulos de JavaScript y abrir el `index.html`
con doble clic no funciona.

```bash
python -m http.server 4321
```
