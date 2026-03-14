// content/sites/walmart/tools/addToCart.js

const AddToCartTool = {
  name: 'add_to_cart',
  description: 'Add the current product to the Walmart shopping cart. Must be on a product detail page.',
  inputSchema: {
    type: 'object',
    properties: {
      quantity: {
        type: 'integer',
        description: 'Number of items to add. Defaults to 1.'
      }
    }
  },

  execute: async (args) => {
    const { quantity = 1 } = args;

    if (!window.location.href.includes('walmart.com/ip/')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on a Walmart product detail page. Navigate to a product page first.' }] };
    }

    if (quantity < 1 || quantity > 12) {
      return { content: [{ type: 'text', text: 'ERROR: quantity must be between 1 and 12.' }] };
    }

    const titleEl = document.querySelector('[data-testid="product-title"], h1[itemprop="name"], #main-title');
    const title = titleEl?.textContent?.trim() || 'this product';

    if (quantity > 1) {
      const qtySelect = document.querySelector('[data-testid="quantity-selector"] select, select[aria-label*="Quantity"], select[aria-label*="quantity"]');
      if (qtySelect) {
        qtySelect.value = String(quantity);
        qtySelect.dispatchEvent(new Event('change', { bubbles: true }));
        await WebMCPHelpers.sleep(500);
      } else {
        const incrementBtn = document.querySelector('[data-testid="quantity-increment"], button[aria-label*="Increase"]');
        if (incrementBtn) {
          for (let i = 1; i < quantity; i++) {
            WebMCPHelpers.simulateClick(incrementBtn);
            await WebMCPHelpers.sleep(300);
          }
        }
      }
    }

    const addBtn = document.querySelector('[data-testid="add-to-cart-btn"]') ||
                   WebMCPHelpers.findByText('Add to cart', 'button') ||
                   document.querySelector('button[aria-label*="Add to cart"]');

    if (!addBtn) {
      const oos = WebMCPHelpers.findByText('Out of stock', 'span') ||
                  WebMCPHelpers.findByText('Out of stock', 'div');
      if (oos) {
        return { content: [{ type: 'text', text: `Cannot add "${title}" to cart — it is currently out of stock.` }] };
      }
      return { content: [{ type: 'text', text: 'Could not find the "Add to cart" button. The product may be out of stock or require selecting options first.' }] };
    }

    WebMCPHelpers.simulateClick(addBtn);
    await WebMCPHelpers.sleep(2000);

    const confirmation = document.querySelector('[data-testid="atc-confirmation"], [data-automation-id="atc-flyout"]') ||
                         WebMCPHelpers.findByText('Added to cart', 'span') ||
                         WebMCPHelpers.findByText('Added to cart', 'h2');

    if (confirmation) {
      return {
        content: [{
          type: 'text',
          text: `Added ${quantity > 1 ? quantity + 'x ' : ''}"${title}" to cart. Use get_cart to view your full cart.`
        }]
      };
    }

    const loginPrompt = document.querySelector('[data-testid="sign-in-modal"]') ||
                        WebMCPHelpers.findByText('Sign in', 'h2');
    if (loginPrompt) {
      return { content: [{ type: 'text', text: 'A sign-in prompt appeared. Please log in to your Walmart account first.' }] };
    }

    return {
      content: [{
        type: 'text',
        text: `Clicked "Add to cart" for "${title}". Use get_cart to verify.`
      }]
    };
  }
};
