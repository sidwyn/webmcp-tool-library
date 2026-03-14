// content/sites/target/tools/setFilters.js

const SetFiltersTool = {
  name: 'set_filters',
  description: 'Apply filters to Target search results. Supports price range, brand, rating, shipping options, and sale items. Only works on a Target search or category page.',
  inputSchema: {
    type: 'object',
    properties: {
      priceMin: {
        type: 'number',
        description: 'Minimum price in dollars (e.g., 10)'
      },
      priceMax: {
        type: 'number',
        description: 'Maximum price in dollars (e.g., 50)'
      },
      brand: {
        type: 'string',
        description: 'Brand name to filter by (e.g., "Apple", "Nike"). Clicks the matching brand checkbox in the filter sidebar.'
      },
      minRating: {
        type: 'integer',
        description: 'Minimum guest rating (1-5). Filters to products with at least this many stars.'
      },
      freeShipping: {
        type: 'boolean',
        description: 'Filter to items eligible for free shipping'
      },
      storePickup: {
        type: 'boolean',
        description: 'Filter to items available for in-store or drive-up pickup'
      },
      onSale: {
        type: 'boolean',
        description: 'Filter to items currently on sale or clearance'
      }
    }
  },

  execute: async (args) => {
    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    const actions = [];

    // Helper: expand a filter section by clicking its header
    async function expandFilterSection(sectionName) {
      const headings = Array.from(document.querySelectorAll('button, h3, h4, [role="button"]'));
      for (const el of headings) {
        const text = el.textContent.trim().toLowerCase();
        if (text === sectionName.toLowerCase() || text.includes(sectionName.toLowerCase())) {
          const isExpanded = el.getAttribute('aria-expanded');
          if (isExpanded === 'false') {
            WebMCPHelpers.simulateClick(el);
            await WebMCPHelpers.sleep(300);
          }
          return true;
        }
      }
      return false;
    }

    // Helper: click a checkbox/link filter option by text
    async function clickFilterOption(text) {
      const option = WebMCPHelpers.findByText(text, 'a') ||
                     WebMCPHelpers.findByText(text, 'label') ||
                     WebMCPHelpers.findByText(text, 'button') ||
                     WebMCPHelpers.findByText(text, 'input') ||
                     WebMCPHelpers.findByAriaLabel(text);
      if (option) {
        WebMCPHelpers.simulateClick(option);
        await WebMCPHelpers.sleep(500);
        return true;
      }
      return false;
    }

    // ── Price range ───────────────────────────────────────────────────────────
    if (args.priceMin !== undefined || args.priceMax !== undefined) {
      await expandFilterSection('Price');
      await WebMCPHelpers.sleep(200);

      // Target uses price range links like "$0 - $15", "$15 - $25", etc.
      // or min/max input fields
      const minInput = document.querySelector('input[data-test="filter-price-min"]') ||
                       document.querySelector('input[aria-label*="minimum" i]') ||
                       document.querySelector('input[placeholder*="Min" i]');
      const maxInput = document.querySelector('input[data-test="filter-price-max"]') ||
                       document.querySelector('input[aria-label*="maximum" i]') ||
                       document.querySelector('input[placeholder*="Max" i]');

      if (minInput && args.priceMin !== undefined) {
        minInput.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (nativeSetter?.set) nativeSetter.set.call(minInput, String(args.priceMin));
        else minInput.value = String(args.priceMin);
        minInput.dispatchEvent(new Event('input', { bubbles: true }));
        minInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (maxInput && args.priceMax !== undefined) {
        maxInput.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (nativeSetter?.set) nativeSetter.set.call(maxInput, String(args.priceMax));
        else maxInput.value = String(args.priceMax);
        maxInput.dispatchEvent(new Event('input', { bubbles: true }));
        maxInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Try clicking an apply/go button for the price range
      if (minInput || maxInput) {
        await WebMCPHelpers.sleep(200);
        const applyBtn = WebMCPHelpers.findByText('Apply', 'button') ||
                         WebMCPHelpers.findByText('Go', 'button') ||
                         WebMCPHelpers.findByAriaLabel('apply price filter');
        if (applyBtn) {
          WebMCPHelpers.simulateClick(applyBtn);
          await WebMCPHelpers.sleep(500);
        }
        actions.push(`Set price range: $${args.priceMin || 0} – $${args.priceMax || '∞'}`);
      } else {
        // Fallback: try clicking a predefined price range link
        if (args.priceMax) {
          const rangeLabels = ['$0 – $15', '$15 – $25', '$25 – $50', '$50 – $100', '$100 – $200', '$200 – $500'];
          for (const label of rangeLabels) {
            const upperMatch = label.match(/\$(\d+)$/);
            if (upperMatch && parseInt(upperMatch[1], 10) >= args.priceMax) {
              if (await clickFilterOption(label.replace('–', '-'))) {
                actions.push(`Set price range: ${label}`);
                break;
              }
            }
          }
        }
        if (actions.length === 0) {
          actions.push('WARNING: Could not find price filter inputs');
        }
      }
    }

    // ── Brand ─────────────────────────────────────────────────────────────────
    if (args.brand) {
      await expandFilterSection('Brand');
      await WebMCPHelpers.sleep(200);

      const clicked = await clickFilterOption(args.brand);
      actions.push(clicked
        ? `Filtered to brand: ${args.brand}`
        : `WARNING: Could not find brand "${args.brand}" in filters`);
    }

    // ── Rating ────────────────────────────────────────────────────────────────
    if (args.minRating) {
      await expandFilterSection('Guest Rating');
      await WebMCPHelpers.sleep(200);

      // Target shows rating options like "4 stars & up", "3 stars & up"
      const ratingLabels = [`${args.minRating} stars & up`, `${args.minRating} & up`, `${args.minRating}+`];
      let clicked = false;
      for (const label of ratingLabels) {
        if (await clickFilterOption(label)) {
          clicked = true;
          break;
        }
      }
      // Fallback: look for star rating links by aria-label
      if (!clicked) {
        const ratingLink = WebMCPHelpers.findByAriaLabel(`${args.minRating} stars and up`) ||
                           WebMCPHelpers.findByAriaLabel(`${args.minRating} out of 5`);
        if (ratingLink) {
          WebMCPHelpers.simulateClick(ratingLink);
          await WebMCPHelpers.sleep(500);
          clicked = true;
        }
      }
      actions.push(clicked
        ? `Filtered to ${args.minRating}+ stars`
        : `WARNING: Could not set rating filter to ${args.minRating}+ stars`);
    }

    // ── Shipping / Pickup ─────────────────────────────────────────────────────
    if (args.freeShipping) {
      await expandFilterSection('Shipping');
      await WebMCPHelpers.sleep(200);
      const clicked = await clickFilterOption('Free shipping') ||
                      await clickFilterOption('Ships free');
      actions.push(clicked ? 'Filtered to free shipping' : 'WARNING: Could not set free shipping filter');
    }

    if (args.storePickup) {
      await expandFilterSection('Fulfillment');
      await WebMCPHelpers.sleep(200);
      const clicked = await clickFilterOption('Store Pickup') ||
                      await clickFilterOption('Order Pickup') ||
                      await clickFilterOption('Drive Up') ||
                      await clickFilterOption('Pick up');
      actions.push(clicked ? 'Filtered to store pickup' : 'WARNING: Could not set store pickup filter');
    }

    // ── On sale ───────────────────────────────────────────────────────────────
    if (args.onSale) {
      await expandFilterSection('Deal');
      await WebMCPHelpers.sleep(200);
      const clicked = await clickFilterOption('Sale') ||
                      await clickFilterOption('Clearance') ||
                      await clickFilterOption('On sale');
      actions.push(clicked ? 'Filtered to sale items' : 'WARNING: Could not set sale filter');
    }

    if (actions.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No filters specified. Available: priceMin, priceMax, brand, minRating, freeShipping, storePickup, onSale.'
        }]
      };
    }

    await WebMCPHelpers.sleep(500);

    return {
      content: [{
        type: 'text',
        text: `Filters applied:\n${actions.join('\n')}\n\nCall get_search_results to see the updated product list.`
      }]
    };
  }
};
