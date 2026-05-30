# Seguridad — Priora

## API key de Anthropic (BYOK)

| Medida | Detalle |
|--------|---------|
| Almacenamiento | `chrome.storage.local` (no sync entre dispositivos) |
| Tránsito | Solo navegador → `api.anthropic.com` (HTTPS) |
| Backend propio | **No recibe** la key; endpoint `/api/prioritize` eliminado |
| UI | La key guardada **nunca** se muestra en pantalla |
| Borrado | Botón «Borrar API key» + `chrome.storage.local.remove` |
| Validación | Formato `sk-ant-...` antes de guardar o llamar |

## Buenas prácticas para usuarios

- Crea una key dedicada en Anthropic con límite de gasto si está disponible.
- Revoca la key en [console.anthropic.com](https://console.anthropic.com/settings/keys) si compartiste la laptop.
- No compartas capturas del formulario de Perfil mientras pegas la key.

## Limitaciones

- Anthropic exige el header `anthropic-dangerous-direct-browser-access` para llamadas desde extensión; es el modelo soportado para cliente en navegador.
- `chrome.storage.local` no está cifrado por contraseña; protege el acceso a tu sesión de macOS.
