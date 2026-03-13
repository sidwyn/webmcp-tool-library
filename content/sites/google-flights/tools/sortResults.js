// content/tools/google-flights/sortResults.js

const SortResultsTool = {
  name: 'sort_results',
  description: 'Sort flight results by "best" (Google\'s recommended mix of price, duration, and stops) or "cheapest" (lowest price first). Only works on a Google Flights results page.',
  inputSchema: {
    type: 'object',
    properties: {
      sortBy: {
        type: 'string',
        enum: ['best', 'cheapest'],
        description: '"best" for Google\'s recommended ranking, "cheapest" for lowest price first'
      }
    },
    required: ['sortBy']
  },

  execute: async (args) => {
    const { sortBy } = args;

    if (!window.location.href.includes('google.com/travel/flights')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Google Flights.' }] };
    }

    const labels = sortBy === 'cheapest'
      ? ['Cheapest', 'Cheapest flights', 'Sort by cheapest']
      : ['Best', 'Best flights', 'Sort by best'];

    let clicked = false;
    for (const label of labels) {
      const btn = WebMCPHelpers.findByText(label, '[role="tab"]') ||
                  WebMCPHelpers.findByText(label, 'button') ||
                  WebMCPHelpers.findByAriaLabel(label);
      if (btn) {
        WebMCPHelpers.simulateClick(btn);
        await WebMCPHelpers.sleep(400);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      return { content: [{ type: 'text', text: `Could not find the "${sortBy}" sort tab. Make sure results are loaded.` }] };
    }

    return {
      content: [{
        type: 'text',
        text: `Sorted by: ${sortBy}. Call get_results to see the updated flight list.`
      }]
    };
  }
};
