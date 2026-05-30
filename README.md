# Contract Diff — Platanus Build Night CDMX

<img src="./project-logo.png" alt="Project Logo" width="160" />

Compara dos versiones de un contrato comercial con proveedores y detecta las diferencias materiales en segundos.

Pensado para equipos de **retail** que negocian con proveedores: subes la versión anterior y la nueva del contrato en PDF, **PageIndex** las indexa y **Claude** (vía el MCP de PageIndex) las lee cláusula por cláusula para entregar un diff estructurado con resumen ejecutivo, nivel de riesgo, recomendación y cada cambio con su categoría, severidad e impacto.

**Hacker:** Rogelio Antonio Hernández Merino ([@esnupy](https://github.com/esnupy))

## ¿Cómo funciona?

1. Subes dos PDFs (versión A = anterior, versión B = nueva).
2. El backend (`/api/compare`) sube ambos a **PageIndex** con el SDK `@pageindex/sdk` y espera a que terminen de procesarse.
3. Se llama a la **Messages API de Claude** con el **MCP de PageIndex conectado** (`mcp_servers` + `mcp_toolset`, beta `mcp-client-2025-11-20`). Claude usa las herramientas del MCP para leer ambos contratos y devuelve un JSON estructurado con las diferencias.
4. La UI muestra el resumen ejecutivo, el nivel de riesgo y cada diferencia (versión A → versión B, severidad e impacto).

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS** + **shadcn/ui**
- **Claude** (`@anthropic-ai/sdk`) — análisis y comparación
- **PageIndex** (`@pageindex/sdk` + MCP) — indexado y retrieval de documentos

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# luego edita .env.local con tus claves reales
```

Variables necesarias en `.env.local`:

| Variable            | Dónde obtenerla                                                  |
| ------------------- | ---------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com                                    |
| `PAGEINDEX_API_KEY` | https://dash.pageindex.ai/api-keys                               |
| `CLAUDE_MODEL`      | (opcional) modelo de Claude, por defecto `claude-sonnet-4-6`     |

```bash
# 3. Levantar el servidor de desarrollo
npm run dev
```

Abre http://localhost:3000, sube las dos versiones del contrato y pulsa **Comparar versiones**.

## ⚠️ Deploying (Vercel, Render, etc.)

Deploy platforms like **Vercel**, **Render** or **Netlify** can only connect to
repositories **you own** — they can't be granted access to this organization repo.
To deploy while keeping your commits here, mirror your code to a personal repo:

1. Create a **personal** repository on your own GitHub account.
2. Point your local `origin` at **both** repos, so a single `git push` updates each one:

   ```bash
   # this org repo (keep it as a push target)...
   git remote set-url --add --push origin https://github.com/platanus-build-night/platanus-build-night-26-mx-esnupy.git
   # ...and your personal repo
   git remote set-url --add --push origin https://github.com/<your-user>/<your-repo>.git
   ```

   From now on `git push` sends every commit to **both** repositories.
3. Connect your deploy service (Vercel, Render, …) to your **personal** repo and deploy from there.

   No olvides configurar `ANTHROPIC_API_KEY` y `PAGEINDEX_API_KEY` en las variables de entorno del servicio de deploy.

Your commits stay mirrored here for judging, while the deploy runs from the repo you control.

Have fun! 🚀
