// content/sites/target/tools/checkStoreAvailability.js

const CheckStoreAvailabilityTool = {
  name: 'check_store_availability',
  description: 'Check if a product is available for in-store pickup, same-day delivery (Drive Up), or standard shipping at Target. Must be on a product detail page.',
  inputSchema: {
    type: 'object',
    properties: {
      zipCode: {
        type: 'string',
        description: 'ZIP code to check availability for (e.g., "94107"). If omitted, uses the currently set store location.'
      }
    }
  },

  execute: async (args) => {
    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    // Update store location if ZIP code provided
    if (args.zipCode) {
      const storeBtn = document.querySelector('[data-test="store-name-link"]') ||
                       document.querySelector('[data-test="fulfillment-store-link"]') ||
                       WebMCPHelpers.findByText('Change store', 'button') ||
                       WebMCPHelpers.findByAriaLabel('change store');
      if (storeBtn) {
        WebMCPHelpers.simulateClick(storeBtn);
        await WebMCPHelpers.sleep(500);

        const zipInput = document.querySelector('input[data-test="zip-input"]') ||
                         document.querySelector('input[placeholder*="zip" i]') ||
                         document.querySelector('input[aria-label*="zip" i]');
        if (zipInput) {
          zipInput.focus();
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          if (nativeSetter?.set) nativeSetter.set.call(zipInput, args.zipCode);
          else zipInput.value = args.zipCode;
          zipInput.dispatchEvent(new Event('input', { bubbles: true }));
          zipInput.dispatchEvent(new Event('change', { bubbles: true }));
          await WebMCPHelpers.sleep(200);

          // Submit the ZIP code
          const lookupBtn = WebMCPHelpers.findByText('Look up', 'button') ||
                            WebMCPHelpers.findByText('Update', 'button') ||
                            WebMCPHelpers.findByAriaLabel('look up');
          if (lookupBtn) {
            WebMCPHelpers.simulateClick(lookupBtn);
            await WebMCPHelpers.sleep(1500);
          } else {
            zipInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            await WebMCPHelpers.sleep(1500);
          }

          // Select the first store result if a list appears
          const firstStore = document.querySelector('[data-test="store-list-item"] button') ||
                             document.querySelector('[data-test="store-option"]');
          if (firstStore) {
            WebMCPHelpers.simulateClick(firstStore);
            await WebMCPHelpers.sleep(1000);
          }
        }
      }
    }

    // Read fulfillment/availability info
    const availability = {};

    // Shipping info
    const shippingEl = document.querySelector('[data-test="shippingBlock"]') ||
                       document.querySelector('[data-test="shipping-fulfillment"]');
    if (shippingEl) {
      availability.shipping = shippingEl.textContent.trim().replace(/\s+/g, ' ');
    }

    // Store pickup info
    const pickupEl = document.querySelector('[data-test="storeBlock"]') ||
                     document.querySelector('[data-test="store-fulfillment"]') ||
                     document.querySelector('[data-test="orderPickupBlock"]');
    if (pickupEl) {
      availability.pickup = pickupEl.textContent.trim().replace(/\s+/g, ' ');
    }

    // Same-day delivery
    const deliveryEl = document.querySelector('[data-test="deliveryBlock"]') ||
                       document.querySelector('[data-test="sdd-fulfillment"]');
    if (deliveryEl) {
      availability.delivery = deliveryEl.textContent.trim().replace(/\s+/g, ' ');
    }

    // General fulfillment cell (catches all options)
    if (!availability.shipping && !availability.pickup && !availability.delivery) {
      const fulfillmentEl = document.querySelector('[data-test="fulfillment-cell"]');
      if (fulfillmentEl) {
        availability.general = fulfillmentEl.textContent.trim().replace(/\s+/g, ' ');
      }
    }

    // Store name
    const storeEl = document.querySelector('[data-test="store-name-link"]') ||
                    document.querySelector('[data-test="store-name"]');
    if (storeEl) {
      availability.store = storeEl.textContent.trim();
    }

    if (Object.keys(availability).length === 0) {
      return { content: [{ type: 'text', text: 'Could not find availability information. Make sure you are on a product detail page.' }] };
    }

    let output = 'Availability:\n';
    if (availability.store) output += `Store: ${availability.store}\n`;
    if (availability.shipping) output += `Shipping: ${availability.shipping}\n`;
    if (availability.pickup) output += `Pickup: ${availability.pickup}\n`;
    if (availability.delivery) output += `Same-day delivery: ${availability.delivery}\n`;
    if (availability.general) output += availability.general + '\n';

    return { content: [{ type: 'text', text: output }] };
  }
};
