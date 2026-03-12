// content/tools/google-flights/getBookingLink.js

const GetBookingLinkTool = {
  name: 'get_booking_link',
  description: 'Get booking options and prices for a flight, or click "Continue" to book. On the BOOKING PAGE (after selecting both departing and return flights), reads fare options (Basic Economy, Economy, etc.) with prices. Pass a fareRank to click the "Continue" button for that fare — this opens the airline\'s booking site. On the RESULTS PAGE, expands a flight card to show the "Select flight" button.',
  inputSchema: {
    type: 'object',
    properties: {
      rank: {
        type: 'integer',
        description: '1-based rank of the flight result to get booking info for (only used on results page)'
      },
      fareRank: {
        type: 'integer',
        description: 'On the booking page: click the "Continue" button for this fare option (1-based). Call without fareRank first to see available fares, then call again with fareRank to book.'
      }
    }
  },

  execute: async (args) => {
    const { rank, fareRank } = args;
    const url = window.location.href;
    const { simulateClick, sleep, findByText } = WebMCPHelpers;

    // ── BOOKING PAGE: /travel/flights/booking ──────────────────────────────
    if (url.includes('/travel/flights/booking')) {
      await sleep(1000);

      // Expand "more booking options" if present
      const moreBtn = findByText('more booking options', 'button') ||
                      findByText('more booking options');
      if (moreBtn) {
        simulateClick(moreBtn);
        await sleep(1000);
      }

      // Parse fare options — each fare card contains a title (Basic Economy, Economy, etc.),
      // a price, features, and a "Continue" button.
      // Strategy: find all "Continue" buttons on the booking page and work backward to find
      // each fare card's details.
      const continueButtons = Array.from(document.querySelectorAll('button, a'))
        .filter(el => {
          const text = el.textContent.trim();
          return /^Continue$/i.test(text) && el.offsetHeight > 0 && el.offsetWidth > 0;
        });

      const fareOptions = [];
      for (const btn of continueButtons) {
        // Walk up to find the fare card container
        let card = btn.parentElement;
        for (let i = 0; i < 10 && card; i++) {
          const text = card.textContent || '';
          // A fare card has a price and a fare class name
          if (/\$[\d,]+/.test(text) && text.length > 30 && text.length < 2000) break;
          card = card.parentElement;
        }
        if (!card) continue;

        const cardText = card.textContent;
        const priceMatch = cardText.match(/\$[\d,]+/);
        const price = priceMatch ? priceMatch[0] : null;

        // Extract fare class name (e.g. "Basic Economy", "Economy", "Economy Plus")
        // It's usually a heading or prominent text at the top of the card
        const headings = Array.from(card.querySelectorAll('h1, h2, h3, h4, [role="heading"], strong, b'));
        let fareName = null;
        for (const h of headings) {
          const t = h.textContent.trim();
          if (t.length > 3 && t.length < 50 && !/\$/.test(t) && !/continue/i.test(t)) {
            fareName = t;
            break;
          }
        }
        // Fallback: look for known fare class names in the card text
        if (!fareName) {
          const fareMatch = cardText.match(/(Basic Economy|Economy Plus|Premium Economy|Economy|Business|First Class|Main Cabin|Comfort Plus)/i);
          fareName = fareMatch ? fareMatch[1] : 'Fare option';
        }

        // Extract key features (items with checkmarks)
        const features = [];
        const listItems = Array.from(card.querySelectorAll('li, [role="listitem"]'));
        for (const li of listItems) {
          const t = li.textContent.trim();
          if (t.length > 3 && t.length < 100) features.push(t);
        }

        fareOptions.push({ fareName, price, features, continueBtn: btn });
      }

      // Also find the airline name from "Book with X" header
      let airline = null;
      const bookWithEl = Array.from(document.querySelectorAll('*'))
        .find(el => /^Book with /i.test(el.textContent.trim()) && el.children.length < 5 && el.offsetHeight > 0);
      if (bookWithEl) {
        const m = bookWithEl.textContent.trim().match(/^Book with (.+?)(?:\s*Airline)?$/i);
        if (m) airline = m[1].trim();
      }

      if (fareOptions.length === 0) {
        return { content: [{ type: 'text', text: 'On the booking page but could not find fare options. The page may still be loading.' }] };
      }

      // If fareRank is provided, click the Continue button for that fare
      if (fareRank) {
        if (fareRank < 1 || fareRank > fareOptions.length) {
          return {
            content: [{
              type: 'text',
              text: `Invalid fareRank ${fareRank}. There are ${fareOptions.length} fare options (1-${fareOptions.length}).`
            }]
          };
        }
        const chosen = fareOptions[fareRank - 1];
        simulateClick(chosen.continueBtn);
        await sleep(1000);
        return {
          content: [{
            type: 'text',
            text: `Clicked "Continue" for ${chosen.fareName} (${chosen.price || 'price N/A'})${airline ? ' with ' + airline : ''}. The airline's booking page should now be opening.`
          }]
        };
      }

      // List fare options
      const header = airline ? `Book with ${airline}\n\n` : '';
      const summary = fareOptions.map((f, i) => {
        let line = `${i + 1}. **${f.fareName}** — ${f.price || 'N/A'}`;
        if (f.features.length > 0) {
          line += '\n     ' + f.features.slice(0, 4).join(', ');
        }
        return line;
      }).join('\n');

      return {
        content: [{
          type: 'text',
          text: `${header}Fare options:\n\n${summary}\n\nCall get_booking_link with fareRank to click "Continue" and open the airline's booking site.`
        }]
      };
    }

    // ── RESULTS PAGE: expand card to show Select flight ────────────────────
    if (!url.includes('google.com/travel/flights') ||
        (!url.includes('q=') && !url.includes('tfs='))) {
      return { content: [{ type: 'text', text: 'ERROR: Not on a Google Flights page. Search for flights first.' }] };
    }

    if (!rank) {
      return { content: [{ type: 'text', text: 'ERROR: Provide a rank number. On the results page, booking options are only available after selecting both departing and return flights. Use select_return_flight to complete the selection first.' }] };
    }

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

    // Look for "Select flight" button in the expanded area
    const selectBtn = findByText('Select flight', 'button');
    const hasSelectBtn = selectBtn && selectBtn.offsetHeight > 0;

    // Collapse the card
    if (expandButton) {
      simulateClick(expandButton);
      await sleep(300);
    }

    if (hasSelectBtn) {
      return {
        content: [{
          type: 'text',
          text: `Flight #${rank} is ready to select. On Google Flights, booking options (airlines and OTAs with prices) appear on the BOOKING PAGE after selecting both departing and return flights.\n\nNext steps:\n1. Call select_return_flight to select this departing flight and choose a return\n2. After both flights are selected, Google Flights will show the booking page\n3. Then call get_booking_link (without rank) to read the booking options`
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Could not find a "Select flight" button for flight #${rank}. Make sure you're on a results page with flight listings.`
      }]
    };
  }
};
