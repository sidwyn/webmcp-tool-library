// content/sites/target/injector.js — Registers WebMCP tools based on current Target page

/**
 * Read page context from Target — current page type, search query, product name.
 */
function getTargetPageContext() {
  const ctx = {};
  const url = window.location.href;
  const pathname = window.location.pathname;

  // Determine page type
  if (pathname.includes('/cart')) {
    ctx.pageType = 'cart';
  } else if (pathname.includes('/p/') || pathname.match(/\/A-\d+/)) {
    ctx.pageType = 'product';
    const titleEl = document.querySelector('[data-test="product-title"]') || document.querySelector('h1');
    if (titleEl) ctx.productName = titleEl.textContent.trim();
  } else if (url.includes('searchTerm=') || pathname.startsWith('/s')) {
    ctx.pageType = 'search';
    const params = new URLSearchParams(window.location.search);
    ctx.searchQuery = params.get('searchTerm') || '';
  } else if (pathname.startsWith('/c/')) {
    ctx.pageType = 'category';
  } else {
    ctx.pageType = 'home';
  }

  return ctx;
}

// Register the page context provider
window.__webmcpRegistry.pageContextProvider = getTargetPageContext;

// Set the site prompt (loaded from prompt.js)
window.__webmcpRegistry.sitePrompt = typeof TARGET_PROMPT !== 'undefined' ? TARGET_PROMPT : '';

function registerTargetTools() {
  const url = window.location.href;
  const pathname = window.location.pathname;
  const registry = window.__webmcpRegistry;

  // Clear all Target tools before re-registering
  [
    'search_products', 'get_search_results', 'set_filters', 'sort_results',
    'get_product_details', 'add_to_cart', 'get_cart_summary', 'get_deals',
    'check_store_availability'
  ].forEach(name => registry.unregister(name));

  if (!window.location.hostname.includes('target.com')) return;

  const isSearchPage = url.includes('searchTerm=') || pathname.startsWith('/s');
  const isCategoryPage = pathname.startsWith('/c/');
  const isProductPage = pathname.includes('/p/') || pathname.match(/\/A-\d+/);
  const isCartPage = pathname.includes('/cart');
  const isDealsPage = pathname.includes('/c/top-deals') || pathname.includes('/c/clearance');

  // Always available on any Target page
  registry.register(SearchProductsTool);
  registry.register(GetCartSummaryTool);

  // Search/category pages: browsing tools
  if (isSearchPage || isCategoryPage || isDealsPage) {
    registry.register(GetSearchResultsTool);
    registry.register(SetFiltersTool);
    registry.register(SortResultsTool);
    registry.register(GetProductDetailsTool);
    registry.register(GetDealsTool);
  }

  // Product detail page
  if (isProductPage) {
    registry.register(GetProductDetailsTool);
    registry.register(AddToCartTool);
    registry.register(CheckStoreAvailabilityTool);
    registry.register(GetDealsTool);
  }

  // Cart page
  if (isCartPage) {
    // get_cart_summary already registered above
  }

  // Home/browse pages: basic browsing
  if (!isSearchPage && !isCategoryPage && !isProductPage && !isCartPage) {
    registry.register(GetDealsTool);
  }
}

// Initial registration
registerTargetTools();

// Re-register on SPA navigation (Target uses client-side routing)
let lastHref = window.location.href;
const navObserver = new MutationObserver(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    registerTargetTools();
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate', () => {
  setTimeout(registerTargetTools, 100);
});
