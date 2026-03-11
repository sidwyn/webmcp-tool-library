// content/tools/google-flights/getTrackedFlights.js

const GetTrackedFlightsTool = {
  name: 'get_tracked_flights',
  description: 'View all your tracked/saved flight price alerts. Navigates to the Google Flights saved page and reads your tracked flights with current prices and price history. If already on the saved page, reads the tracked flights list.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'integer',
        description: 'Maximum number of tracked flights to return. Defaults to 10.'
      }
    }
  },

  execute: async (args) => {
    const { maxResults = 10 } = args;
    const currentUrl = window.location.href;
    const isOnSavedPage = currentUrl.includes('/travel/flights/saved') || currentUrl.includes('/travel/flights/saves');

    if (!isOnSavedPage) {
      setTimeout(() => { window.location.href = 'https://www.google.com/travel/flights/saved'; }, 50);
      return {
        content: [{
          type: 'text',
          text: 'Navigating to your tracked flights page. Wait for the page to load, then call get_tracked_flights again to read results.'
        }]
      };
    }

    // Already on the saved page — wait for content to load
    await WebMCPHelpers.sleep(2000);

    const startTime = Date.now();
    let trackedFlights = [];

    while (Date.now() - startTime < 12000) {
      trackedFlights = parseTrackedFlights();
      if (trackedFlights.length > 0) break;
      await WebMCPHelpers.sleep(1000);
    }

    if (trackedFlights.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No tracked flights found. You may not have any price alerts set up, or the page is still loading. Try calling get_tracked_flights again.'
        }]
      };
    }

    const limited = trackedFlights.slice(0, maxResults);
    const summary = limited.map((f, i) => {
      let line = `${i + 1}. ${f.route}`;
      if (f.price) line += ` — ${f.price}`;
      if (f.priceChange) line += ` (${f.priceChange})`;
      if (f.dates) line += ` — ${f.dates}`;
      if (f.details) line += ` — ${f.details}`;
      return line;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${limited.length} tracked flight(s):\n\n${summary}`
      }]
    };
  }
};

function parseTrackedFlights() {
  const results = [];

  // Strategy 1: Find tracked flight cards — they typically contain route info and prices
  // Look for links to flight searches that contain price info
  const links = Array.from(document.querySelectorAll('a[href*="/travel/flights"]'));

  for (const link of links) {
    const text = link.textContent;
    if (!text || text.length < 5) continue;

    // Must have a price
    const priceMatch = text.match(/\$[\d,]+/);
    if (!priceMatch) continue;

    // Extract route: look for "City → City" or "CODE – CODE" patterns
    const routeMatch = text.match(/([A-Z]{3})\s*(?:→|–|—|-|to)\s*([A-Z]{3})/i) ||
                       text.match(/([A-Za-z\s]+)\s*(?:→|–|—|-)\s*([A-Za-z\s]+?)(?:\$|\d)/);
    let route = routeMatch ? `${routeMatch[1].trim()} → ${routeMatch[2].trim()}` : null;

    // Fallback: look for heading elements
    if (!route) {
      const heading = link.querySelector('h2, h3, h4, [role="heading"]');
      if (heading) route = heading.textContent.trim();
    }

    // Fallback: first line of text
    if (!route) {
      const lines = text.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('$') && !/^\d/.test(line) && line.length > 3 && line.length < 60) {
          route = line;
          break;
        }
      }
    }

    if (!route) continue;

    // Price change: look for "down $X" or "up $X" or percentage patterns
    const changeMatch = text.match(/(down|up|dropped|increased)\s*\$?[\d,]+/i) ||
                        text.match(/[-+]\s*\$[\d,]+/) ||
                        text.match(/(Price\s+(?:dropped|went up|decreased|increased)[^.]*)/i);
    const priceChange = changeMatch ? changeMatch[0].trim() : null;

    // Dates
    const dateMatch = text.match(
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*[\u2013\u2014–-]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?\d{1,2}/i
    );
    const dates = dateMatch ? dateMatch[0] : null;

    // Additional details: stops, duration
    const stopsMatch = text.match(/nonstop|\d+\s+stop(?:s)?/i);
    const durationMatch = text.match(/\d+\s*h(?:r)?\s*\d*\s*m(?:in)?/i);
    const details = [stopsMatch?.[0], durationMatch?.[0]].filter(Boolean).join(', ') || null;

    results.push({
      route,
      price: priceMatch[0],
      priceChange,
      dates,
      details
    });
  }

  // Strategy 2: Fallback — look for any card-like containers with tracked flight info
  if (results.length === 0) {
    const allElements = Array.from(document.querySelectorAll('[data-ved], [jsaction]'));
    const seen = new Set();

    for (const el of allElements) {
      const text = el.textContent;
      if (!text || text.length < 10 || text.length > 600) continue;

      const priceMatch = text.match(/\$[\d,]+/);
      if (!priceMatch) continue;

      // Skip if it looks like a regular flight result (has specific departure times)
      if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(text)) continue;

      const lines = text.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
      const route = lines[0] && lines[0].length < 60 ? lines[0] : null;
      if (!route || seen.has(route)) continue;
      seen.add(route);

      results.push({
        route,
        price: priceMatch[0],
        priceChange: null,
        dates: null,
        details: null
      });
    }
  }

  return results;
}
