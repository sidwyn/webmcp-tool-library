// content/sites/target/tools/searchProducts.js

const SearchProductsTool = {
  name: 'search_products',
  description: 'Search for products on Target.com by keyword. Navigates to search results. After calling this tool, call get_search_results to read the product listings.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g., "wireless headphones", "laundry detergent", "kids toys")'
      }
    },
    required: ['query']
  },

  execute: async (args) => {
    const { query } = args;

    if (!query || query.trim().length === 0) {
      return { content: [{ type: 'text', text: 'ERROR: query is required.' }] };
    }

    // If already on Target, use the search bar
    if (window.location.hostname.includes('target.com')) {
      const searched = await WebMCPHelpers.simulateTargetSearch(query);
      if (searched) {
        await WebMCPHelpers.sleep(2000);
        const loaded = await WebMCPHelpers.waitForTargetResults(15000);
        return {
          content: [{
            type: 'text',
            text: loaded
              ? `Searched for "${query}" on Target. Call get_search_results to see the products.`
              : `Searched for "${query}" on Target. Results may still be loading — call get_search_results to check.`
          }]
        };
      }
    }

    // Fallback: navigate via URL
    const url = `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`;
    setTimeout(() => { window.location.href = url; }, 50);

    return {
      content: [{
        type: 'text',
        text: `Navigating to Target search for "${query}". Wait for the page to load, then call get_search_results.`
      }]
    };
  }
};
