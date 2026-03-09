// content/tools/helpers.js — Shared DOM utilities for Google Flights tool implementations

const WebMCPHelpers = (() => {

  /**
   * Wait for an element matching selector to appear in DOM.
   */
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) { resolve(existing); return; }

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for element: ${selector}`));
      }, timeout);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  /**
   * Wait for Google Flights loading state to clear and results to appear.
   * Google Flights shows a progress bar and spinner while fetching.
   */
  async function waitForGoogleFlightsResults(timeout = 20000) {
    const start = Date.now();

    await sleep(2000); // Give the SPA time to start loading

    // Wait for loading indicators to disappear
    const loadingSelectors = [
      '[role="progressbar"]',
      '[aria-label*="Loading"]',
      '[aria-label*="loading"]'
    ];

    for (const selector of loadingSelectors) {
      try {
        await waitForElementToDisappear(selector, Math.min(10000, timeout - (Date.now() - start)));
      } catch {
        // May not be present — continue
      }
    }

    // Wait for flight result cards to appear.
    // Primary: div.yR1fYc (verified selector for Google Flights flight cards)
    // Fallback: structural check for divs containing price + time
    return new Promise(resolve => {
      const check = () => {
        // Primary selector
        if (document.querySelectorAll('div.yR1fYc').length > 0) {
          resolve(true);
          return;
        }
        // Fallback: any div with price + departure time pattern
        const hasResults = Array.from(document.querySelectorAll('div')).some(el => {
          if (el.children.length < 3) return false;
          const text = el.textContent;
          return /\$[\d,]+/.test(text) && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text) &&
                 /(nonstop|\d+\s+stop)/i.test(text);
        });
        if (hasResults) { resolve(true); return; }

        if (Date.now() - start > timeout) { resolve(false); return; }
        setTimeout(check, 500);
      };
      setTimeout(check, 500);
    });
  }

  /**
   * Wait for an element to disappear.
   */
  function waitForElementToDisappear(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (!document.querySelector(selector)) { resolve(); return; }

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for element to disappear: ${selector}`));
      }, timeout);

      const observer = new MutationObserver(() => {
        if (!document.querySelector(selector)) {
          clearTimeout(timer);
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  }

  /**
   * Find element by text content (case-insensitive, partial match on leaf nodes).
   */
  function findByText(text, tag = '*') {
    const elements = document.querySelectorAll(tag);
    const lower = text.toLowerCase();
    for (const el of elements) {
      if (el.textContent.trim().toLowerCase() === lower) return el;
    }
    // Fallback: partial match
    for (const el of elements) {
      if (el.textContent.toLowerCase().includes(lower) && el.children.length === 0) return el;
    }
    return null;
  }

  /**
   * Find element by aria-label (case-insensitive, partial match).
   */
  function findByAriaLabel(text) {
    const lower = text.toLowerCase();
    const elements = document.querySelectorAll('[aria-label]');
    for (const el of elements) {
      if (el.getAttribute('aria-label').toLowerCase().includes(lower)) return el;
    }
    return null;
  }

  /**
   * Simulate a realistic mouse click on an element.
   */
  function simulateClick(element) {
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  /**
   * Parse a Google Flights result card into structured data.
   * Uses text pattern matching since class names are obfuscated.
   */
  function parseGoogleFlightCard(card, rank) {
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
    // Filter out airport codes (≤3 chars), prices, times, and airport full names.
    const airlineSpans = Array.from(card.querySelectorAll('span')).filter(el => {
      if (el.className) return false; // has a class → not an airline span
      const t = el.textContent.trim();
      return t.length > 3 &&
        !t.startsWith('$') &&
        !/^\d/.test(t) &&
        !/AM|PM/i.test(t) &&
        !/airport|international|terminal/i.test(t) &&
        !/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(t);
    });
    const airline = airlineSpans.length > 0
      ? airlineSpans.map(s => s.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i).join(', ')
      : null;

    return { rank, airline, departure, arrival, duration, stops, price };
  }

  /**
   * Set a range slider value in a React-compatible way.
   * Plain assignment doesn't trigger React's synthetic events.
   */
  function setSliderValue(slider, value) {
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
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    waitForElement,
    waitForGoogleFlightsResults,
    waitForElementToDisappear,
    findByText,
    findByAriaLabel,
    simulateClick,
    parseGoogleFlightCard,
    setSliderValue,
    sleep
  };
})();
