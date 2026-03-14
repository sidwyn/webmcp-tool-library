// content/sites/walmart/injector.js

function getWalmartPageContext() {
  const ctx = {};

  try {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) ctx.searchQuery = query;
  } catch {}

  const storeEl = document.querySelector('[data-automation-id="store-address"], [data-testid="store-selector"] span, [aria-label*="store"]');
  if (storeEl) {
    const storeText = storeEl.textContent.trim();
    if (storeText && storeText.length < 100) ctx.storeLocation = storeText;
  }

  const accountEl = document.querySelector('[data-automation-id="account-menu"], [data-testid="account-menu"]');
  if (accountEl) {
    const text = accountEl.textContent.trim();
    ctx.loggedIn = !/sign in/i.test(text);
  }

  return ctx;
}

window.__webmcpRegistry.pageContextProvider = getWalmartPageContext;
window.__webmcpRegistry.sitePrompt = typeof WALMART_PROMPT !== 'undefined' ? WALMART_PROMPT : '';

function registerWalmartTools() {
  const url = window.location.href;
  const registry = window.__webmcpRegistry;

  ['search_products', 'get_results', 'set_filters', 'sort_results',
   'get_product_details', 'add_to_cart', 'get_cart'
  ].forEach(name => registry.unregister(name));

  if (!url.includes('walmart.com')) return;

  const isSearchPage = url.includes('/search');
  const isCategoryPage = url.includes('/browse') || url.includes('/cp/');
  const isProductPage = url.includes('/ip/');
  const isResultsLike = isSearchPage || isCategoryPage;

  registry.register(SearchProductsTool);
  registry.register(GetCartTool);

  if (isResultsLike) {
    registry.register(GetResultsTool);
    registry.register(SetFiltersTool);
    registry.register(SortResultsTool);
    registry.register(GetProductDetailsTool);
  }

  if (isProductPage) {
    registry.register(GetProductDetailsTool);
    registry.register(AddToCartTool);
  }
}

registerWalmartTools();

let lastHref = window.location.href;
const navObserver = new MutationObserver(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    registerWalmartTools();
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate', () => {
  setTimeout(registerWalmartTools, 100);
});
