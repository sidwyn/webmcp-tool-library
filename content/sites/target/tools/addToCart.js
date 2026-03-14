// content/sites/target/tools/addToCart.js

const AddToCartTool = {
  name: 'add_to_cart',
  description: 'Add the current product to the Target shopping cart. Must be on a product detail page. Optionally select a size, color, or quantity before adding.',
  inputSchema: {
    type: 'object',
    properties: {
      quantity: {
        type: 'integer',
        description: 'Number of items to add. Defaults to 1.'
      },
      size: {
        type: 'string',
        description: 'Size to select before adding (e.g., "M", "Large", "8"). Must match an available option.'
      },
      color: {
        type: 'string',
        description: 'Color to select before adding (e.g., "Red", "Navy Blue"). Must match an available option.'
      }
    }
  },

  execute: async (args) => {
    if (!window.location.hostname.includes('target.com')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on Target.com.' }] };
    }

    const actions = [];

    // Select color if specified
    if (args.color) {
      const colorBtns = Array.from(document.querySelectorAll(
        '[data-test="swatch-group"] button, [data-test="colorVariation"] button, button[aria-label*="color" i]'
      ));
      const lower = args.color.toLowerCase();
      const match = colorBtns.find(btn => {
        const label = (btn.getAttribute('aria-label') || btn.textContent).toLowerCase();
        return label.includes(lower);
      });
      if (match) {
        WebMCPHelpers.simulateClick(match);
        await WebMCPHelpers.sleep(500);
        actions.push(`Selected color: ${args.color}`);
      } else {
        actions.push(`WARNING: Could not find color "${args.color}"`);
      }
    }

    // Select size if specified
    if (args.size) {
      const sizeBtns = Array.from(document.querySelectorAll(
        '[data-test="sizeVariation"] button, [data-test="swatch-group"] button, button[aria-label*="size" i]'
      ));
      const lower = args.size.toLowerCase();
      const match = sizeBtns.find(btn => {
        const label = (btn.getAttribute('aria-label') || btn.textContent).trim().toLowerCase();
        return label === lower || label.includes(lower);
      });
      if (match) {
        WebMCPHelpers.simulateClick(match);
        await WebMCPHelpers.sleep(500);
        actions.push(`Selected size: ${args.size}`);
      } else {
        actions.push(`WARNING: Could not find size "${args.size}"`);
      }
    }

    // Set quantity if > 1
    if (args.quantity && args.quantity > 1) {
      const qtySelect = document.querySelector('select[data-test="quantity-selector"]') ||
                         document.querySelector('select[aria-label*="quantity" i]');
      if (qtySelect) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
        if (nativeSetter?.set) nativeSetter.set.call(qtySelect, String(args.quantity));
        else qtySelect.value = String(args.quantity);
        qtySelect.dispatchEvent(new Event('change', { bubbles: true }));
        await WebMCPHelpers.sleep(300);
        actions.push(`Set quantity: ${args.quantity}`);
      } else {
        actions.push('WARNING: Could not find quantity selector');
      }
    }

    // Click "Add to cart" button
    const addBtn = document.querySelector('[data-test="shipItButton"]') ||
                   document.querySelector('[data-test="addToCartButton"]') ||
                   document.querySelector('button[data-test="add-to-cart-button"]') ||
                   WebMCPHelpers.findByText('Add to cart', 'button');

    if (!addBtn) {
      return {
        content: [{
          type: 'text',
          text: `Could not find "Add to cart" button. Make sure you are on a product detail page with an available product.\n${actions.length > 0 ? '\nPrior actions:\n' + actions.join('\n') : ''}`
        }]
      };
    }

    WebMCPHelpers.simulateClick(addBtn);
    await WebMCPHelpers.sleep(1500);

    // Check for confirmation dialog/modal
    const confirmEl = document.querySelector('[data-test="addToCartModal"]') ||
                      document.querySelector('[data-test="add-to-cart-confirmation"]') ||
                      WebMCPHelpers.findByText('Added to cart');
    if (confirmEl) {
      actions.push('Item added to cart successfully');
    } else {
      actions.push('Clicked "Add to cart" — check the cart to confirm');
    }

    // Get the product name for the confirmation message
    const titleEl = document.querySelector('[data-test="product-title"]') || document.querySelector('h1');
    const productName = titleEl?.textContent?.trim() || 'Product';

    return {
      content: [{
        type: 'text',
        text: `${actions.join('\n')}\n\nAdded "${productName}" to cart. Call get_cart_summary to review your cart.`
      }]
    };
  }
};
