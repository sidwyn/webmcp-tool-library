// content/sites/google-flights/injector.js — Registers WebMCP tools based on current Google Flights page

/**
 * Read the current origin airport text from the Google Flights search form.
 * Works on both the homepage and results pages.
 */
function getGoogleFlightsPageContext() {
  const ctx = {};

  const candidates = [
    // 1. Standard input with "Where from?" aria-label
    () => {
      const el = document.querySelector('input[aria-label="Where from?"]');
      return el?.value?.trim() || null;
    },
    // 2. Placeholder-based fallback
    () => {
      const el = document.querySelector('input[placeholder="Where from?"]');
      return el?.value?.trim() || null;
    },
    // 3. Any input inside the origin combobox
    () => {
      const el = document.querySelector('[data-placeholder="Where from?"] input') ||
                 document.querySelector('[aria-label="Where from?"]');
      if (el?.tagName === 'INPUT') return el.value?.trim() || null;
      return el?.textContent?.trim() || null;
    },
    // 4. Results page: look for aria-label containing "from" on any element
    () => {
      const els = document.querySelectorAll('[aria-label*="from" i], [aria-label*="From"]');
      for (const el of els) {
        const label = el.getAttribute('aria-label') || '';
        if (/where|from/i.test(label)) {
          const text = el.value?.trim() || el.textContent?.trim();
          if (text && text.length > 1 && text.length < 60) return text;
        }
      }
      return null;
    },
    // 5. Results page URL: extract origin from ?q= parameter
    () => {
      const url = window.location.href;
      const fromMatch = url.match(/from%20([A-Z]{3})/i) ||
                        url.match(/from\+([A-Z]{3})/i) ||
                        url.match(/from\s+([A-Z]{3})/i);
      return fromMatch ? fromMatch[1].toUpperCase() : null;
    },
    // 6. Look for the first combobox-like container with airport code pattern
    () => {
      const inputs = document.querySelectorAll('input[type="text"]');
      for (const input of inputs) {
        const container = input.closest('[role="combobox"], [jscontroller]');
        if (!container) continue;
        const val = input.value?.trim();
        if (val && val.length > 1 && val.length < 60) {
          const allComboboxes = document.querySelectorAll('[role="combobox"], [jscontroller]');
          if (container === allComboboxes[0] || container === allComboboxes[1]) {
            return val;
          }
        }
      }
      return null;
    }
  ];

  for (const fn of candidates) {
    try {
      const val = fn();
      if (val) { ctx.originText = val; break; }
    } catch {
      // Selector may throw — continue to next
    }
  }

  return ctx;
}

// Register the page context provider for Google Flights
window.__webmcpRegistry.pageContextProvider = getGoogleFlightsPageContext;

// Set the site prompt (loaded from prompt.js)
window.__webmcpRegistry.sitePrompt = typeof GOOGLE_FLIGHTS_PROMPT !== 'undefined' ? GOOGLE_FLIGHTS_PROMPT : '';

function registerGoogleFlightsTools() {
  const url = window.location.href;
  const registry = window.__webmcpRegistry;

  // Clear all tools before re-registering
  ['search_flights', 'get_results', 'set_filters', 'set_search_options',
   'sort_results', 'get_price_insights', 'get_flight_details', 'track_price',
   'explore_destinations', 'search_multi_city', 'set_connecting_airports',
   'get_tracked_flights', 'get_booking_link', 'select_return_flight'
  ].forEach(name => registry.unregister(name));

  const isExplorePage = url.includes('google.com/travel/explore');
  const isSavedPage = url.includes('/travel/flights/saved') || url.includes('/travel/flights/saves');
  const isFlightsPage = url.includes('google.com/travel/flights') && !isSavedPage;

  if (!isFlightsPage && !isExplorePage && !isSavedPage) return;

  const hasSearchParams = window.location.search.includes('q=') ||
                          window.location.search.includes('tfs=') ||
                          window.location.hash.includes('tfs=');

  // Always available on any Google Flights / Explore / Saved page
  registry.register(SearchFlightsTool);
  registry.register(SetSearchOptionsTool);
  registry.register(SearchMultiCityTool);
  registry.register(ExploreDestinationsTool);
  registry.register(GetTrackedFlightsTool);

  if (isFlightsPage && hasSearchParams) {
    // Results page: full toolset
    registry.register(GetResultsTool);
    registry.register(SetFiltersTool);
    registry.register(SortResultsTool);
    registry.register(GetPriceInsightsTool);
    registry.register(GetFlightDetailsTool);
    registry.register(TrackPriceTool);
    registry.register(SetConnectingAirportsTool);
    registry.register(GetBookingLinkTool);
    registry.register(SelectReturnFlightTool);
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
