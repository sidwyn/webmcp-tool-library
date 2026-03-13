// content/tools/google-flights/selectReturnFlight.js

const SelectReturnFlightTool = {
  name: 'select_return_flight',
  description: 'After selecting a departing flight, Google Flights shows return flight options. Use this tool to read the available return flights, or select one by rank. Call without a rank to list return options, or with a rank to select one.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'select'],
        description: '"list" to read return flight options, "select" to pick one. Defaults to "list".'
      },
      rank: {
        type: 'integer',
        description: 'Rank of the return flight to select (1-based). Required when action is "select".'
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum return flights to show when listing. Defaults to 5.'
      }
    }
  },

  execute: async (args) => {
    const { action = 'list', rank, maxResults = 5 } = args;

    if (!window.location.href.includes('google.com/travel/flights')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Google Flights.' }] };
    }

    const { simulateClick, sleep, parseGoogleFlightCard } = WebMCPHelpers;

    // Detect if we're on the return flight selection page
    // Google Flights shows "Return flights" or "Select return flight" heading
    const pageText = document.body.textContent;
    const isReturnPage = /returning flights|select return|return flights/i.test(pageText);

    // Also check for "Departing" label that indicates we've selected a departing flight
    const hasDepartingLabel = /departing flight|selected departure/i.test(pageText);

    if (!isReturnPage && !hasDepartingLabel) {
      // Check if there are flight cards anyway (Google Flights might not show explicit label)
      const cards = Array.from(document.querySelectorAll('div.yR1fYc'));
      if (cards.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Not on a return flight selection page. First search for a round-trip flight, then select a departing flight from the results. Google Flights will then show return options.'
          }]
        };
      }
    }

    // Wait for results
    await sleep(400);

    // Scope search to the return flights section to avoid picking up cached outbound cards.
    // Google Flights shows "Returning flights" as a heading above the return options.
    let searchRoot = document;
    const allElements = Array.from(document.querySelectorAll('h2, h3, div[role="heading"], span, div'));
    const returnHeading = allElements.find(el =>
      el.children.length === 0 && /^Returning flights$/i.test(el.textContent.trim())
    );
    if (returnHeading) {
      // Walk up from the heading until we find a container with flight cards
      let container = returnHeading.parentElement;
      for (let i = 0; i < 15 && container && container !== document.body; i++) {
        if (container.querySelectorAll('div.yR1fYc').length >= 1) {
          searchRoot = container;
          break;
        }
        container = container.parentElement;
      }
    }

    // Find return flight cards within the scoped container
    let cards = Array.from(searchRoot.querySelectorAll('div.yR1fYc'));
    if (cards.length === 0) {
      const allDivs = Array.from(searchRoot.querySelectorAll('div'));
      cards = allDivs.filter(el => {
        const h = el.offsetHeight;
        if (h < 60 || h > 200 || el.children.length < 3) return false;
        const text = el.textContent;
        return /\$[\d,]+/.test(text) && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text) &&
               /(nonstop|\d+\s+stop)/i.test(text);
      }).filter((el, _, arr) => !arr.some(o => o !== el && o.contains(el)));
    }

    // Extra safety: only include visible cards (exclude hidden/cached outbound cards)
    cards = cards.filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);

    if (cards.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No return flight options found. The page may still be loading, or you need to select a departing flight first.'
        }]
      };
    }

    if (action === 'select') {
      if (!rank || rank < 1 || rank > cards.length) {
        return {
          content: [{
            type: 'text',
            text: `Invalid rank ${rank}. There are ${cards.length} return flight options (1-${cards.length}).`
          }]
        };
      }

      const card = cards[rank - 1];
      simulateClick(card);
      await sleep(800);

      const result = parseGoogleFlightCard(card, rank);
      return {
        content: [{
          type: 'text',
          text: `Selected return flight #${rank}: ${result.airline || 'Unknown'} — ${result.departure || '?'} → ${result.arrival || '?'} (${result.duration || '?'}, ${result.stops || '?'}) — ${result.price || '?'}. The booking page should now be loading.`
        }]
      };
    }

    // List return flights
    const results = cards.slice(0, maxResults).map((card, i) => parseGoogleFlightCard(card, i + 1));

    const summary = results.map(r =>
      `${r.rank}. ${r.airline || 'Unknown'} — ${r.departure || '?'} → ${r.arrival || '?'} (${r.duration || '?'}, ${r.stops || '?'}) — ${r.price || '?'}`
    ).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} return flight option(s):\n\n${summary}\n\nCall select_return_flight with action "select" and a rank number to choose one.`
      }]
    };
  }
};
