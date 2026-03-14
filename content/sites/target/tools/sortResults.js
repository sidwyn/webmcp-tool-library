// content/sites/target/tools/sortResults.js

const SortResultsTool = {
  name: 'sort_results',
  description: 'Sort Target search results by a given criteria. Only works on a Target search or category page.',
  inputSchema: {
    type: 'object',
    properties: {
      sortBy: {
        type: 'string',
        enum: ['relevance', 'price_low', 'price_high', 'rating', 'bestselling', 'newest'],
        description: 'Sort order: "relevance" (default), "price_low" (low to high), "price_high" (high to low), "rating" (highest rated), "bestselling", or "newest"'
      }
    },
    required: ['sortBy']
  },

  execute: async (args) => {
    const { sortBy } = args;

    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    // Map sort options to Target's dropdown labels
    const sortLabels = {
      relevance: ['Relevance', 'Featured'],
      price_low: ['Price: low to high', 'Price (low to high)'],
      price_high: ['Price: high to low', 'Price (high to low)'],
      rating: ['Average ratings', 'Guest Rating', 'Avg. guest rating'],
      bestselling: ['Best selling', 'Bestselling', 'Best sellers'],
      newest: ['Newest', 'New']
    };

    const labels = sortLabels[sortBy] || [sortBy];

    // Open the sort dropdown
    const sortBtn = document.querySelector('[data-test="sortBy"]') ||
                    document.querySelector('button[data-test="sort-by-button"]') ||
                    WebMCPHelpers.findByText('Sort by', 'button') ||
                    WebMCPHelpers.findByAriaLabel('sort');
    if (!sortBtn) {
      return { content: [{ type: 'text', text: 'Could not find the sort dropdown. Make sure you are on a search results page.' }] };
    }

    WebMCPHelpers.simulateClick(sortBtn);
    await WebMCPHelpers.sleep(400);

    // Click the matching sort option
    let clicked = false;
    for (const label of labels) {
      const option = WebMCPHelpers.findByText(label, '[role="option"]') ||
                     WebMCPHelpers.findByText(label, 'a') ||
                     WebMCPHelpers.findByText(label, 'li') ||
                     WebMCPHelpers.findByText(label, 'button');
      if (option) {
        WebMCPHelpers.simulateClick(option);
        await WebMCPHelpers.sleep(500);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      return { content: [{ type: 'text', text: `Could not find sort option "${sortBy}". The dropdown may have different labels.` }] };
    }

    return {
      content: [{
        type: 'text',
        text: `Sorted by: ${sortBy.replace(/_/g, ' ')}. Call get_search_results to see the updated product list.`
      }]
    };
  }
};
