// content/sites/target/tools/getDeals.js

const GetDealsTool = {
  name: 'get_deals',
  description: 'Read current deals, promotions, and Target Circle offers visible on the page. Works on search results, product detail pages, and deal pages.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Optional deal category to navigate to (e.g., "electronics", "clothing", "home"). If provided, navigates to that deal category first.'
      }
    }
  },

  execute: async (args) => {
    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    // Navigate to deals category if specified
    if (args.category) {
      const url = `https://www.target.com/c/top-deals/-/N-4xvef?type=products&searchTerm=${encodeURIComponent(args.category)}`;
      setTimeout(() => { window.location.href = url; }, 50);
      return {
        content: [{
          type: 'text',
          text: `Navigating to Target deals for "${args.category}". Wait for the page to load, then call get_deals again (without category) to read them.`
        }]
      };
    }

    const deals = [];

    // 1. Read promotional banners
    const banners = document.querySelectorAll('[data-test="promo-banner"], [data-test="promotion-message"]');
    for (const banner of banners) {
      const text = banner.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 5) deals.push({ type: 'Promo', text });
    }

    // 2. Read Target Circle offers on PDP
    const circleOffers = document.querySelectorAll('[data-test="circle-offer"], [data-test="offer-card"]');
    for (const offer of circleOffers) {
      const text = offer.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 5) deals.push({ type: 'Circle Offer', text });
    }

    // 3. Read deal badges on product cards (search results page)
    const badges = document.querySelectorAll('[data-test="product-promo-badge"], [data-test="deal-badge"]');
    for (const badge of badges) {
      const text = badge.textContent.trim();
      const card = badge.closest('[data-test*="ProductCard"]') || badge.closest('li');
      const productName = card?.querySelector('[data-test="product-title"]')?.textContent?.trim() ||
                          card?.querySelector('a[href*="/p/"]')?.textContent?.trim() || '';
      if (text.length > 2) {
        deals.push({ type: 'Deal', text: productName ? `${productName}: ${text}` : text });
      }
    }

    // 4. Read sale/clearance messaging on PDP
    const saleEls = document.querySelectorAll('[data-test="product-price-sale"], [data-test="sale-price"]');
    for (const el of saleEls) {
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 3) deals.push({ type: 'Sale', text });
    }

    // 5. Look for general deal content in the page
    const dealSections = document.querySelectorAll('[data-test*="deal"], [data-test*="offer"], [data-test*="promo"]');
    for (const section of dealSections) {
      const text = section.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 10 && text.length < 200 && !deals.some(d => d.text === text)) {
        deals.push({ type: 'Deal', text });
      }
    }

    // 6. Fallback: look for common deal patterns in visible text
    if (deals.length === 0) {
      const allElements = document.querySelectorAll('span, div, p, a');
      for (const el of allElements) {
        if (el.children.length > 2) continue;
        const text = el.textContent.trim();
        if (text.length < 10 || text.length > 200) continue;
        if (/(save|off|% off|buy \d|free|bogo|clearance|deal of the day)/i.test(text)) {
          if (!deals.some(d => d.text === text)) {
            deals.push({ type: 'Promotion', text });
          }
        }
        if (deals.length >= 20) break;
      }
    }

    if (deals.length === 0) {
      return { content: [{ type: 'text', text: 'No deals or promotions found on the current page.' }] };
    }

    const output = deals.map((d, i) => `${i + 1}. [${d.type}] ${d.text}`).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${deals.length} deal(s)/promotion(s):\n\n${output}`
      }]
    };
  }
};
