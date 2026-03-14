// content/sites/walmart/tools/sortResults.js

const SortResultsTool = {
  name: 'sort_results',
  description: 'Sort Walmart search results by a given criterion.',
  inputSchema: {
    type: 'object',
    properties: {
      sortBy: {
        type: 'string',
        enum: ['best_match', 'price_low', 'price_high', 'best_seller', 'rating_high', 'new'],
        description: 'Sort criterion.'
      }
    },
    required: ['sortBy']
  },

  execute: async (args) => {
    const { sortBy } = args;
    const url = window.location.href;

    if (!url.includes('walmart.com/search') && !url.includes('walmart.com/browse') && !url.includes('walmart.com/cp/')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on a Walmart search/category page.' }] };
    }

    const sortLabels = {
      best_match: 'Best Match', price_low: 'Price Low', price_high: 'Price High',
      best_seller: 'Best Seller', rating_high: 'Rating High', new: 'New'
    };

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('sort', sortBy);
    setTimeout(() => { window.location.href = currentUrl.toString(); }, 50);

    return {
      content: [{
        type: 'text',
        text: `Sorting results by "${sortLabels[sortBy] || sortBy}". Page will reload — call get_results after it loads.`
      }]
    };
  }
};
