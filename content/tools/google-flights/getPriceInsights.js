// content/tools/google-flights/getPriceInsights.js

const GetPriceInsightsTool = {
  name: 'get_price_insights',
  description: 'Read price insights for the current Google Flights search: whether prices are high/low/typical, the usual price range for this route, and a booking timing recommendation. Call this after get_results to give the user advice on when to buy.',
  inputSchema: {
    type: 'object',
    properties: {}
  },

  execute: async () => {
    if (!window.location.href.includes('google.com/travel/flights') ||
        (!window.location.search.includes('q=') && !window.location.search.includes('tfs='))) {
      return { content: [{ type: 'text', text: 'ERROR: Not on a Google Flights results page. Search for flights first.' }] };
    }

    await WebMCPHelpers.sleep(500);

    const insights = {};

    // 1. Price level: "Prices are currently high/low/typical for your search"
    const allText = document.body.innerText;
    const levelMatch = allText.match(/prices are currently (high|low|typical)/i);
    if (levelMatch) insights.level = levelMatch[1].toLowerCase();

    // 2. Usual price range: "usually cost between $X–$Y"
    const rangeMatch = allText.match(/usually\s+cost\s+between\s+(\$[\d,]+)[–\-](\$[\d,]+)/i);
    if (rangeMatch) {
      insights.typicalMin = rangeMatch[1];
      insights.typicalMax = rangeMatch[2];
    }

    // 3. Current price note: "$X,XXX is high" or similar
    const currentNoteMatch = allText.match(/(\$[\d,]+)\s+is\s+(high|low|typical)/i);
    if (currentNoteMatch) {
      insights.currentPrice = currentNoteMatch[1];
      insights.currentNote = currentNoteMatch[2].toLowerCase();
    }

    // 4. Try to read Date Grid for cheapest dates
    let dateGridInfo = null;
    const dateGridBtn = WebMCPHelpers.findByText('Date grid') ||
                        WebMCPHelpers.findByAriaLabel('Date grid');
    if (dateGridBtn) {
      WebMCPHelpers.simulateClick(dateGridBtn);
      await WebMCPHelpers.sleep(1500);

      // Read the grid: look for cells with prices
      const cells = Array.from(document.querySelectorAll('[role="gridcell"], td'))
        .filter(el => /\$[\d,]+/.test(el.textContent));

      if (cells.length > 0) {
        // Find cheapest cell
        const parsed = cells.map(el => {
          const priceMatch = el.textContent.match(/\$[\d,]+/);
          const price = priceMatch ? parseInt(priceMatch[0].replace(/[$,]/g, ''), 10) : Infinity;
          // Try to get date context from nearby elements
          const ariaLabel = el.getAttribute('aria-label') || el.textContent.trim();
          return { price, label: ariaLabel };
        }).filter(c => c.price < Infinity);

        if (parsed.length > 0) {
          parsed.sort((a, b) => a.price - b.price);
          const cheapest = parsed[0];
          dateGridInfo = `Cheapest date found: $${cheapest.price.toLocaleString()} (${cheapest.label})`;
        }
      }

      // Switch back to list view
      const listBtn = WebMCPHelpers.findByText('List') ||
                      WebMCPHelpers.findByAriaLabel('List view');
      if (listBtn) {
        WebMCPHelpers.simulateClick(listBtn);
        await WebMCPHelpers.sleep(500);
      }
    }

    // 5. Build recommendation
    let recommendation = '';
    if (insights.level === 'low') {
      recommendation = 'Prices are LOW — this is a great time to book!';
    } else if (insights.level === 'high') {
      const range = insights.typicalMin && insights.typicalMax
        ? ` (typical: ${insights.typicalMin}–${insights.typicalMax})`
        : '';
      recommendation = `Prices are HIGH${range}. Consider trying different dates, a nearby airport, or waiting if your travel dates are flexible. Use the Date grid to find cheaper dates.`;
    } else if (insights.level === 'typical') {
      recommendation = 'Prices are at typical levels — neither a great deal nor unusually expensive. Book if the timing works for you.';
    } else {
      recommendation = 'No price level indicator found — prices may not have loaded yet, or this route has limited data.';
    }

    const lines = [
      insights.level ? `Price level: ${insights.level.toUpperCase()}` : null,
      insights.currentPrice ? `Current lowest price: ${insights.currentPrice} (${insights.currentNote})` : null,
      insights.typicalMin ? `Typical price range: ${insights.typicalMin}–${insights.typicalMax}` : null,
      dateGridInfo,
      `\nAdvice: ${recommendation}`,
    ].filter(Boolean);

    return {
      content: [{
        type: 'text',
        text: lines.join('\n')
      }]
    };
  }
};
