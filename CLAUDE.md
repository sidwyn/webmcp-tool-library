# CLAUDE.md

## Project

WebMCPTools — Chrome extension that injects WebMCP tools into websites via content scripts. No build step. Plain vanilla JS. Edit files, reload extension, refresh page.

## Architecture

- `background.js` — `SITE_MODULES` registry, programmatic content script registration
- `content/bridge.js` — Tool registry (`window.__webmcpRegistry`), messaging bridge, debug bridge
- `content/helpers.js` — Generic DOM utilities shared across all sites
- `content/sites/<site>/` — Each site module: `helpers.js`, `tools/*.js`, `prompt.js`, `injector.js`
- `sidepanel/` — Chat UI, AI provider integrations (Anthropic, OpenAI)
- Adding a new site = one entry in `SITE_MODULES` + one folder under `content/sites/`

## Testing

```bash
npm test
```

Vitest. Tests validate tool schemas, site module structure, manifest correctness. No DOM integration tests — tools are tested live in Chrome.

## Self-testing with Chrome

The extension has a debug bridge in `bridge.js` that enables testing from Chrome DevTools / automation:

- **Check registered tools**: Read `document.getElementById('__webmcp-debug').dataset` from main world
- **Execute tools**: Dispatch `__webmcp_exec` CustomEvent with `{ toolName, args, requestId }`, listen for `__webmcp_result`
- **Reload extension**: Dispatch `__webmcp_reload` CustomEvent (triggers `chrome.runtime.reload()`)
- After reload, navigate to refresh the page so content scripts re-inject

Use this loop: edit code → reload extension → navigate → verify via debug element → fix → repeat.

## Code style

- No build tools, no bundling, no TypeScript — plain JS with `const` tool definitions
- Tool files export a single `const XxxTool = { name, description, inputSchema, execute }` object
- `execute` is always `async (args) => { ... }` returning `{ content: [{ type: 'text', text }] }`
- Use `WebMCPHelpers.*` for DOM interaction (sleep, simulateClick, findByText, findByAriaLabel, waitForElement)
- Parse DOM using aria-labels over textContent when available — aria-labels have cleaner, structured text
- Sleep delays should be minimal (50-200ms for UI transitions, not 1000ms+). A human would be faster.
- snake_case for tool names, camelCase for JS variables

## Working preferences

- ALWAYS test tools that you build. Do this end-to-end by yourself and work independently.
- Ask yourself: Is this the fastest way to get to the end result? If not, how can I improve my tools? How can I better order them?
- Understand what the site is trying to say. For instance, sometimes Google will prompt you on searching for "next weekend has better dates". Make sure to explore and understand the tools available on the page to users.
- Be concise. Don't over-explain.
- Don't add comments, docstrings, or type annotations to code you didn't change.
- Push to GitHub proactively.
- When implementing a new site module, use Chrome browser access to inspect the actual DOM before writing parsers. Aria-labels and textContent differ significantly.
- Test tools against the live page, not just unit tests. The debug bridge exists for this.
- Speed matters — reduce sleep delays, avoid conservative waits.
- Don't ask for permission to proceed when the task is clear. Just do it.

## Learnings from building site modules

### DOM parsing pitfalls
- **Text concatenation**: Adjacent DOM elements merge in `textContent`. E.g., "$29" + "24% less than usual" → "$2924% less than usual". Use word boundaries (`\b`) in regexes and parse separate concerns with separate patterns.
- **Filter button types**: Quick-filter chips (e.g., "4+ rating") toggle directly. Dropdown buttons (e.g., "Guest rating") open panels with options inside. Always try dropdown buttons first (`openFilter(['Guest rating'])`) before fallback to chips — clicking chips can accidentally navigate or toggle wrong state.
- **Hotel card identification**: Google Hotels cards are identified by "Save X to collection" buttons. Each card's `aria-label` on the save button contains the hotel name.
- **Detail page detection**: Check for `[role="tab"]` elements containing "overview", "prices", or "reviews" text — these only appear on hotel detail pages.
- **Provider deduplication**: "Visit site for X" buttons can include the hotel's own website as a provider entry. Filter by comparing provider name to hotel name.
- **Review section parsing**: Use text landmarks like "Google review summary" and "Reviews on other travel sites" to bound sections, rather than scanning the full page.

### Testing approach
- Test across 5+ real destinations with realistic user queries (NYC, Paris, Tokyo, Delhi, London).
- Run each tool individually, then in combination (search → filter → get_results → get_details → get_prices).
- Check for: concatenation bugs, missing data, navigation disruption, wrong element clicks.
- The debug bridge is the primary testing tool — `dataset.tools` for tool count, `__webmcp_exec` CustomEvent for execution.

### Site module structure
- `injector.js` must be loaded LAST (after all tools and prompt.js).
- `bridge.js` and shared `helpers.js` must be loaded FIRST.
- Site-specific `helpers.js` goes between shared helpers and tools.
- `prompt.js` defines `SITE_PROMPT` constant used by injector.
- `background.js` `SITE_MODULES` entry controls injection order — order matters.
- URL patterns in `matches` must cover all site variants (e.g., `/travel/search*` AND `/travel/hotels*`).

### Extension reload pattern
- `__webmcp_reload` CustomEvent → content script listener → `chrome.runtime.sendMessage({ type: 'RELOAD_EXTENSION' })` → background.js `chrome.runtime.reload()`.
- After reload, must navigate to re-inject content scripts (they don't survive extension reload).
- Always verify tool re-registration via `debugEl.dataset.toolCount` after reload.

### Shopping site module guidelines
- 20 key shopping use cases to support: buy specific product, compare prices, read reviews, search by category, check stock/pickup, find cheapest, reorder essentials, browse deals, add to cart/wishlist, check delivery, compare specs, view photos, grocery delivery, gift options, shipping/subscription, returns, bulk/multi-pack, research big purchase, coupons/promos, track orders.
- Priority order: Amazon > Walmart > Target.
- Shopping tools pattern: searchProducts, getResults, setFilters, sortResults, getProductDetails, getReviews, addToCart, getCart + site-specific extras.
- Amazon has the most complex DOM (obfuscated classes, dynamic loading). Walmart and Target are somewhat simpler.
- Each site needs its own welcome prompts in `sidepanel/app.js` `SITE_CONFIGS`.
