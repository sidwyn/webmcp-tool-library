// content/bridge.js — Content script messaging bridge
// Initializes the tool registry and handles messages from the side panel.

window.__webmcpRegistry = window.__webmcpRegistry || {
  tools: {},
  pageContextProvider: null,
  sitePrompt: '',

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
      tools: this.getAll(),
      sitePrompt: this.sitePrompt
    }).catch(() => {}); // Side panel may not be open
  }
};

/**
 * Build page context by merging base URL with site-specific context.
 */
function getPageContext() {
  const ctx = { url: window.location.href };
  const provider = window.__webmcpRegistry.pageContextProvider;
  if (typeof provider === 'function') {
    try {
      Object.assign(ctx, provider());
    } catch {
      // Site provider may throw — return base context
    }
  }
  return ctx;
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TOOLS') {
    sendResponse({
      tools: window.__webmcpRegistry.getAll(),
      pageContext: getPageContext(),
      sitePrompt: window.__webmcpRegistry.sitePrompt
    });
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
