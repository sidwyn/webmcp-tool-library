// content/sites/walmart/helpers.js — Walmart-specific DOM utilities

WebMCPHelpers.waitForWalmartResults = async function(timeout = 20000) {
  const start = Date.now();

  function hasResults() {
    if (document.querySelectorAll('[data-testid="list-view"] [data-item-id]').length > 0) return true;
    if (document.querySelectorAll('[data-item-id]').length > 0) return true;
    const cards = document.querySelectorAll('[data-testid="item-stack"] > div, .search-result-gridview-item');
    if (cards.length > 0) return true;
    return Array.from(document.querySelectorAll('div[data-automation-id="product-price"], span[data-automation-id="product-price"]')).length > 0;
  }

  if (hasResults()) return true;
  await WebMCPHelpers.sleep(500);
  if (hasResults()) return true;

  const loadingSelectors = [
    '[data-testid="loading-indicator"]',
    '[aria-label*="Loading"]',
    '[role="progressbar"]'
  ];

  for (const selector of loadingSelectors) {
    if (Date.now() - start > timeout) break;
    try {
      await WebMCPHelpers.waitForElementToDisappear(selector, Math.min(5000, timeout - (Date.now() - start)));
    } catch {}
  }

  return new Promise(resolve => {
    const check = () => {
      if (hasResults()) { resolve(true); return; }
      if (Date.now() - start > timeout) { resolve(false); return; }
      setTimeout(check, 200);
    };
    check();
  });
};

WebMCPHelpers.findWalmartProductCards = function() {
  let cards = Array.from(document.querySelectorAll('[data-item-id]'));
  if (cards.length > 0) return cards.filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);

  cards = Array.from(document.querySelectorAll('[data-testid="item-stack"] > div'));
  if (cards.length > 0) return cards.filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);

  const allDivs = Array.from(document.querySelectorAll('div'));
  const candidates = allDivs.filter(el => {
    if (el.offsetHeight < 50 || el.children.length < 2) return false;
    const text = el.textContent;
    const hasPrice = /\$\d+/.test(text);
    const hasLink = el.querySelector('a[href*="/ip/"]') !== null;
    return hasPrice && hasLink;
  });
  return candidates.filter(el =>
    !candidates.some(other => other !== el && other.contains(el))
  );
};

WebMCPHelpers.parseWalmartProductCard = function(card, rank) {
  const text = card.textContent;

  const titleLink = card.querySelector('a[href*="/ip/"] span') ||
                    card.querySelector('a[href*="/ip/"]');
  const title = titleLink?.textContent?.trim() || null;

  const priceEl = card.querySelector('[data-automation-id="product-price"] .f2, [data-automation-id="product-price"]');
  let price = null;
  if (priceEl) {
    const priceMatch = priceEl.textContent.trim().match(/\$[\d,]+(?:\.\d{2})?/);
    price = priceMatch ? priceMatch[0] : null;
  }
  if (!price) {
    const allPrices = text.match(/\$[\d,]+(?:\.\d{2})?/g);
    price = allPrices ? allPrices[0] : null;
  }

  let originalPrice = null;
  const wasPriceEl = card.querySelector('[data-automation-id="strikethrough-price"], .strikethrough');
  if (wasPriceEl) {
    const match = wasPriceEl.textContent.match(/\$[\d,]+(?:\.\d{2})?/);
    originalPrice = match ? match[0] : null;
  }

  let rating = null;
  let reviewCount = null;
  const ratingEl = card.querySelector('[data-testid="product-ratings"] [aria-label], [aria-label*="out of 5"]');
  if (ratingEl) {
    const ratingLabel = ratingEl.getAttribute('aria-label') || '';
    const ratingMatch = ratingLabel.match(/([\d.]+)\s*out\s*of\s*5/i);
    rating = ratingMatch ? ratingMatch[1] : null;
  }
  const reviewEl = card.querySelector('[data-testid="product-ratings"] + span, [aria-label*="review"]');
  if (reviewEl) {
    const countMatch = reviewEl.textContent.match(/(\d[\d,]*)/);
    reviewCount = countMatch ? countMatch[1] : null;
  }

  const fulfillmentEl = card.querySelector('[data-automation-id="fulfillment-badge"], [data-testid="fulfillment-badge"]');
  const fulfillment = fulfillmentEl?.textContent?.trim() || null;

  const sellerEl = card.querySelector('[data-automation-id="sold-by"], [data-testid="sold-by"]');
  const seller = sellerEl?.textContent?.trim() || null;

  const outOfStock = /out of stock/i.test(text);

  return { rank, title, price, originalPrice, rating, reviewCount, seller, fulfillment, outOfStock };
};

