// content/injector.js — Registers WebMCP tools based on current Google Flights page

function registerGoogleFlightsTools() {
  const url = window.location.href;
  const registry = window.__webmcpRegistry;

  // Clear all tools before re-registering
  ['search_flights', 'get_results', 'set_filters', 'set_search_options',
   'sort_results', 'get_price_insights'].forEach(name => registry.unregister(name));

  if (!url.includes('google.com/travel/flights')) return;

  const hasSearchParams = window.location.search.includes('q=') ||
                          window.location.search.includes('tfs=') ||
                          window.location.hash.includes('tfs=');

  // Always available on any Google Flights page
  registry.register(SearchFlightsTool);
  registry.register(SetSearchOptionsTool);

  if (hasSearchParams) {
    // Results page: full toolset
    registry.register(GetResultsTool);
    registry.register(SetFiltersTool);
    registry.register(SortResultsTool);
    registry.register(GetPriceInsightsTool);
  }
}

// Initial registration
registerGoogleFlightsTools();

// Re-register on SPA navigation (Google Flights uses client-side routing)
let lastHref = window.location.href;
const navObserver = new MutationObserver(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    registerGoogleFlightsTools();
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate', () => {
  setTimeout(registerGoogleFlightsTools, 100);
});
