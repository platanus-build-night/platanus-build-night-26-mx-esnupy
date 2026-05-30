# IDEA: Priora

> Generado por idea-check el 29 may 2026.

## En una frase

**Priora** es una extensión de Chrome para compradores que acumulan productos en pestañas y notas, que les dice **qué comprar este mes y qué esperar**, usando presupuesto y gustos, reemplazando listas dispersas en Notion/Notes sin priorización.

## Las 6 respuestas

### 1. Dolor real

Acumulas muchas pestañas y links de cosas que quieres comprar. No priorizas qué va primero, qué puede esperar o qué no conviene — el caos de tabs gana a tu presupuesto mental.

### 2. Status quo

Hoy lo resuelves con **notas** (Notion, Apple Notes, etc.): guardas links o ideas sueltas, pero no hay presupuesto mensual integrado ni un “coach” que te diga qué sí y qué no.

### 3. Evidencia

Tú + varios amigos/familia viven el mismo patrón (pestañas + listas sin priorizar). Dolor creíble aunque aún no hay entrevistas formales con extraños.

### 4. Wedge mínimo

**Una pantalla**: popup de la extensión (lista + resultado de IA).  
**Una acción estrella**: **“Priorizar con IA”** — con tu presupuesto y perfil, ordena la wishlist y marca comprar / esperar / no comprar con razones.

**Lo que NO entra al día 1**:

- Recomendaciones proactivas rastreando toda la web
- Alertas de precio histórico
- Login multi-dispositivo robusto (opcional si no da tiempo)
- Comparar tiendas automáticamente en todos los retailers
- App móvil nativa

**Sí entra (soporte del wedge)**:

- Guardar producto desde página (Amazon / Mercado Libre mínimo)
- Perfil: presupuesto mensual + gustos / prioridades
- API con IA (backend, sin exponer API keys en la extensión)

### 5. Demo de 30s

1. Abres Amazon o Mercado Libre en un producto.  
2. Clic en la extensión → **Guardar en wishlist** (título, precio, link). Repites 2–3 veces.  
3. Abres el popup → ves la lista y tu presupuesto del perfil.  
4. **Priorizar con IA** → aparece ranking: comprar ahora / esperar / no comprar, con una línea de por qué.

Sin narración: se entiende “guardé cosas → la IA me ordenó con mi lana”.

### 6. Día-1 fit

- [ ] Cabe en 8h sin "pero"
- [x] Tiene "pero" — hay que recortar:
  - Solo **2 retailers** en el extractor (Amazon + ML)
  - Perfil **simple** (presupuesto + 3–5 preferencias en texto/tags)
  - Recomendaciones “descubre esto” = **bonus** si sobra tiempo; no bloquea demo
  - Persistencia: `chrome.storage` primero; Supabase solo si sobra tiempo

## Veredicto

**GO con cuidado** — dolor real, evidencia cercana, wedge claro (IA + presupuesto). Cabe en ~8h si el perfil y el guardado en página son mínimos y no persigues recomendaciones automáticas el primer día.

## Próximo paso

- Ejecutar `/scope-1day` o arrancar scaffold: `extension/` (Chrome MV3) + Next.js (`/api/prioritize`) en este repo.
- Llenar `build-night-project.json` y logo antes de submit del evento.
