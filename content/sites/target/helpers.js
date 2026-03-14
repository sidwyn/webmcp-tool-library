// content/sites/target/helpers.js — Target-specific DOM utilities
// Extends WebMCPHelpers (loaded from content/helpers.js)

/**
 * Wait for Target product results to finish loading.
 * Target shows skeleton/placeholder cards while fetching.
 */
WebMCPHelpers.waitForTargetResults = async function(timeout = 15000) {
  const start = Date.now();

  function hasResults() {
    // data-test="product-grid" is Target's product listing container
    if (document.querySelector('[data-test="product-grid"]')) return true;
    // Fallback: look for product cards by structure
    const cards = document.querySelectorAll('[data-test="@web/ProductCard/ProductCardVariantDefault"]');
    if (cards.length > 0) return true;
    // Broader fallback: look for product link patterns
    return document.querySelectorAll('a[href*="/p/"]').length >= 3;
  }

  if (hasResults()) return true;

  await WebMCPHelpers.sleep(500);
  if (hasResults()) return true;

  // Wait for loading/skeleton to disappear
  try {
    await WebMCPHelpers.waitForElementToDisappear('[data-test="loading-spinner"]', Math.min(5000, timeout));
  } catch {
    // May not be present
  }

  // Poll for results
  return new Promise(resolve => {
    const check = () => {
      if (hasResults()) { resolve(true); return; }
      if (Date.now() - start > timeout) { resolve(false); return; }
      setTimeout(check, 200);
    };
    check();
  });
};

/**
 * Parse a Target product card element into structured data.
 * Target uses data-test attributes on many elements.
 */
WebMCPHelpers.parseTargetProductCard = function(card, rank) {
  // Product name
  const nameEl = card.querySelector('[data-test="product-title"]') ||
                 card.querySelector('a[data-test="product-title"]') ||
                 card.querySelector('a[href*="/p/"] span') ||
                 card.querySelector('a[href*="/p/"]');
  const name = nameEl?.textContent?.trim() || null;

  // Price — Target shows current price and sometimes a regular (comparison) price
  const currentPriceEl = card.querySelector('[data-test="current-price"]');
  const price = currentPriceEl?.textContent?.trim() || null;

  const regPriceEl = card.querySelector('[data-test="comparison-price"]');
  const regularPrice = regPriceEl?.textContent?.trim() || null;

  // Rating
  const ratingEl = card.querySelector('[data-test="ratings"]');
  const ratingText = ratingEl?.textContent?.trim() || '';
  const ratingMatch = ratingText.match(/([\d.]+)\s*out of\s*5/i) ||
                      ratingText.match(/([\d.]+)/);
  const rating = ratingMatch ? ratingMatch[1] : null;

  // Review count
  const reviewCountMatch = ratingText.match(/([\d,]+)\s*(?:ratings?|reviews?)/i);
  const reviewCount = reviewCountMatch ? reviewCountMatch[1] : null;

  // Brand — sometimes shown above the product name
  const brandEl = card.querySelector('[data-test="product-brand"]') ||
                  card.querySelector('a[data-test="product-brand"]');
  const brand = brandEl?.textContent?.trim() || null;

  // Product URL
  const linkEl = card.querySelector('a[href*="/p/"]');
  const productUrl = linkEl ? linkEl.href : null;

  // Deal/promo badge
  const badgeEl = card.querySelector('[data-test="product-promo-badge"]') ||
                  card.querySelector('[data-test="deal-badge"]');
  const badge = badgeEl?.textContent?.trim() || null;

  return { rank, name, brand, price, regularPrice, rating, reviewCount, badge, productUrl };
};

/**
 * Type into Target's search bar and submit.
 * Target uses a combobox search with autocomplete suggestions.
 */
WebMCPHelpers.simulateTargetSearch = async function(query) {
  // Find the search input
  const searchInput = document.querySelector('#search') ||
                      document.querySelector('input[data-test="search-input"]') ||
                      WebMCPHelpers.findByAriaLabel('search') ||
                      document.querySelector('input[type="search"]') ||
                      document.querySelector('input[name="searchTerm"]');
  if (!searchInput) return false;

  searchInput.focus();
  searchInput.dispatchEvent(new Event('focusin', { bubbles: true }));

  // Clear and set value using native setter for React compatibility
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  const setValue = (el, val) => {
    if (nativeSetter?.set) nativeSetter.set.call(el, val);
    else el.value = val;
  };

  setValue(searchInput, '');
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await WebMCPHelpers.sleep(100);

  // Type the query
  setValue(searchInput, query);
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await WebMCPHelpers.sleep(300);

  // Submit via Enter key
  searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

  // Also try clicking the search button as fallback
  await WebMCPHelpers.sleep(200);
  const searchBtn = document.querySelector('button[data-test="search-button"]') ||
                    WebMCPHelpers.findByAriaLabel('search');
  if (searchBtn && searchBtn.tagName === 'BUTTON') {
    WebMCPHelpers.simulateClick(searchBtn);
  }

  return true;
};

/**
 * Wait for a Target product detail page to fully load.
 */
WebMCPHelpers.waitForTargetPDP = async function(timeout = 15000) {
  const start = Date.now();

  function hasPDP() {
    return !!(
      document.querySelector('[data-test="product-title"]') ||
      document.querySelector('[data-test="product-price"]') ||
      document.querySelector('h1[data-test]')
    );
  }

  if (hasPDP()) return true;

  await WebMCPHelpers.sleep(500);
  if (hasPDP()) return true;

  return new Promise(resolve => {
    const check = () => {
      if (hasPDP()) { resolve(true); return; }
      if (Date.now() - start > timeout) { resolve(false); return; }
      setTimeout(check, 200);
    };
    check();
  });
};
