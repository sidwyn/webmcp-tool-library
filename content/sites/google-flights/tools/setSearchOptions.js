// content/tools/google-flights/setSearchOptions.js

const SetSearchOptionsTool = {
  name: 'set_search_options',
  description: 'Configure flight search options: trip type (round trip/one way/multi city), cabin class, and number of passengers (adults, children, infants). Call search_flights again after changing these to apply the new options.',
  inputSchema: {
    type: 'object',
    properties: {
      tripType: {
        type: 'string',
        enum: ['round_trip', 'one_way', 'multi_city'],
        description: 'Trip type'
      },
      cabinClass: {
        type: 'string',
        enum: ['economy', 'premium_economy', 'business', 'first'],
        description: 'Cabin class'
      },
      adults: {
        type: 'integer',
        description: 'Number of adults (18+). Minimum 1.'
      },
      children: {
        type: 'integer',
        description: 'Number of children aged 2–11'
      },
      infantsInSeat: {
        type: 'integer',
        description: 'Number of infants (under 2) in their own seat'
      },
      infantsOnLap: {
        type: 'integer',
        description: 'Number of infants (under 2) on lap'
      }
    }
  },

  execute: async (args) => {
    if (!window.location.href.includes('google.com/travel/flights')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Google Flights.' }] };
    }

    const actions = [];

    // ── Helper: click a dropdown button, wait, then select an option ──────────
    async function selectFromDropdown(buttonLabels, optionLabel) {
      let opened = false;
      for (const label of buttonLabels) {
        const btn = WebMCPHelpers.findByText(label, 'button') ||
                    WebMCPHelpers.findByAriaLabel(label);
        if (btn) {
          WebMCPHelpers.simulateClick(btn);
          await WebMCPHelpers.sleep(400);
          opened = true;
          break;
        }
      }
      if (!opened) return false;

      for (const label of Array.isArray(optionLabel) ? optionLabel : [optionLabel]) {
        const opt = WebMCPHelpers.findByText(label, '[role="option"]') ||
                    WebMCPHelpers.findByText(label, 'li') ||
                    WebMCPHelpers.findByText(label, '[role="menuitem"]') ||
                    WebMCPHelpers.findByText(label, 'label');
        if (opt) {
          WebMCPHelpers.simulateClick(opt);
          await WebMCPHelpers.sleep(300);
          return true;
        }
      }

      // Close dropdown if option not found
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await WebMCPHelpers.sleep(200);
      return false;
    }

    // ── Trip type ─────────────────────────────────────────────────────────────
    if (args.tripType) {
      const tripButtonLabels = ['Round trip', 'One way', 'Multi-city'];
      const tripOptionMap = {
        round_trip: ['Round trip'],
        one_way: ['One way', 'One-way'],
        multi_city: ['Multi-city', 'Multicity']
      };
      const ok = await selectFromDropdown(tripButtonLabels, tripOptionMap[args.tripType]);
      actions.push(ok
        ? `Set trip type: ${args.tripType.replace(/_/g, ' ')}`
        : `WARNING: Could not set trip type to ${args.tripType}`);
    }

    // ── Cabin class ───────────────────────────────────────────────────────────
    if (args.cabinClass) {
      const cabinButtonLabels = ['Economy', 'Economy (including Basic)', 'Premium economy', 'Business', 'First'];
      const cabinOptionMap = {
        economy: ['Economy', 'Economy (including Basic)', 'Main cabin'],
        premium_economy: ['Premium economy', 'Premium Economy'],
        business: ['Business'],
        first: ['First', 'First class']
      };
      const ok = await selectFromDropdown(cabinButtonLabels, cabinOptionMap[args.cabinClass]);
      actions.push(ok
        ? `Set cabin class: ${args.cabinClass.replace(/_/g, ' ')}`
        : `WARNING: Could not set cabin class to ${args.cabinClass}`);
    }

    // ── Passengers ────────────────────────────────────────────────────────────
    const passengerFields = ['adults', 'children', 'infantsInSeat', 'infantsOnLap'];
    const hasPassengerChange = passengerFields.some(f => args[f] !== undefined);

    if (hasPassengerChange) {
      // Open the passenger picker — button shows current count like "1"
      const passBtn = WebMCPHelpers.findByAriaLabel('Passengers') ||
                      document.querySelector('[aria-label*="assenger" i][role="button"], [aria-label*="assenger" i]') ||
                      // Last resort: find a standalone digit button in the search bar area
                      Array.from(document.querySelectorAll('button, [role="button"]')).find(b => {
                        const t = b.textContent.trim();
                        return /^\d+$/.test(t) && parseInt(t, 10) < 10;
                      });

      if (passBtn) {
        WebMCPHelpers.simulateClick(passBtn);
        await WebMCPHelpers.sleep(500);

        // Map each passenger type to label text used by Google Flights
        const passengerLabelMap = {
          adults:         ['Adults', 'Adult', 'Adults (18+)'],
          children:       ['Children', 'Child', 'Children (2–11)', 'Children (aged 2–11)'],
          infantsInSeat:  ['Infants in seat', 'Infant in seat', 'Infant (in seat)'],
          infantsOnLap:   ['Infants on lap',  'Infant on lap',  'Infant (on lap)']
        };

        for (const [field, labels] of Object.entries(passengerLabelMap)) {
          const targetCount = args[field];
          if (targetCount === undefined) continue;

          // Find the section container for this passenger type
          let sectionEl = null;
          for (const label of labels) {
            sectionEl = WebMCPHelpers.findByText(label) || WebMCPHelpers.findByAriaLabel(label);
            if (sectionEl) break;
          }
          if (!sectionEl) continue;

          // Walk up to find the row/container holding the counter
          const container = sectionEl.closest('[jsname], [data-flt-ve], [role="listitem"]') ||
                            sectionEl.closest('div[class]') ||
                            sectionEl.parentElement?.parentElement;
          if (!container) continue;

          // Find current count (a single digit between +/- buttons)
          const countEl = Array.from(container.querySelectorAll('*')).find(el =>
            el.children.length === 0 && /^\d+$/.test(el.textContent.trim())
          );
          const currentCount = countEl ? parseInt(countEl.textContent.trim(), 10) : (field === 'adults' ? 1 : 0);
          const diff = targetCount - currentCount;
          if (diff === 0) continue;

          // Find + / - buttons
          const btns = Array.from(container.querySelectorAll('button'));
          const minusBtn = btns.find(b =>
            b.textContent.trim() === '–' || b.textContent.trim() === '-' ||
            /decrease|remove/i.test(b.getAttribute('aria-label') || '')
          );
          const plusBtn = btns.find(b =>
            b.textContent.trim() === '+' ||
            /increase|add/i.test(b.getAttribute('aria-label') || '')
          );

          const clickBtn = diff > 0 ? plusBtn : minusBtn;
          if (!clickBtn) continue;

          for (let i = 0; i < Math.abs(diff); i++) {
            WebMCPHelpers.simulateClick(clickBtn);
            await WebMCPHelpers.sleep(120);
          }
          actions.push(`Set ${field}: ${targetCount}`);
        }

        // Confirm / close the dialog
        await WebMCPHelpers.sleep(200);
        const doneBtn = WebMCPHelpers.findByText('Done', 'button') ||
                        WebMCPHelpers.findByAriaLabel('Done');
        if (doneBtn) {
          WebMCPHelpers.simulateClick(doneBtn);
          await WebMCPHelpers.sleep(300);
        }
      } else {
        actions.push('WARNING: Could not find the passengers button');
      }
    }

    if (actions.length === 0) {
      return { content: [{ type: 'text', text: 'No options specified. Provide tripType, cabinClass, or passenger counts.' }] };
    }

    return {
      content: [{
        type: 'text',
        text: `Search options updated:\n${actions.join('\n')}\n\nCall search_flights to search with the new settings.`
      }]
    };
  }
};
