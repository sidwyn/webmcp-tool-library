// content/bridge.js — Content script messaging bridge
// Initializes the tool registry and handles messages from the side panel.

window.__webmcpRegistry = window.__webmcpRegistry || {
  tools: {},

  register(toolDef) {
    this.tools[toolDef.name] = toolDef;
    this._notifySidePanel();
  },

  unregister(name) {
    delete this.tools[name];
    this._notifySidePanel();
  },

  getAll() {
    return Object.values(this.tools).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
  },

  _notifySidePanel() {
    chrome.runtime.sendMessage({
      type: 'TOOLS_UPDATED',
      tools: this.getAll()
    }).catch(() => {}); // Side panel may not be open
  }
};

/**
 * Read the current origin airport text from the Google Flights search form.
 * Works on both the homepage and results pages.
 */
function getPageContext() {
  const ctx = {};

  // Homepage: the origin input has aria-label "Where from?" and a value
  // Results page: the origin is in a readonly/disabled input or displayed chip
  const candidates = [
    () => {
      const el = document.querySelector('input[aria-label="Where from?"]');
      return el?.value?.trim() || null;
    },
    () => {
      // Fallback: any visible input near the search form whose placeholder is "Where from?"
      const el = document.querySelector('input[placeholder="Where from?"]');
      return el?.value?.trim() || null;
    },
    () => {
      // Results page: origin shown as text in the top search bar
      // Google Flights uses a div with the airport code/city that's not an input
      const divs = Array.from(document.querySelectorAll('[aria-label*="From"]'));
      for (const d of divs) {
        const text = d.textContent?.trim();
        if (text && text.length > 1 && text.length < 60) return text;
      }
      return null;
    }
  ];

  for (const fn of candidates) {
    const val = fn();
    if (val) { ctx.originText = val; break; }
  }

  return ctx;
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TOOLS') {
    sendResponse({ tools: window.__webmcpRegistry.getAll(), pageContext: getPageContext() });
    return false;
  }

  if (message.type === 'GET_PAGE_CONTEXT') {
    sendResponse({ pageContext: getPageContext() });
    return false;
  }

  if (message.type === 'EXECUTE_TOOL') {
    const tool = window.__webmcpRegistry.tools[message.toolName];
    if (!tool) {
      sendResponse({ error: `Tool "${message.toolName}" not registered` });
      return false;
    }

    // Execute async — must return true to keep channel open
    tool.execute(message.args)
      .then(result => sendResponse({ result }))
      .catch(err => sendResponse({ error: err.message || String(err) }));
    return true; // Keep message channel open for async response
  }
});