WebMCPHelpers.parseWalmartProductDetail = function() {
  const result = {};

  const titleEl = document.querySelector('[data-testid="product-title"], h1[itemprop="name"], #main-title');
  result.title = titleEl?.textContent?.trim() || null;

  const priceEl = document.querySelector('[data-testid="price-wrap"] [itemprop="price"], [itemprop="price"]');
  if (priceEl) {
    const priceMatch = priceEl.textContent.match(/\$[\d,]+(?:\.\d{2})?/) ||
                       [priceEl.getAttribute('content')];
    result.price = priceMatch ? (priceMatch[0]?.startsWith('$') ? priceMatch[0] : '$' + priceMatch[0]) : null;
  } else {
    const priceText = document.querySelector('[data-testid="price-wrap"]')?.textContent || '';
    const match = priceText.match(/\$[\d,]+(?:\.\d{2})?/);
    result.price = match ? match[0] : null;
  }

  const wasPriceEl = document.querySelector('[data-testid="price-wrap"] [data-automation-id="strikethrough-price"], .strikethrough');
  if (wasPriceEl) {
    const match = wasPriceEl.textContent.match(/\$[\d,]+(?:\.\d{2})?/);
    result.originalPrice = match ? match[0] : null;
  }

  const ratingEl = document.querySelector('[data-testid="reviews-and-ratings"] [aria-label*="out of 5"], [itemprop="ratingValue"]');
  if (ratingEl) {
    const val = ratingEl.getAttribute('content') || ratingEl.getAttribute('aria-label') || '';
    const match = val.match(/([\d.]+)/);
    result.rating = match ? match[1] : null;
  }

  const reviewEl = document.querySelector('[data-testid="reviews-and-ratings"] a, [itemprop="reviewCount"]');
  if (reviewEl) {
    const val = reviewEl.getAttribute('content') || reviewEl.textContent || '';
    const match = val.match(/(\d[\d,]*)/);
    result.reviewCount = match ? match[1] : null;
  }

  const availEl = document.querySelector('[data-testid="add-to-cart-btn"], button[aria-label*="Add to cart"]');
  result.inStock = !!availEl;

  const sellerEl = document.querySelector('[data-testid="sold-by-section"] a, [data-automation-id="sold-by"] a, a[href*="/seller/"]');
  result.seller = sellerEl?.textContent?.trim() || 'Walmart';

  const fulfillmentEls = document.querySelectorAll('[data-testid="fulfillment-options-wrapper"] div, [data-automation-id*="fulfillment"]');
  const fulfillmentOptions = [];
  fulfillmentEls.forEach(el => {
    const t = el.textContent.trim();
    if (t && t.length < 100 && /shipping|pickup|delivery|free/i.test(t)) {
      fulfillmentOptions.push(t);
    }
  });
  result.fulfillment = fulfillmentOptions.length > 0 ? [...new Set(fulfillmentOptions)].join('; ') : null;

  const highlightsSection = WebMCPHelpers.findByText('About this item') ||
                            document.querySelector('[data-testid="product-highlights"]');
  if (highlightsSection) {
    const container = highlightsSection.closest('div')?.parentElement || highlightsSection;
    const bullets = Array.from(container.querySelectorAll('li')).map(li => li.textContent.trim()).filter(Boolean);
    result.highlights = bullets.length > 0 ? bullets.slice(0, 8) : null;
  }

  const specsSection = document.querySelector('[data-testid="product-specifications"], [data-testid="specifications"]');
  if (specsSection) {
    const rows = Array.from(specsSection.querySelectorAll('tr, [data-testid="specification-row"]'));
    const specs = {};
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th, span');
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const val = cells[1].textContent.trim();
        if (key && val) specs[key] = val;
      }
    });
    result.specifications = Object.keys(specs).length > 0 ? specs : null;
  }

  return result;
};
