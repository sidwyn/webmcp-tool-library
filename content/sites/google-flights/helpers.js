// content/sites/google-flights/helpers.js — Google Flights-specific DOM utilities
// Extends WebMCPHelpers (loaded from content/helpers.js)

/**
 * Wait for Google Flights loading state to clear and results to appear.
 * Google Flights shows a progress bar and spinner while fetching.
 */
WebMCPHelpers.waitForGoogleFlightsResults = async function(timeout = 20000) {
  const start = Date.now();

  function hasResults() {
    if (document.querySelectorAll('div.yR1fYc').length > 0) return true;
    return Array.from(document.querySelectorAll('div')).some(el => {
      if (el.children.length < 3) return false;
      const text = el.textContent;
      return /\$[\d,]+/.test(text) && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text) &&
             /(nonstop|\d+\s+stop)/i.test(text);
    });
  }

  // If results are already on the page, return immediately
  if (hasResults()) return true;

  // Brief wait for SPA navigation to start, then poll quickly
  await WebMCPHelpers.sleep(500);
  if (hasResults()) return true;

  // Wait for loading indicators to disappear
  const loadingSelectors = [
    '[role="progressbar"]',
    '[aria-label*="Loading"]',
    '[aria-label*="loading"]'
  ];

  for (const selector of loadingSelectors) {
    if (Date.now() - start > timeout) break;
    try {
      await WebMCPHelpers.waitForElementToDisappear(selector, Math.min(5000, timeout - (Date.now() - start)));
    } catch {
      // May not be present — continue
    }
  }

  // Poll for results at 200ms intervals
  return new Promise(resolve => {
    const check = () => {
      if (hasResults()) { resolve(true); return; }
      if (Date.now() - start > timeout) { resolve(false); return; }
      setTimeout(check, 200);
    };
    check();
  });
};

/**
 * Parse a Google Flights result card into structured data.
 * Uses text pattern matching since class names are obfuscated.
 */
WebMCPHelpers.parseGoogleFlightCard = function(card, rank) {
  const text = card.textContent;

  // Price: $XXX or $X,XXX
  const priceMatch = text.match(/\$[\d,]+/);
  const price = priceMatch ? priceMatch[0] : null;

  // Times: "10:30 AM" patterns — Google Flights repeats each time twice
  // (once as visible text, once in aria label), so departure=0, arrival=2
  const timeMatches = text.match(/\d{1,2}:\d{2}\s*(AM|PM)/gi) || [];
  const departure = timeMatches[0] || null;
  const arrival = timeMatches[2] || timeMatches[1] || null;

  // Duration: try known class first, then regex
  const durationEl = card.querySelector('div.gvkrdb');
  const durationMatch = text.match(/\d+\s*h(?:r|our)?\s*\d*\s*m(?:in)?|\d+\s*h(?:r|our)?/i);
  const duration = durationEl?.textContent?.trim() || (durationMatch ? durationMatch[0].trim() : null);

  // Stops: "Nonstop", "1 stop", "2 stops"
  const stopsMatch = text.match(/nonstop|(\d+)\s+stop(?:s)?/i);
  const stops = stopsMatch ? stopsMatch[0] : null;

  // Airline: Google Flights renders airline names as class-less SPAN elements.
  // Must be visible, leaf nodes, not inside dialogs, and not match time/price/airport patterns.
  const airlineSpans = Array.from(card.querySelectorAll('span')).filter(el => {
    if (el.className) return false;
    if (el.children.length > 0) return false; // leaf nodes only
    if (el.closest('[role="dialog"]')) return false; // skip tooltip/dialog text
    if (el.offsetHeight === 0 && el.offsetWidth === 0) return false; // must be visible
    const t = el.textContent.trim();
    return t.length > 2 &&
      !t.startsWith('$') &&
      !/^\d/.test(t) &&
      !/\d\s*(AM|PM)/i.test(t) && // only filter AM/PM after digits (not "American")
      !/airport|international|terminal/i.test(t) &&
      !/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(t) &&
      !/carry-on|checked bag|close dialog|additional fee/i.test(t);
  });
  const airline = airlineSpans.length > 0
    ? airlineSpans.map(s => s.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i).join(', ')
    : null;

  return { rank, airline, departure, arrival, duration, stops, price };
};

/**
 * Set a range slider value in a React-compatible way.
 * Plain assignment doesn't trigger React's synthetic events.
 */
WebMCPHelpers.setSliderValue = function(slider, value) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 1440;
  const clamped = Math.min(Math.max(value, min), max);
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  if (nativeSetter && nativeSetter.set) {
    nativeSetter.set.call(slider, clamped);
  } else {
    slider.value = clamped;
  }
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
};

/**
 * Simulate typing into a Google Flights combobox input (triggers autocomplete).
 * Clears existing value, types text character by character, waits for
 * autocomplete dropdown, and selects the first suggestion.
 */
WebMCPHelpers.simulateTyping = async function(input, text) {
  input.focus();
  input.dispatchEvent(new Event('focusin', { bubbles: true }));

  // Clear existing value using native setter (React-compatible)
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  const setValue = (el, val) => {
    if (nativeSetter?.set) nativeSetter.set.call(el, val);
    else el.value = val;
  };

  setValue(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await WebMCPHelpers.sleep(200);

  // Type characters one by one
  for (const char of text) {
    const current = input.value || '';
    setValue(input, current + char);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    await WebMCPHelpers.sleep(50);
  }
  await WebMCPHelpers.sleep(1000); // Wait for autocomplete dropdown

  // Select first autocomplete option
  const option = document.querySelector('[role="option"]') ||
                 document.querySelector('[role="listbox"] li');
  if (option) {
    WebMCPHelpers.simulateClick(option);
    await WebMCPHelpers.sleep(300);
    return true;
  }
  return false;
};
