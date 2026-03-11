// content/sites/_template/tools/exampleTool.js — Example WebMCP tool
//
// Each tool is a plain object with: name, description, inputSchema, execute.
// The tool is registered by the injector via window.__webmcpRegistry.register().
//
// Example:
//
// const SearchProductsTool = {
//   name: 'search_products',
//   description: 'Search for products by keyword on Example Store.',
//   inputSchema: {
//     type: 'object',
//     properties: {
//       query: {
//         type: 'string',
//         description: 'Search query (e.g., "wireless headphones")'
//       },
//       maxResults: {
//         type: 'integer',
//         description: 'Maximum number of results to return. Defaults to 5.'
//       }
//     },
//     required: ['query']
//   },
//
//   execute: async (args) => {
//     const { query, maxResults = 5 } = args;
//
//     // Use WebMCPHelpers for DOM interaction
//     const searchInput = WebMCPHelpers.findByAriaLabel('Search');
//     if (!searchInput) {
//       return { content: [{ type: 'text', text: 'ERROR: Search input not found on page.' }] };
//     }
//
//     // Type the query and submit
//     searchInput.value = query;
//     searchInput.dispatchEvent(new Event('input', { bubbles: true }));
//     await WebMCPHelpers.sleep(500);
//
//     // Read results
//     const items = document.querySelectorAll('.product-card');
//     const results = Array.from(items).slice(0, maxResults).map((el, i) => ({
//       rank: i + 1,
//       name: el.querySelector('.product-name')?.textContent?.trim(),
//       price: el.querySelector('.price')?.textContent?.trim()
//     }));
//
//     return {
//       content: [{
//         type: 'text',
//         text: `Found ${results.length} products:\n${results.map(r => `${r.rank}. ${r.name} — ${r.price}`).join('\n')}`
//       }]
//     };
//   }
// };
