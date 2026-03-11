# Contributing to WebMCPTools

WebMCPTools is an open-source, community-contributed platform where each supported website is a self-contained "site module." Google Flights is the first module — you can add more.

## Adding a New Site Module

### 1. Create the site folder

Copy the template:

```bash
cp -r content/sites/_template content/sites/your-site
```

Your site folder should contain:

```
content/sites/your-site/
  helpers.js       # Site-specific DOM helpers (extend WebMCPHelpers)
  prompt.js        # System prompt fragment for the AI
  injector.js      # Registers tools based on current page
  tools/
    yourTool.js    # One file per tool
    ...
```

### 2. Write your tools

Each tool is a plain JS object:

```js
const YourTool = {
  name: 'your_tool_name',            // snake_case
  description: 'What this tool does', // shown to the AI
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Describe the parameter' }
    },
    required: ['param']
  },
  execute: async (args) => {
    // Interact with the page DOM
    // Use WebMCPHelpers for common operations
    return { content: [{ type: 'text', text: 'Result here' }] };
  }
};
```

### 3. Write the prompt

In `prompt.js`, define a constant with instructions for the AI:

```js
const YOUR_SITE_PROMPT = `SCOPE: You help users with [task] on [site].

AVAILABLE TOOLS:
- your_tool_name: Description of what it does

WORKFLOW:
1. User asks to do X → call your_tool_name
2. Follow up with...`;
```

### 4. Write the injector

In `injector.js`:

```js
// Set page context provider (optional)
window.__webmcpRegistry.pageContextProvider = () => {
  return { someContext: document.querySelector('.info')?.textContent };
};

// Set the site prompt
window.__webmcpRegistry.sitePrompt = typeof YOUR_SITE_PROMPT !== 'undefined' ? YOUR_SITE_PROMPT : '';

// Register tools based on page state
function registerTools() {
  const registry = window.__webmcpRegistry;
  ['your_tool_name'].forEach(name => registry.unregister(name));

  registry.register(YourTool);
}

registerTools();

// Re-register on SPA navigation
let lastHref = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    registerTools();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

### 5. Register in background.js

Add an entry to `SITE_MODULES` in `background.js`:

```js
{
  id: 'your-site',
  matches: ['https://www.example.com/*'],
  js: [
    'content/bridge.js',
    'content/helpers.js',
    'content/sites/your-site/helpers.js',
    'content/sites/your-site/tools/yourTool.js',
    'content/sites/your-site/prompt.js',
    'content/sites/your-site/injector.js'
  ]
}
```

### 6. Add host permissions

In `manifest.json`, add your site's URL pattern to `host_permissions`:

```json
"host_permissions": [
  "https://www.google.com/travel/flights*",
  "https://www.example.com/*"
]
```

### 7. Test

- Load/reload the extension in `chrome://extensions`
- Navigate to your site
- Open the side panel and verify tools register
- Chat with the AI to test tool execution

## Checklist

- [ ] Site folder created under `content/sites/`
- [ ] Tools have `name` (snake_case), `description`, `inputSchema`, and `execute`
- [ ] All `inputSchema.properties` have `description` fields
- [ ] `prompt.js` defines clear scope, available tools, and workflow
- [ ] `injector.js` registers the page context provider and site prompt
- [ ] Entry added to `SITE_MODULES` in `background.js`
- [ ] Host permissions added to `manifest.json`
- [ ] `npm test` passes
- [ ] Manual testing: tools register, execute, and return correct results

## Code Style

- No build step — plain vanilla JS, no modules or bundlers
- Use `WebMCPHelpers` for common DOM operations (click, wait, find)
- Site-specific helpers extend `WebMCPHelpers` (e.g., `WebMCPHelpers.myHelper = function() {}`)
- Tool results use MCP format: `{ content: [{ type: 'text', text: '...' }] }`
- Keep tools focused — one tool per file, one action per tool
