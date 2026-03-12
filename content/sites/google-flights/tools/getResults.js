// content/tools/google-flights/getResults.js

const GetResultsTool = {
  name: 'get_results',
  description: 'Read the current flight search results from the Google Flights page and return them as structured data. Must be on a Google Flights results page.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'integer',
        description: 'Maximum number of results to return. Defaults to 5.'
      }
    }
  },

  execute: async (args) => {
    const { maxResults = 5 } = args;

    if (!window.location.href.includes('google.com/travel/flights')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Google Flights. Please navigate to google.com/travel/flights and run a search first.' }] };
    }

    // Wait for results to load
    await WebMCPHelpers.waitForGoogleFlightsResults(25000);

    // Scope search: if on the return flights page, only look in the return section
    // to avoid picking up cached outbound flight cards still in the SPA DOM.
    let searchRoot = document;
    const pageText = document.body.textContent;
    if (/returning flights|choose return/i.test(pageText)) {
      const allElements = Array.from(document.querySelectorAll('h2, h3, div[role="heading"], span, div'));
      const returnHeading = allElements.find(el =>
        el.children.length === 0 && /^Returning flights$/i.test(el.textContent.trim())
      );
      if (returnHeading) {
        let container = returnHeading.parentElement;
        for (let i = 0; i < 15 && container && container !== document.body; i++) {
          if (container.querySelectorAll('div.yR1fYc').length >= 1) {
            searchRoot = container;
            break;
          }
          container = container.parentElement;
        }
      }
    }

    // Google Flights uses obfuscated class names that change periodically.
    // Strategy 1: the known flight card container class (verified 2026-03-08)
    let cards = Array.from(searchRoot.querySelectorAll('div.yR1fYc'));

    // Strategy 2: structural heuristic — find divs at ~74px height with price + times
    if (cards.length === 0) {
      const allDivs = Array.from(searchRoot.querySelectorAll('div'));
      const candidates = allDivs.filter(el => {
        const h = el.offsetHeight;
        if (h < 60 || h > 200 || el.children.length < 3) return false;
        const text = el.textContent;
        return /\$[\d,]+/.test(text) &&
               /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text) &&
               /(nonstop|\d+\s+stop|\d+\s*hr\s*\d+\s*min)/i.test(text);
      });
      // Keep most-specific (leaf candidates — not containing another candidate)
      cards = candidates.filter(el =>
        !candidates.some(other => other !== el && other.contains(el))
      );
    }

    // Only include visible cards (exclude hidden/cached cards from SPA navigation)
    cards = cards.filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);

    if (cards.length === 0) {
      return { content: [{ type: 'text', text: 'No flight results found. The page may still be loading, or no flights match your search criteria. Try waiting a moment and calling get_results again.' }] };
    }

    const results = cards.map((card, i) => WebMCPHelpers.parseGoogleFlightCard(card, i + 1));

    const summary = results.map(r =>
      `${r.rank}. ${r.airline || 'Unknown'} — ${r.departure || '?'} → ${r.arrival || '?'} (${r.duration || '?'}, ${r.stops || '?'}) — ${r.price || '?'}`
    ).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} flight result(s):\n\n${summary}`
      }]
    };
  }
};
