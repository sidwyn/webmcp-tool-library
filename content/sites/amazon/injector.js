// content/sites/amazon/injector.js

function getAmazonPageContext() {
  const ctx = {};
  const url = window.location.href;

  const urlObj = new URL(url);
  const searchQuery = urlObj.searchParams.get('k');
  if (searchQuery) ctx.searchQuery = searchQuery;

  const deptEl = document.querySelector('#searchDropdownBox option[selected]') ||
                 document.querySelector('#nav-subnav .nav-a-content');
  if (deptEl) ctx.department = deptEl.textContent.trim();

  const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (asinMatch) ctx.asin = asinMatch[1];

  const titleEl = document.getElementById('productTitle');
  if (titleEl) ctx.productTitle = titleEl.textContent.trim().substring(0, 80);

  const cartEl = document.getElementById('nav-cart-count');
  if (cartEl) ctx.cartCount = cartEl.textContent.trim();

  return ctx;
}

window.__webmcpRegistry.pageContextProvider = getAmazonPageContext;
window.__webmcpRegistry.sitePrompt = typeof AMAZON_PROMPT !== 'undefined' ? AMAZON_PROMPT : '';

function registerAmazonTools() {
  const url = window.location.href;
  const registry = window.__webmcpRegistry;

  [
    'search_products', 'get_results', 'set_filters', 'sort_results',
    'get_product_details', 'get_reviews', 'check_price_history',
    'add_to_cart', 'buy_now', 'get_cart', 'compare_products', 'get_checkout_summary'
  ].forEach(name => registry.unregister(name));

  const isAmazon = url.includes('amazon.com');
  if (!isAmazon) return;

  const isSearchPage = url.includes('amazon.com/s?') || url.includes('amazon.com/s/');
  const isProductPage = /\/(?:dp|gp\/product)\/[A-Z0-9]{10}/i.test(url);
  const isCartPage = url.includes('/gp/cart') || url.includes('/cart/view');
  const isCheckoutPage = url.includes('/gp/buy') || url.includes('/checkout') || url.includes('placeOrder');

  registry.register(SearchProductsTool);
  registry.register(GetCartTool);

  if (isSearchPage) {
    registry.register(GetResultsTool);
    registry.register(SetFiltersTool);
    registry.register(SortResultsTool);
    registry.register(CompareProductsTool);
    registry.register(GetProductDetailsTool);
  }

  if (isProductPage) {
    registry.register(GetProductDetailsTool);
    registry.register(GetReviewsTool);
    registry.register(CheckPriceHistoryTool);
    registry.register(AddToCartTool);
    registry.register(BuyNowTool);
  }

  if (isCheckoutPage) {
    registry.register(GetCheckoutSummaryTool);
  }
}

registerAmazonTools();

let lastHref = window.location.href;
const navObserver = new MutationObserver(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    registerAmazonTools();
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate', () => {
  setTimeout(registerAmazonTools, 100);
});
