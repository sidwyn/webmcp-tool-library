// content/sites/target/tools/getCartSummary.js

const GetCartSummaryTool = {
  name: 'get_cart_summary',
  description: 'Read the current Target shopping cart contents and order totals. Navigates to the cart page if not already there.',
  inputSchema: {
    type: 'object',
    properties: {}
  },

  execute: async () => {
    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    // Navigate to cart if not already there
    if (!window.location.pathname.includes('/cart')) {
      setTimeout(() => { window.location.href = 'https://www.target.com/cart'; }, 50);
      return {
        content: [{
          type: 'text',
          text: 'Navigating to cart page. Call get_cart_summary again once the page loads.'
        }]
      };
    }

    // Wait for cart to load
    await WebMCPHelpers.sleep(1000);
    try {
      await WebMCPHelpers.waitForElement('[data-test="cart-item"], [data-test="cartItem"], [data-test="cart-empty-message"]', 10000);
    } catch {
      // May timeout — continue to check what's there
    }

    // Check for empty cart
    const emptyMsg = document.querySelector('[data-test="cart-empty-message"]') ||
                     WebMCPHelpers.findByText('Your cart is empty');
    if (emptyMsg) {
      return { content: [{ type: 'text', text: 'Your cart is empty.' }] };
    }

    // Parse cart items
    const itemEls = document.querySelectorAll('[data-test="cart-item"], [data-test="cartItem"]');
    const items = [];

    for (const el of itemEls) {
      const nameEl = el.querySelector('[data-test="cart-item-title"]') ||
                     el.querySelector('a[href*="/p/"]');
      const priceEl = el.querySelector('[data-test="cart-item-price"]') ||
                      el.querySelector('[data-test="current-price"]');
      const qtyEl = el.querySelector('select[data-test="quantity-selector"]') ||
                    el.querySelector('input[aria-label*="quantity" i]') ||
                    el.querySelector('[data-test="cart-item-quantity"]');

      items.push({
        name: nameEl?.textContent?.trim() || 'Unknown item',
        price: priceEl?.textContent?.trim() || 'N/A',
        quantity: qtyEl?.value || qtyEl?.textContent?.trim() || '1'
      });
    }

    // If no items found via data-test, try broader approach
    if (items.length === 0) {
      const cartSection = document.querySelector('[data-test="cart-content"]') || document.body;
      const productLinks = cartSection.querySelectorAll('a[href*="/p/"]');
      const seen = new Set();
      for (const link of productLinks) {
        const row = link.closest('[class*="cart"]') || link.closest('li') || link.parentElement?.parentElement;
        if (row && !seen.has(row)) {
          seen.add(row);
          const price = row.textContent.match(/\$[\d,.]+/);
          items.push({
            name: link.textContent.trim() || 'Unknown item',
            price: price ? price[0] : 'N/A',
            quantity: '1'
          });
        }
      }
    }

    // Read order summary
    const summary = {};
    const summaryEl = document.querySelector('[data-test="cart-summary"]') ||
                      document.querySelector('[data-test="orderSummary"]');
    if (summaryEl) {
      const text = summaryEl.textContent;
      const subtotalMatch = text.match(/subtotal[:\s]*\$?([\d,.]+)/i);
      const taxMatch = text.match(/tax[:\s]*\$?([\d,.]+)/i);
      const totalMatch = text.match(/total[:\s]*\$?([\d,.]+)/i);
      if (subtotalMatch) summary.subtotal = '$' + subtotalMatch[1];
      if (taxMatch) summary.tax = '$' + taxMatch[1];
      if (totalMatch) summary.total = '$' + totalMatch[1];
    }

    // Format output
    let output = `Cart (${items.length} item${items.length !== 1 ? 's' : ''}):\n\n`;
    for (const item of items) {
      output += `- ${item.name} — ${item.price} x${item.quantity}\n`;
    }

    if (Object.keys(summary).length > 0) {
      output += '\nOrder Summary:\n';
      if (summary.subtotal) output += `  Subtotal: ${summary.subtotal}\n`;
      if (summary.tax) output += `  Est. tax: ${summary.tax}\n`;
      if (summary.total) output += `  Total: ${summary.total}\n`;
    }

    return { content: [{ type: 'text', text: output }] };
  }
};
