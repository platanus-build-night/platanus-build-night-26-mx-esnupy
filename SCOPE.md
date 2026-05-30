# SCOPE — Priora (día 1, ~8h)

## Meta del día

Extensión Chrome que guarda productos y, con presupuesto + perfil, **prioriza con IA** qué comprar o no.

## Time-boxes

| Bloque | Tiempo | Entregable |
|--------|--------|------------|
| 1. Scaffold | 45m | `extension/` MV3 + Next.js API + env |
| 2. Guardar producto | 1.5h | Content script + popup: extraer título/precio/URL (Amazon, ML) |
| 3. Wishlist + storage | 1h | Lista en popup, editar/eliminar, `chrome.storage.local` |
| 4. Perfil | 1h | Options page: presupuesto mensual, gustos, prioridad (ahorro vs calidad) |
| 5. API IA | 2h | `POST /api/prioritize` → JSON estructurado (buy/wait/skip + reason + order) |
| 6. UI resultado | 1h | Popup muestra ranking y totales vs presupuesto |
| 7. Demo + README | 45m | 3 productos de ejemplo, `build-night-project.json`, grabación mental de 30s |

## Arquitectura

```
extension/                    → Chrome MV3 + Anthropic directo (BYOK, más seguro)
backend/                      → Go opcional (GET /health)
```

IA: API key en `chrome.storage.local`, nunca en servidor. Sin Next.js.

## Fuera de scope hoy

- Sync en la nube / auth
- Recomendaciones “descubre productos” fuera de la wishlist
- Firefox / Safari

## Riesgos

- Extracción de precio falla en algunas páginas → permitir editar precio manual en popup.
- Latencia IA → skeleton + 3 ítems máximo en demo en vivo.
