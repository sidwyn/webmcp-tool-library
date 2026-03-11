// content/sites/_template/injector.js — Registers tools based on the current page
//
// This file runs last (after bridge.js, helpers, and tool files).
// It should:
// 1. Set a pageContextProvider (optional — provides site-specific context to the AI)
// 2. Set the sitePrompt (from your prompt.js)
// 3. Register/unregister tools based on the current URL or page state
//
// Example:
//
// // Provide site-specific context
// window.__webmcpRegistry.pageContextProvider = () => {
//   return { currentCategory: document.querySelector('.breadcrumb')?.textContent };
// };
//
// // Set the site prompt
// window.__webmcpRegistry.sitePrompt = typeof MY_SITE_PROMPT !== 'undefined' ? MY_SITE_PROMPT : '';
//
// function registerTools() {
//   const registry = window.__webmcpRegistry;
//   // Unregister all first
//   ['search_products', 'get_details'].forEach(name => registry.unregister(name));
//
//   // Register based on page
//   registry.register(SearchProductsTool);
//   if (window.location.href.includes('/product/')) {
//     registry.register(GetDetailsTool);
//   }
// }
//
// registerTools();
//
// // Re-register on SPA navigation
// let lastHref = window.location.href;
// const observer = new MutationObserver(() => {
//   if (window.location.href !== lastHref) {
//     lastHref = window.location.href;
//     registerTools();
//   }
// });
// observer.observe(document.body, { childList: true, subtree: true });
