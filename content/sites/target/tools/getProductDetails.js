// content/sites/target/tools/getProductDetails.js

const GetProductDetailsTool = {
  name: 'get_product_details',
  description: 'Read full product details from a Target product page. If a rank number is provided, clicks into that product from search results first. Returns name, price, description, specs, rating, reviews, and availability.',
  inputSchema: {
    type: 'object',
    properties: {
      rank: {
        type: 'integer',
        description: 'Product rank number from search results to click into. Omit if already on a product detail page.'
      }
    }
  },

  execute: async (args) => {
    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    // If rank provided, click into that product from search results
    if (args.rank) {
      let cards = Array.from(
        document.querySelectorAll('[data-test="@web/ProductCard/ProductCardVariantDefault"]')
      );
      if (cards.length === 0) {
        const grid = document.querySelector('[data-test="product-grid"]') ||
                     document.querySelector('[data-test="resultsArea"]');
        if (grid) {
          const links = Array.from(grid.querySelectorAll('a[href*="/p/"]'));
          const seen = new Set();
          for (const link of links) {
            const container = link.closest('li') || link.closest('[data-test*="ProductCard"]') ||
                              link.parentElement?.parentElement?.parentElement;
            if (container && !seen.has(container)) {
              seen.add(container);
              cards.push(container);
            }
          }
        }
      }

      cards = cards.filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);

      if (args.rank < 1 || args.rank > cards.length) {
        return { content: [{ type: 'text', text: `ERROR: Invalid rank ${args.rank}. Found ${cards.length} products on page.` }] };
      }

      const card = cards[args.rank - 1];
      const link = card.querySelector('a[href*="/p/"]');
      if (link) {
        WebMCPHelpers.simulateClick(link);
        await WebMCPHelpers.sleep(2000);
        await WebMCPHelpers.waitForTargetPDP(15000);
      } else {
        return { content: [{ type: 'text', text: 'ERROR: Could not find product link in card.' }] };
      }
    }

    // Now on a product detail page — read all the info
    const details = {};

    // Product name
    const titleEl = document.querySelector('[data-test="product-title"]') ||
                    document.querySelector('h1');
    details.name = titleEl?.textContent?.trim() || 'Unknown';

    // Price
    const priceEl = document.querySelector('[data-test="product-price"]') ||
                    document.querySelector('[data-test="current-price"]');
    details.price = priceEl?.textContent?.trim() || null;

    // Regular/comparison price (if on sale)
    const regPriceEl = document.querySelector('[data-test="comparison-price"]');
    details.regularPrice = regPriceEl?.textContent?.trim() || null;

    // Rating and reviews
    const ratingEl = document.querySelector('[data-test="ratings"]') ||
                     document.querySelector('[data-test="rating-count"]');
    if (ratingEl) {
      const ratingText = ratingEl.textContent.trim();
      const ratingMatch = ratingText.match(/([\d.]+)\s*out of\s*5/i) || ratingText.match(/([\d.]+)/);
      details.rating = ratingMatch ? ratingMatch[1] : null;
      const reviewMatch = ratingText.match(/([\d,]+)\s*(?:ratings?|reviews?)/i);
      details.reviewCount = reviewMatch ? reviewMatch[1] : null;
    }

    // Description
    const descEl = document.querySelector('[data-test="item-details-description"]') ||
                   document.querySelector('[data-test="product-description"]');
    if (descEl) {
      details.description = descEl.textContent.trim().substring(0, 500);
      if (descEl.textContent.trim().length > 500) details.description += '...';
    }

    // Specifications/highlights
    const specsEl = document.querySelector('[data-test="item-details-specifications"]');
    if (specsEl) {
      const specs = Array.from(specsEl.querySelectorAll('div, li')).map(el => el.textContent.trim())
        .filter(t => t.length > 0 && t.includes(':'))
        .slice(0, 10);
      if (specs.length > 0) details.specifications = specs.join('\n');
    }

    // Fulfillment / availability
    const fulfillmentEl = document.querySelector('[data-test="fulfillment-cell"]') ||
                          document.querySelector('[data-test="shippingBlock"]');
    if (fulfillmentEl) {
      details.availability = fulfillmentEl.textContent.trim().replace(/\s+/g, ' ').substring(0, 300);
    }

    // Size/color options
    const variationEls = document.querySelectorAll('[data-test="swatch-group"] button, [data-test="variation"] button');
    if (variationEls.length > 0) {
      const options = Array.from(variationEls).map(el =>
        el.getAttribute('aria-label') || el.textContent.trim()
      ).filter(t => t.length > 0).slice(0, 20);
      if (options.length > 0) details.options = options.join(', ');
    }

    // Format output
    let output = `**${details.name}**\n`;
    if (details.price) {
      output += `Price: ${details.price}`;
      if (details.regularPrice) output += ` (was ${details.regularPrice})`;
      output += '\n';
    }
    if (details.rating) {
      output += `Rating: ${details.rating}/5`;
      if (details.reviewCount) output += ` (${details.reviewCount} reviews)`;
      output += '\n';
    }
    if (details.options) output += `Options: ${details.options}\n`;
    if (details.availability) output += `Availability: ${details.availability}\n`;
    if (details.description) output += `\nDescription: ${details.description}\n`;
    if (details.specifications) output += `\nSpecifications:\n${details.specifications}\n`;

    return { content: [{ type: 'text', text: output }] };
  }
};
