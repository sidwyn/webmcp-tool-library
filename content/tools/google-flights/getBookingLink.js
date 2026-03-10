// content/tools/google-flights/getBookingLink.js

const GetBookingLinkTool = {
  name: 'get_booking_link',
  description: 'Get the booking link(s) for a specific flight result. Expands the flight card to find "Book on [airline]" links with prices from different booking sources (airline website, third-party sites like Expedia, Priceline, etc.).',
  inputSchema: {
    type: 'object',
    properties: {
      rank: {
        type: 'integer',
        description: '1-based rank of the flight result to get booking links for (from get_results)'
      }
    },
    required: ['rank']
  },

  execute: async (args) => {
    const { rank } = args;

    if (!window.location.href.includes('google.com/travel/flights') ||
        (!window.location.search.includes('q=') && !window.location.search.includes('tfs='))) {
      return { content: [{ type: 'text', text: 'ERROR: Not on a Google Flights results page. Search for flights first.' }] };
    }

    const { simulateClick, sleep } = WebMCPHelpers;

    // Find flight cards
    let cards = Array.from(document.querySelectorAll('div.yR1fYc'));
    if (cards.length === 0) {
      const allDivs = Array.from(document.querySelectorAll('div'));
      cards = allDivs.filter(el => {
        const h = el.offsetHeight;
        if (h < 60 || h > 200 || el.children.length < 3) return false;
        const text = el.textContent;
        return /\$[\d,]+/.test(text) && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text);
      }).filter((el, _, arr) => !arr.some(o => o !== el && o.contains(el)));
    }

    if (cards.length === 0) {
      return { content: [{ type: 'text', text: 'No flight results found on the page.' }] };
    }

    if (rank < 1 || rank > cards.length) {
      return { content: [{ type: 'text', text: `Invalid rank ${rank}. There are ${cards.length} results (1-${cards.length}).` }] };
    }

    const card = cards[rank - 1];

    // Click to expand the flight card
    const buttonsInCard = Array.from(card.querySelectorAll('button'));
    let expandButton = buttonsInCard.find(btn => {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      return label.includes('detail') || label.includes('flight detail');
    });
    if (!expandButton && buttonsInCard.length > 0) {
      expandButton = buttonsInCard[buttonsInCard.length - 1];
    }

    if (expandButton) {
      simulateClick(expandButton);
      await sleep(1500);
    }

    // Look for booking links — they contain "Book on" or "Book with" text
    // and link to airline/OTA booking pages
    const bookingLinks = [];

    // Search in the expanded area (near the card)
    const searchContainers = [
      card.nextElementSibling,
      card.parentElement,
      card.parentElement?.parentElement,
      card.parentElement?.parentElement?.parentElement
    ].filter(Boolean);

    for (const container of searchContainers) {
      // Look for links with booking-related text
      const links = Array.from(container.querySelectorAll('a[href]'));
      for (const link of links) {
        const text = link.textContent.trim();
        const href = link.href;

        // Match "Book on [airline]" or "Book with [OTA]" links
        if (/book\s+(on|with)/i.test(text) || /select\s+flight/i.test(text)) {
          const priceMatch = text.match(/\$[\d,]+/);
          const sourceName = text.replace(/\$[\d,]+/g, '').replace(/book\s+(on|with)\s*/i, '').trim();
          bookingLinks.push({
            source: sourceName || 'Unknown',
            price: priceMatch ? priceMatch[0] : null,
            url: href
          });
        }
      }

      // Also look for buttons that lead to booking
      const buttons = Array.from(container.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        if (/book\s+(on|with)/i.test(text) || /select\s+flight/i.test(text)) {
          const priceMatch = text.match(/\$[\d,]+/);
          const sourceName = text.replace(/\$[\d,]+/g, '').replace(/book\s+(on|with)\s*/i, '').trim();
          bookingLinks.push({
            source: sourceName || 'Unknown',
            price: priceMatch ? priceMatch[0] : null,
            url: null  // Button-based booking (no direct URL)
          });
        }
      }

      if (bookingLinks.length > 0) break;
    }

    // Fallback: look for any "Select flight" or booking-like button on page
    if (bookingLinks.length === 0) {
      // Google Flights sometimes shows a "Select flight" button that leads to booking options
      const allLinks = Array.from(document.querySelectorAll('a[href*="book"], a[href*="airline"], a[href*="flights"]'));
      for (const link of allLinks) {
        const text = link.textContent.trim();
        if (text.length < 3 || text.length > 100) continue;
        if (/book|select|continue/i.test(text)) {
          const priceMatch = text.match(/\$[\d,]+/);
          bookingLinks.push({
            source: text.replace(/\$[\d,]+/g, '').trim(),
            price: priceMatch ? priceMatch[0] : null,
            url: link.href
          });
        }
      }
    }

    // Collapse the card
    if (expandButton) {
      simulateClick(expandButton);
      await sleep(300);
    }

    if (bookingLinks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No booking links found for flight #${rank}. On Google Flights, you typically need to select a flight and then choose a booking option on the next page. Try clicking the flight directly on the page to proceed to booking.`
        }]
      };
    }

    // Deduplicate by source name
    const seen = new Set();
    const unique = bookingLinks.filter(b => {
      const key = b.source.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const summary = unique.map((b, i) => {
      let line = `${i + 1}. ${b.source}`;
      if (b.price) line += ` — ${b.price}`;
      if (b.url) line += `\n   Link: ${b.url}`;
      return line;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Booking options for flight #${rank}:\n\n${summary}`
      }]
    };
  }
};
