// content/sites/_template/helpers.js — Site-specific DOM utilities
// Extend WebMCPHelpers with functions specific to your site.
//
// Example:
//
// WebMCPHelpers.waitForMyResults = async function(timeout = 10000) {
//   // Wait for results to appear on the page
//   const start = Date.now();
//   return new Promise(resolve => {
//     const check = () => {
//       if (document.querySelector('.results-container')) { resolve(true); return; }
//       if (Date.now() - start > timeout) { resolve(false); return; }
//       setTimeout(check, 200);
//     };
//     check();
//   });
// };
