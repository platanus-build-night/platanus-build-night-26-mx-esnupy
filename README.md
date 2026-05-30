# Priora — Platanus Build Night CDMX

**Current project logo:** project-logo.png

<img src="./project-logo.png" alt="Priora" width="200" />

Extensión de Chrome que guarda productos de **cualquier tienda** y usa IA para decirte **qué comprar este mes**, qué esperar y qué no conviene — con tu presupuesto y perfil de gustos.

**Hacker:** Rogelio Antonio Hernández Merino ([@esnupy](https://github.com/esnupy))

## Demo de 30 segundos

1. Abre un producto en cualquier tienda (Amazon, Mercado Libre, etc.).
2. Clic en **Priora** → **Guardar esta página**. Repite con 2–3 productos.
3. Abre **Perfil** y configura presupuesto mensual + tus gustos (y tu API key de Anthropic).
4. **Priorizar con IA** → ranking con Comprar / Esperar / No comprar y razones.

## Instalar la extensión (hackathon / local)

No necesitas publicarla en Chrome Web Store. Carga la carpeta sin empaquetar:

1. Clona este repo y entra a la carpeta del proyecto.
2. Abre Chrome → `chrome://extensions`.
3. Activa **Modo desarrollador** (arriba a la derecha).
4. Clic en **Cargar descomprimida**.
5. Selecciona la carpeta **`extension/`** de este repo.
6. Fija el ícono en la barra si quieres acceso rápido.

### API key de Anthropic (requerida para IA)

1. Crea una key en [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. En la extensión → **Perfil** → pega la key (`sk-ant-...`).
3. La key **solo vive en tu navegador** (`chrome.storage.local`); no pasa por nuestro servidor.

Ver [extension/SECURITY.md](./extension/SECURITY.md) para más detalle.

## Configurar perfil (mejores resultados)

| Campo | Para qué sirve |
|--------|----------------|
| Presupuesto mensual | Tope de la suma de compras recomendadas |
| Ya gasté este mes | Calcula cuánto te queda disponible |
| Estilo de compra | Ahorro / Balance / Calidad |
| ¿En qué te gusta gastar? | Categorías e intereses |
| ¿Qué sí o sí quieres comprar? | Anclas que la IA prioriza |
| ¿Qué evitas este mes? | Límites explícitos |
| ¿En qué sueles arrepentirte? | Patrones de compras impulsivas |

## Stack

- **Chrome Extension MV3** — popup, options, content script (extracción genérica + Amazon/ML)
- **Anthropic API (BYOK)** — priorización directo desde el navegador
- **Go (opcional)** — `backend/` con `GET /health` si quieres un servicio auxiliar

## Backend opcional (Go)

```bash
cp backend/.env.example backend/.env
make api        # go run en backend/
make api-build  # binario en bin/priora-api
```

La extensión **no depende** del backend para funcionar; la IA va directo a Anthropic.

## Estructura

```
extension/          → Extensión Chrome (cargar esta carpeta)
  popup.*           → Wishlist + priorizar
  options.*         → Perfil + API key
  content.js        → Extrae producto de cualquier URL
  lib/anthropic.js  → Llamada a Claude
backend/            → API Go opcional
IDEA.md / SCOPE.md  → Validación y plan del día
```

## Regenerar ícono

```bash
node extension/scripts/generate-icon.mjs
```
