// content/sites/target/tools/getSearchResults.js

const GetSearchResultsTool = {
  name: 'get_search_results',
  description: 'Read the current product listings from a Target search results or category page. Returns product names, prices, ratings, and brands.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'integer',
        description: 'Maximum number of products to return. Defaults to 10.'
      }
    }
  },

  execute: async (args) => {
    const { maxResults = 10 } = args;

    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    await WebMCPHelpers.waitForTargetResults(15000);

    // Strategy 1: Find product cards via data-test attributes
    let cards = Array.from(
      document.querySelectorAll('[data-test="@web/ProductCard/ProductCardVariantDefault"]')
    );

    // Strategy 2: Find cards by product link structure
    if (cards.length === 0) {
      const grid = document.querySelector('[data-test="product-grid"]') ||
                   document.querySelector('[data-test="resultsArea"]');
      if (grid) {
        // Each product card typically contains an <a> linking to /p/
        const links = Array.from(grid.querySelectorAll('a[href*="/p/"]'));
        // Walk up to card container — usually a <li> or a div wrapping the card
        const seen = new Set();
        for (const link of links) {
          let container = link.closest('li') || link.closest('[data-test*="ProductCard"]');
          if (!container) {
            // Walk up a few levels to find a reasonable card boundary
            container = link.parentElement?.parentElement?.parentElement;
          }
          if (container && !seen.has(container)) {
            seen.add(container);
            cards.push(container);
          }
        }
      }
    }

    // Strategy 3: broadest fallback — any container with a /p/ link and a price
    if (cards.length === 0) {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/p/"]'));
      const seen = new Set();
      for (const link of allLinks) {
        const container = link.closest('li') || link.parentElement?.parentElement;
        if (container && !seen.has(container) && /\$[\d,.]+/.test(container.textContent)) {
          seen.add(container);
          cards.push(container);
        }
      }
    }

    // Only include visible cards
    cards = cards.filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);

    if (cards.length === 0) {
      return { content: [{ type: 'text', text: 'No product results found. The page may still be loading or the search returned no results.' }] };
    }

    const results = cards.slice(0, maxResults).map((card, i) =>
      WebMCPHelpers.parseTargetProductCard(card, i + 1)
    );

    const summary = results.map(r => {
      let line = `${r.rank}. ${r.name || 'Unknown'}`;
      if (r.brand) line += ` (${r.brand})`;
      line += ` — ${r.price || 'Price N/A'}`;
      if (r.regularPrice) line += ` (was ${r.regularPrice})`;
      if (r.rating) line += ` | ${r.rating} stars`;
      if (r.reviewCount) line += ` (${r.reviewCount} reviews)`;
      if (r.badge) line += ` [${r.badge}]`;
      return line;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${cards.length} product(s) (showing ${results.length}):\n\n${summary}`
      }]
    };
  }
};
