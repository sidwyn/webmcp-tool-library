// content/sites/_template/prompt.js — System prompt fragment for your site
//
// This prompt is prepended to the base provider prompt. It should describe:
// - What the site does and what the AI can help with
// - The available tools and their typical workflow
// - Any site-specific rules or constraints
//
// Example:
//
// const MY_SITE_PROMPT = `SCOPE: You help users search and compare products on Example Store.
//
// AVAILABLE TOOLS:
// - search_products: Search for products by keyword
// - get_details: Get detailed product information
// - add_to_cart: Add a product to the shopping cart
//
// WORKFLOW:
// 1. User asks to find a product → call search_products
// 2. Show results, then use get_details for specifics
// 3. If user wants to buy → call add_to_cart`;
