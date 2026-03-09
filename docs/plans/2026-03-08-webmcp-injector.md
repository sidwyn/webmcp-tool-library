# WebMCP Tool Injector — Chrome Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that injects WebMCP tool definitions into Google Flights, enabling an AI agent in the side panel to search and navigate flights using natural language.

**Architecture:** MV3 Chrome extension with a content script that registers WebMCP tools on target pages, a side panel chat UI for LLM conversation, and a Chrome messaging bridge connecting them. The side panel calls Anthropic/OpenAI APIs directly from the browser, executes tool calls by messaging the content script, and streams responses token-by-token.

**Tech Stack:** Vanilla JS (no build step), Chrome Extensions MV3, WebMCP imperative API (`navigator.modelContext`), Anthropic Messages API, OpenAI Chat Completions API, Chrome Storage API, Chrome Side Panel API.

---

## Phase 1: Extension Scaffold + Side Panel UI

### Task 1: MV3 Manifest and Extension Scaffold

**Files:**
- Create: `manifest.json`
- Create: `background.js`
- Create: `icons/icon16.png` (placeholder)
- Create: `icons/icon48.png` (placeholder)
- Create: `icons/icon128.png` (placeholder)

**Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "WebMCP Tool Injector",
  "version": "0.1.0",
  "description": "Inject WebMCP tools into websites and chat with an AI agent that can use them.",
  "permissions": [
    "sidePanel",
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.google.com/travel/flights*",
    ""
  ],
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "content_scripts": [
    {
      "matches": ["https://www.google.com/travel/flights*"],
      "js": ["content/bridge.js", "content/tools/helpers.js", "content/tools/google-flights/searchFlights.js", "content/tools/google-flights/getResults.js", "content/tools/google-flights/setFilters.js", "content/injector.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_title": "Open WebMCP Panel",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 2: Create background.js**

```javascript
// background.js — Service worker, registers side panel behavior

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isGoogleFlights = tab.url.includes('google.com/travel/flights');
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel/index.html',
      enabled: true
    });
  }
});
```

**Step 3: Create placeholder icons**

Use any 16x16, 48x48, 128x128 PNG. For now create minimal 1px transparent PNGs or copy any small PNG. The extension works without valid icons — Chrome just shows a placeholder.

Note: You can generate simple icons with any image editor or use the base64 trick below:
```bash
# Create minimal valid 1x1 PNG placeholder (copy to all three sizes)
# A real icon can be added later
```

For now, create a simple SVG-based placeholder or grab any PNG from the web. The extension will load fine without real icons.

**Step 4: Load extension in Chrome**
1. Open `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `gflight-webmcp` directory
5. Verify extension appears without errors

**Step 5: Commit**
```bash
git init
git add manifest.json background.js
git commit -m "feat: MV3 extension scaffold with side panel and google-flights content script"
```

---

### Task 2: Side Panel HTML and CSS Design System

**Files:**
- Create: `sidepanel/index.html`
- Create: `sidepanel/styles.css`

**Step 1: Create sidepanel/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebMCP</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Top Bar -->
  <header class="top-bar">
    <div class="top-bar-left">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
          <path d="M6 10h8M10 6v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <select id="model-selector" class="model-selector">
        <option value="claude-opus-4-6" data-provider="anthropic">Claude Opus 4.6</option>
        <option value="chatgpt-5.4" data-provider="openai">ChatGPT 5.4</option>
      </select>
    </div>
    <div class="top-bar-right">
      <div class="tool-badge" id="tool-badge" title="Registered tools">
        <span id="tool-count">0</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M8.5 1.5L12.5 5.5L5 13H1V9L8.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
      </div>
      <button id="settings-btn" class="icon-btn" title="Settings" aria-label="Open settings">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.36 13.36l1.42 1.42M3.22 14.78l1.41-1.41M13.36 4.64l1.42-1.42" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </header>

  <!-- Chat View -->
  <main id="chat-view" class="view active">
    <div id="messages" class="messages" role="log" aria-live="polite" aria-label="Conversation">
      <!-- Welcome state -->
      <div class="welcome" id="welcome-state">
        <div class="welcome-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 16h12M16 10v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <h2>WebMCP Assistant</h2>
        <p>I can interact with this page using registered tools. Ask me to search for flights, filter results, or navigate.</p>
        <div id="welcome-tools" class="welcome-tools"></div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <div class="input-wrapper">
        <textarea
          id="message-input"
          placeholder="Ask me anything about flights..."
          rows="1"
          aria-label="Message input"
        ></textarea>
        <button id="send-btn" class="send-btn" aria-label="Send message" disabled>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="input-footer">
        <span id="status-text" class="status-text"></span>
      </div>
    </div>
  </main>

  <!-- Settings View -->
  <aside id="settings-view" class="view">
    <div class="settings-header">
      <h2>Settings</h2>
      <button id="close-settings-btn" class="icon-btn" aria-label="Close settings">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="settings-content">
      <section class="settings-section">
        <h3>API Keys</h3>
        <div class="form-group">
          <label for="anthropic-key">Anthropic API Key</label>
          <div class="key-input-wrapper">
            <input type="password" id="anthropic-key" placeholder="sk-ant-..." autocomplete="off" spellcheck="false">
            <button class="toggle-visibility" data-target="anthropic-key" aria-label="Toggle visibility">
              <svg class="eye-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3"/>
                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
              </svg>
            </button>
          </div>
          <button class="test-btn" id="test-anthropic-btn" data-provider="anthropic">Test connection</button>
          <span class="key-status" id="anthropic-key-status"></span>
        </div>
        <div class="form-group">
          <label for="openai-key">OpenAI API Key</label>
          <div class="key-input-wrapper">
            <input type="password" id="openai-key" placeholder="sk-..." autocomplete="off" spellcheck="false">
            <button class="toggle-visibility" data-target="openai-key" aria-label="Toggle visibility">
              <svg class="eye-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3"/>
                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
              </svg>
            </button>
          </div>
          <button class="test-btn" id="test-openai-btn" data-provider="openai">Test connection</button>
          <span class="key-status" id="openai-key-status"></span>
        </div>
      </section>

      <section class="settings-section">
        <h3>Registered Tools</h3>
        <div id="tools-list" class="tools-list">
          <p class="empty-tools">No tools registered on this page.</p>
        </div>
      </section>
    </div>
  </aside>

  <script src="settings.js"></script>
  <script src="providers/base.js"></script>
  <script src="providers/anthropic.js"></script>
  <script src="providers/openai.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

**Step 2: Create sidepanel/styles.css**

```css
/* =====================================================
   WebMCP Side Panel — Design System
   Inspired by Claude's warm, clean aesthetic
   ===================================================== */

/* CSS Custom Properties */
:root {
  --bg-primary: #F5F0E8;
  --bg-secondary: #EDE8DF;
  --bg-tertiary: #E5DFD4;
  --bg-card: #FFFFFF;
  --bg-input: #FFFFFF;

  --text-primary: #1A1A1A;
  --text-secondary: #6B6560;
  --text-muted: #9B948C;
  --text-inverse: #FFFFFF;

  --accent: #C4603C;
  --accent-hover: #B0532F;
  --accent-light: #F5E8E1;

  --user-bubble-bg: #EDE8DF;
  --user-bubble-border: #D9D3C7;

  --border-light: #E0DAD0;
  --border-medium: #CCC5B8;

  --success: #2D8A4E;
  --success-bg: #E6F4EB;
  --error: #C4603C;
  --error-bg: #F5E8E1;
  --warning: #B07D2A;
  --warning-bg: #FBF3E0;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);

  --font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  --transition: 0.15s ease;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1A1915;
    --bg-secondary: #222019;
    --bg-tertiary: #2A2820;
    --bg-card: #242220;
    --bg-input: #2A2820;

    --text-primary: #EDE8DF;
    --text-secondary: #9B948C;
    --text-muted: #6B6560;
    --text-inverse: #1A1915;

    --accent: #D4705C;
    --accent-hover: #E0806A;
    --accent-light: #2A1F1A;

    --user-bubble-bg: #2A2820;
    --user-bubble-border: #3A3830;

    --border-light: #302E28;
    --border-medium: #403E38;
  }
}

/* Reset + Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

/* Top Bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-primary);
  flex-shrink: 0;
  gap: 8px;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.logo {
  color: var(--accent);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.model-selector {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: 5px 8px;
  cursor: pointer;
  max-width: 180px;
  transition: border-color var(--transition);
}

.model-selector:focus {
  outline: none;
  border-color: var(--accent);
}

.model-selector option:disabled {
  color: var(--text-muted);
}

.tool-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: default;
}

.tool-badge.has-tools {
  color: var(--accent);
  background: var(--accent-light);
  border-color: var(--accent);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}

.icon-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Views */
.view {
  display: none;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.view.active {
  display: flex;
}

/* Chat View */
#chat-view {
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
  scroll-behavior: smooth;
}

/* Scrollbar */
.messages::-webkit-scrollbar { width: 4px; }
.messages::-webkit-scrollbar-track { background: transparent; }
.messages::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 2px; }

/* Welcome State */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
  gap: 12px;
  color: var(--text-secondary);
}

.welcome-icon {
  color: var(--accent);
  opacity: 0.7;
}

.welcome h2 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.welcome p {
  font-size: 14px;
  line-height: 1.6;
  max-width: 300px;
}

.welcome-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 4px;
}

.welcome-tool-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--accent-light);
  border: 1px solid var(--accent);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
}

/* Message Bubbles */
.message {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  font-size: 14.5px;
  line-height: 1.65;
}

.message.user .message-bubble {
  background: var(--user-bubble-bg);
  border: 1px solid var(--user-bubble-border);
  border-bottom-right-radius: var(--radius-sm);
  color: var(--text-primary);
}

.message.assistant .message-bubble {
  background: transparent;
  color: var(--text-primary);
  padding: 4px 0;
  max-width: 100%;
}

/* Markdown in assistant messages */
.message.assistant .message-bubble p { margin-bottom: 10px; }
.message.assistant .message-bubble p:last-child { margin-bottom: 0; }
.message.assistant .message-bubble strong { font-weight: 600; }
.message.assistant .message-bubble code {
  font-family: var(--font-mono);
  font-size: 12.5px;
  background: var(--bg-tertiary);
  padding: 1px 5px;
  border-radius: 4px;
}
.message.assistant .message-bubble pre {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 12px;
  overflow-x: auto;
  margin: 8px 0;
}
.message.assistant .message-bubble pre code {
  background: none;
  padding: 0;
  font-size: 13px;
}
.message.assistant .message-bubble ul,
.message.assistant .message-bubble ol {
  padding-left: 20px;
  margin-bottom: 10px;
}
.message.assistant .message-bubble li { margin-bottom: 4px; }

/* Streaming cursor */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--accent);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}
@keyframes blink { 50% { opacity: 0; } }

/* Tool Call Cards */
.tool-call-card {
  margin: 6px 0;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  font-size: 13px;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  cursor: pointer;
  user-select: none;
}

.tool-call-header:hover {
  background: var(--bg-tertiary);
}

.tool-call-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tool-call-status.running {
  background: var(--warning);
  animation: pulse 1.2s ease-in-out infinite;
}

.tool-call-status.done {
  background: var(--success);
}

.tool-call-status.error {
  background: var(--error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.tool-call-name {
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--text-primary);
  flex: 1;
}

.tool-call-toggle {
  color: var(--text-muted);
  font-size: 11px;
  transition: transform var(--transition);
}

.tool-call-card.expanded .tool-call-toggle {
  transform: rotate(180deg);
}

.tool-call-body {
  display: none;
  padding: 10px 12px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
}

.tool-call-card.expanded .tool-call-body {
  display: block;
}

.tool-call-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 4px;
  margin-top: 8px;
}

.tool-call-section-label:first-child { margin-top: 0; }

.tool-call-json {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--bg-tertiary);
  padding: 8px;
  border-radius: var(--radius-sm);
}

/* Error message */
.error-message {
  padding: 10px 14px;
  background: var(--error-bg);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: 13.5px;
  margin-bottom: 12px;
}

/* Input Area */
.input-area {
  padding: 12px 14px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--bg-input);
  border: 1.5px solid var(--border-medium);
  border-radius: var(--radius-lg);
  padding: 8px 8px 8px 14px;
  transition: border-color var(--transition);
}

.input-wrapper:focus-within {
  border-color: var(--accent);
}

#message-input {
  flex: 1;
  font-family: var(--font-sans);
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  max-height: 120px;
  overflow-y: auto;
  scrollbar-width: thin;
}

#message-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--accent);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition), transform var(--transition);
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.send-btn:disabled {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  cursor: not-allowed;
  transform: none;
}

.input-footer {
  min-height: 18px;
  padding-top: 4px;
}

.status-text {
  font-size: 12px;
  color: var(--text-muted);
}

/* Settings View */
#settings-view {
  overflow-y: auto;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.settings-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.settings-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section h3 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group:last-child { margin-bottom: 0; }

.form-group label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-primary);
}

.key-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-input);
  border: 1.5px solid var(--border-medium);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color var(--transition);
}

.key-input-wrapper:focus-within {
  border-color: var(--accent);
}

.key-input-wrapper input {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  padding: 8px 10px;
}

.key-input-wrapper input::placeholder {
  font-family: var(--font-sans);
  color: var(--text-muted);
}

.toggle-visibility {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: color var(--transition);
}

.toggle-visibility:hover { color: var(--text-primary); }

.test-btn {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  background: var(--accent-light);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  cursor: pointer;
  width: fit-content;
  transition: background var(--transition);
}

.test-btn:hover { background: var(--accent); color: white; }
.test-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.key-status {
  font-size: 12.5px;
  min-height: 18px;
}

.key-status.success { color: var(--success); }
.key-status.error { color: var(--error); }
.key-status.loading { color: var(--text-muted); }

/* Tools List in Settings */
.tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-tools {
  font-size: 13.5px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px 0;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.tool-item-name {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.tool-item-desc {
  font-size: 12px;
  color: var(--text-muted);
  flex: 2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.tool-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-track {
  position: absolute;
  inset: 0;
  background: var(--bg-tertiary);
  border-radius: 10px;
  cursor: pointer;
  transition: background var(--transition);
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition);
  box-shadow: var(--shadow-sm);
}

.tool-toggle input:checked + .toggle-track {
  background: var(--accent);
}

.tool-toggle input:checked + .toggle-track::after {
  transform: translateX(16px);
}
```

**Step 3: Verify HTML/CSS renders in Chrome**

Load the extension, open the side panel on any page, and verify the UI appears without JS errors. It should show the welcome state with the model selector.

**Step 4: Commit**
```bash
git add sidepanel/index.html sidepanel/styles.css
git commit -m "feat: side panel HTML structure and design system CSS"
```

---

### Task 3: Settings and API Key Management

**Files:**
- Create: `sidepanel/settings.js`

**Step 1: Create sidepanel/settings.js**

This module handles settings view open/close, API key load/save, and key visibility toggle.

```javascript
// sidepanel/settings.js — API key management and settings UI

const Settings = (() => {
  const STORAGE_KEYS = {
    anthropicKey: 'webmcp_anthropic_key',
    openaiKey: 'webmcp_openai_key',
    selectedModel: 'webmcp_selected_model',
    disabledTools: 'webmcp_disabled_tools'
  };

  async function load() {
    return new Promise(resolve => {
      chrome.storage.local.get(Object.values(STORAGE_KEYS), items => {
        resolve({
          anthropicKey: items[STORAGE_KEYS.anthropicKey] || '',
          openaiKey: items[STORAGE_KEYS.openaiKey] || '',
          selectedModel: items[STORAGE_KEYS.selectedModel] || 'claude-opus-4-6',
          disabledTools: items[STORAGE_KEYS.disabledTools] || []
        });
      });
    });
  }

  async function save(updates) {
    const mapped = {};
    if ('anthropicKey' in updates) mapped[STORAGE_KEYS.anthropicKey] = updates.anthropicKey;
    if ('openaiKey' in updates) mapped[STORAGE_KEYS.openaiKey] = updates.openaiKey;
    if ('selectedModel' in updates) mapped[STORAGE_KEYS.selectedModel] = updates.selectedModel;
    if ('disabledTools' in updates) mapped[STORAGE_KEYS.disabledTools] = updates.disabledTools;
    return new Promise(resolve => chrome.storage.local.set(mapped, resolve));
  }

  async function testAnthropicKey(apiKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return true;
  }

  async function testOpenAIKey(apiKey) {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return true;
  }

  return { load, save, testAnthropicKey, testOpenAIKey, STORAGE_KEYS };
})();

// Settings UI initialization — runs after DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const chatView = document.getElementById('chat-view');
  const settingsView = document.getElementById('settings-view');
  const anthropicKeyInput = document.getElementById('anthropic-key');
  const openaiKeyInput = document.getElementById('openai-key');
  const modelSelector = document.getElementById('model-selector');

  // Load saved settings
  const saved = await Settings.load();
  if (saved.anthropicKey) anthropicKeyInput.value = saved.anthropicKey;
  if (saved.openaiKey) openaiKeyInput.value = saved.openaiKey;
  modelSelector.value = saved.selectedModel;

  // Update model selector disabled states
  updateModelOptions(saved.anthropicKey, saved.openaiKey);

  // Toggle settings view
  settingsBtn.addEventListener('click', () => {
    chatView.classList.remove('active');
    settingsView.classList.add('active');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
    chatView.classList.add('active');
  });

  // Save keys on change (debounced)
  let saveTimer;
  function onKeyChange() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await Settings.save({
        anthropicKey: anthropicKeyInput.value.trim(),
        openaiKey: openaiKeyInput.value.trim()
      });
      updateModelOptions(anthropicKeyInput.value.trim(), openaiKeyInput.value.trim());
    }, 500);
  }

  anthropicKeyInput.addEventListener('input', onKeyChange);
  openaiKeyInput.addEventListener('input', onKeyChange);

  // Model selector change
  modelSelector.addEventListener('change', async () => {
    await Settings.save({ selectedModel: modelSelector.value });
  });

  // Toggle visibility buttons
  document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Test connection buttons
  document.getElementById('test-anthropic-btn').addEventListener('click', async () => {
    const btn = document.getElementById('test-anthropic-btn');
    const status = document.getElementById('anthropic-key-status');
    const key = anthropicKeyInput.value.trim();
    if (!key) { setStatus(status, 'error', 'Enter an API key first'); return; }
    btn.disabled = true;
    setStatus(status, 'loading', 'Testing...');
    try {
      await Settings.testAnthropicKey(key);
      setStatus(status, 'success', 'Connected');
    } catch (e) {
      setStatus(status, 'error', e.message);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('test-openai-btn').addEventListener('click', async () => {
    const btn = document.getElementById('test-openai-btn');
    const status = document.getElementById('openai-key-status');
    const key = openaiKeyInput.value.trim();
    if (!key) { setStatus(status, 'error', 'Enter an API key first'); return; }
    btn.disabled = true;
    setStatus(status, 'loading', 'Testing...');
    try {
      await Settings.testOpenAIKey(key);
      setStatus(status, 'success', 'Connected');
    } catch (e) {
      setStatus(status, 'error', e.message);
    } finally {
      btn.disabled = false;
    }
  });

  function updateModelOptions(anthropicKey, openaiKey) {
    const selector = document.getElementById('model-selector');
    for (const option of selector.options) {
      const provider = option.dataset.provider;
      if (provider === 'anthropic') option.disabled = !anthropicKey;
      if (provider === 'openai') option.disabled = !openaiKey;
    }
  }

  function setStatus(el, type, text) {
    el.className = `key-status ${type}`;
    el.textContent = text;
  }
});
```

**Step 2: Verify settings panel**

Open the side panel, click the gear icon, verify settings view appears and closes. Enter an API key and reload the panel — verify it's remembered. Test connection button should show "Testing..." then success/error.

**Step 3: Commit**
```bash
git add sidepanel/settings.js
git commit -m "feat: settings panel with API key storage and connection test"
```

---

### Task 4: LLM Provider Base + Anthropic Integration (No Tools)

**Files:**
- Create: `sidepanel/providers/base.js`
- Create: `sidepanel/providers/anthropic.js`

**Step 1: Create sidepanel/providers/base.js**

```javascript
// sidepanel/providers/base.js — Base class for LLM providers

class BaseLLMProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Send a message and stream the response.
   * @param {Array} messages - Conversation history in the provider's format
   * @param {Array} tools - WebMCP tool definitions
   * @param {Object} callbacks
   * @param {Function} callbacks.onToken - Called with each text token string
   * @param {Function} callbacks.onToolCall - Called with { toolName, toolUseId, args }
   * @param {Function} callbacks.onDone - Called with final stop reason
   * @param {Function} callbacks.onError - Called with Error object
   */
  async streamMessage(messages, tools, callbacks) {
    throw new Error('Not implemented');
  }

  /**
   * Convert WebMCP tool definition to provider format.
   * @param {Object} tool - WebMCP tool definition
   * @returns {Object} Provider-specific tool definition
   */
  convertTool(tool) {
    throw new Error('Not implemented');
  }

  /**
   * Format a tool result for inclusion in the conversation.
   * @param {string} toolUseId - The tool use ID from the provider
   * @param {*} result - The tool execution result
   * @returns {Object} Message object to add to conversation history
   */
  formatToolResult(toolUseId, result) {
    throw new Error('Not implemented');
  }
}
```

**Step 2: Create sidepanel/providers/anthropic.js**

```javascript
// sidepanel/providers/anthropic.js — Claude integration via Messages API

class AnthropicProvider extends BaseLLMProvider {
  constructor(apiKey) {
    super(apiKey);
    this.model = 'claude-opus-4-6';
    this.systemPrompt = `You are an AI assistant embedded in a Chrome browser extension. You can interact with the current web page using the available tools. When the user asks you to do something on the page, use the appropriate tool. Always describe what you're doing and report back what you find. Be concise and helpful.`;
  }

  convertTool(tool) {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    };
  }

  formatToolResult(toolUseId, result) {
    const content = typeof result === 'string'
      ? [{ type: 'text', text: result }]
      : result.content || [{ type: 'text', text: JSON.stringify(result) }];
    return {
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseId,
        content
      }]
    };
  }

  async streamMessage(messages, tools, callbacks) {
    const { onToken, onToolCall, onDone, onError } = callbacks;
    const convertedTools = tools.map(t => this.convertTool(t));

    const body = {
      model: this.model,
      max_tokens: 4096,
      system: this.systemPrompt,
      messages,
      stream: true
    };

    if (convertedTools.length > 0) {
      body.tools = convertedTools;
    }

    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      onError(new Error(`Network error: ${e.message}`));
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      onError(new Error(err.error?.message || `API error ${response.status}`));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolUseBlock = null;
    let toolInputBuffer = '';
    let stopReason = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          let event;
          try {
            event = JSON.parse(data);
          } catch {
            continue;
          }

          switch (event.type) {
            case 'content_block_start':
              if (event.content_block.type === 'tool_use') {
                currentToolUseBlock = {
                  id: event.content_block.id,
                  name: event.content_block.name
                };
                toolInputBuffer = '';
              }
              break;

            case 'content_block_delta':
              if (event.delta.type === 'text_delta') {
                onToken(event.delta.text);
              } else if (event.delta.type === 'input_json_delta') {
                toolInputBuffer += event.delta.partial_json;
              }
              break;

            case 'content_block_stop':
              if (currentToolUseBlock) {
                let args = {};
                try { args = JSON.parse(toolInputBuffer); } catch {}
                onToolCall({
                  toolName: currentToolUseBlock.name,
                  toolUseId: currentToolUseBlock.id,
                  args
                });
                currentToolUseBlock = null;
                toolInputBuffer = '';
              }
              break;

            case 'message_delta':
              if (event.delta.stop_reason) {
                stopReason = event.delta.stop_reason;
              }
              break;
          }
        }
      }
    } catch (e) {
      onError(new Error(`Stream error: ${e.message}`));
      return;
    }

    onDone(stopReason);
  }
}
```

**Step 3: Commit**
```bash
git add sidepanel/providers/base.js sidepanel/providers/anthropic.js
git commit -m "feat: Anthropic provider with streaming and tool call support"
```

---

### Task 5: OpenAI Provider

**Files:**
- Create: `sidepanel/providers/openai.js`

**Step 1: Create sidepanel/providers/openai.js**

```javascript
// sidepanel/providers/openai.js — OpenAI integration

class OpenAIProvider extends BaseLLMProvider {
  constructor(apiKey) {
    super(apiKey);
    this.model = 'gpt-4o'; // Update to ChatGPT 5.4 when available
    this.systemPrompt = `You are an AI assistant embedded in a Chrome browser extension. You can interact with the current web page using the available tools. When the user asks you to do something on the page, use the appropriate tool. Always describe what you're doing and report back what you find. Be concise and helpful.`;
  }

  convertTool(tool) {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    };
  }

  formatToolResult(toolUseId, result) {
    const content = typeof result === 'string'
      ? result
      : result.content
        ? result.content.map(c => c.text || JSON.stringify(c)).join('\n')
        : JSON.stringify(result);
    return {
      role: 'tool',
      tool_call_id: toolUseId,
      content
    };
  }

  async streamMessage(messages, tools, callbacks) {
    const { onToken, onToolCall, onDone, onError } = callbacks;
    const convertedTools = tools.map(t => this.convertTool(t));

    const body = {
      model: this.model,
      stream: true,
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ]
    };

    if (convertedTools.length > 0) {
      body.tools = convertedTools;
      body.tool_choice = 'auto';
    }

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      onError(new Error(`Network error: ${e.message}`));
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      onError(new Error(err.error?.message || `API error ${response.status}`));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const toolCallAccumulators = {};
    let finishReason = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          let event;
          try { event = JSON.parse(data); } catch { continue; }

          const delta = event.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            onToken(delta.content);
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallAccumulators[idx]) {
                toolCallAccumulators[idx] = { id: '', name: '', arguments: '' };
              }
              if (tc.id) toolCallAccumulators[idx].id = tc.id;
              if (tc.function?.name) toolCallAccumulators[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCallAccumulators[idx].arguments += tc.function.arguments;
            }
          }

          if (event.choices?.[0]?.finish_reason) {
            finishReason = event.choices[0].finish_reason;
          }
        }
      }
    } catch (e) {
      onError(new Error(`Stream error: ${e.message}`));
      return;
    }

    // Emit accumulated tool calls
    for (const tc of Object.values(toolCallAccumulators)) {
      let args = {};
      try { args = JSON.parse(tc.arguments); } catch {}
      onToolCall({ toolName: tc.name, toolUseId: tc.id, args });
    }

    onDone(finishReason);
  }
}
```

**Step 2: Commit**
```bash
git add sidepanel/providers/openai.js
git commit -m "feat: OpenAI provider with streaming and function calling"
```

---

### Task 6: Chat UI Logic (app.js)

**Files:**
- Create: `sidepanel/app.js`

**Step 1: Create sidepanel/app.js**

```javascript
// sidepanel/app.js — Chat UI and conversation loop

const App = (() => {
  // State
  let conversationHistory = [];
  let registeredTools = [];
  let disabledTools = new Set();
  let isStreaming = false;
  let currentProvider = null;

  // DOM refs
  const messagesEl = document.getElementById('messages');
  const welcomeState = document.getElementById('welcome-state');
  const welcomeTools = document.getElementById('welcome-tools');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const statusText = document.getElementById('status-text');
  const toolCount = document.getElementById('tool-count');
  const toolBadge = document.getElementById('tool-badge');
  const modelSelector = document.getElementById('model-selector');
  const toolsList = document.getElementById('tools-list');

  // ── Tool Management ──────────────────────────────────────────────────────

  function getActiveTools() {
    return registeredTools.filter(t => !disabledTools.has(t.name));
  }

  function updateToolUI() {
    const count = getActiveTools().length;
    toolCount.textContent = count;
    toolBadge.classList.toggle('has-tools', count > 0);

    // Welcome chips
    welcomeTools.innerHTML = '';
    for (const tool of registeredTools) {
      const chip = document.createElement('span');
      chip.className = 'welcome-tool-chip';
      chip.textContent = tool.name;
      welcomeTools.appendChild(chip);
    }

    // Settings tools list
    if (!toolsList) return;
    toolsList.innerHTML = '';
    if (registeredTools.length === 0) {
      toolsList.innerHTML = '<p class="empty-tools">No tools registered on this page.</p>';
      return;
    }
    for (const tool of registeredTools) {
      const item = document.createElement('div');
      item.className = 'tool-item';
      item.innerHTML = `
        <span class="tool-item-name">${tool.name}</span>
        <span class="tool-item-desc" title="${tool.description}">${tool.description}</span>
        <label class="tool-toggle" title="${disabledTools.has(tool.name) ? 'Disabled' : 'Enabled'}">
          <input type="checkbox" ${disabledTools.has(tool.name) ? '' : 'checked'} data-tool="${tool.name}">
          <span class="toggle-track"></span>
        </label>
      `;
      item.querySelector('input').addEventListener('change', async (e) => {
        if (e.target.checked) {
          disabledTools.delete(tool.name);
        } else {
          disabledTools.add(tool.name);
        }
        await Settings.save({ disabledTools: [...disabledTools] });
        updateToolUI();
      });
      toolsList.appendChild(item);
    }
  }

  // ── Message Rendering ────────────────────────────────────────────────────

  function renderMarkdown(text) {
    // Minimal markdown: code blocks, inline code, bold, paragraphs
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`)
      .replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function addUserMessage(text) {
    welcomeState.style.display = 'none';
    const el = document.createElement('div');
    el.className = 'message user';
    el.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function createAssistantMessage() {
    const el = document.createElement('div');
    el.className = 'message assistant';
    el.innerHTML = `<div class="message-bubble"></div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el.querySelector('.message-bubble');
  }

  function appendToken(bubble, token) {
    // Remove cursor if present
    const cursor = bubble.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();

    // Accumulate raw text in dataset
    bubble.dataset.raw = (bubble.dataset.raw || '') + token;

    // Re-render markdown
    bubble.innerHTML = renderMarkdown(bubble.dataset.raw);

    // Add cursor back
    const cursorEl = document.createElement('span');
    cursorEl.className = 'streaming-cursor';
    bubble.appendChild(cursorEl);

    scrollToBottom();
  }

  function finalizeMessage(bubble) {
    const cursor = bubble.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();
    if (bubble.dataset.raw) {
      bubble.innerHTML = renderMarkdown(bubble.dataset.raw);
    }
  }

  function createToolCallCard(toolName) {
    const card = document.createElement('div');
    card.className = 'tool-call-card';
    card.innerHTML = `
      <div class="tool-call-header">
        <div class="tool-call-status running"></div>
        <span class="tool-call-name">${escapeHtml(toolName)}</span>
        <span class="tool-call-toggle">▼</span>
      </div>
      <div class="tool-call-body">
        <div class="tool-call-section-label">Input</div>
        <div class="tool-call-json input-json">...</div>
      </div>
    `;
    card.querySelector('.tool-call-header').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
    messagesEl.appendChild(card);
    scrollToBottom();
    return card;
  }

  function updateToolCallCard(card, { args, result, error }) {
    const status = card.querySelector('.tool-call-status');
    const inputJson = card.querySelector('.input-json');

    inputJson.textContent = JSON.stringify(args, null, 2);

    let resultEl = card.querySelector('.result-json');
    if (!resultEl) {
      const label = document.createElement('div');
      label.className = 'tool-call-section-label';
      label.textContent = error ? 'Error' : 'Result';
      resultEl = document.createElement('div');
      resultEl.className = 'tool-call-json result-json';
      card.querySelector('.tool-call-body').append(label, resultEl);
    }

    if (error) {
      status.className = 'tool-call-status error';
      resultEl.textContent = error;
    } else {
      status.className = 'tool-call-status done';
      const resultText = typeof result === 'string'
        ? result
        : result?.content?.map(c => c.text || JSON.stringify(c)).join('\n') || JSON.stringify(result, null, 2);
      resultEl.textContent = resultText;
    }
    scrollToBottom();
  }

  function addErrorMessage(text) {
    const el = document.createElement('div');
    el.className = 'error-message';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ── Provider Management ──────────────────────────────────────────────────

  async function getProvider() {
    const saved = await Settings.load();
    const model = modelSelector.value;
    const providerName = modelSelector.selectedOptions[0]?.dataset.provider;

    if (providerName === 'anthropic') {
      if (!saved.anthropicKey) throw new Error('Anthropic API key not set. Open Settings to add it.');
      return new AnthropicProvider(saved.anthropicKey);
    } else if (providerName === 'openai') {
      if (!saved.openaiKey) throw new Error('OpenAI API key not set. Open Settings to add it.');
      return new OpenAIProvider(saved.openaiKey);
    }
    throw new Error('Unknown provider selected.');
  }

  // ── Conversation History Helpers ─────────────────────────────────────────

  function pushUserMessage(text) {
    conversationHistory.push({ role: 'user', content: text });
  }

  function pushAssistantText(text) {
    const last = conversationHistory[conversationHistory.length - 1];
    if (last?.role === 'assistant') {
      if (typeof last.content === 'string') {
        last.content += text;
      } else {
        last.content.push({ type: 'text', text });
      }
    } else {
      conversationHistory.push({ role: 'assistant', content: text });
    }
  }

  function pushAssistantToolUse(toolUseId, toolName, args) {
    // Anthropic expects structured content blocks for tool use
    const last = conversationHistory[conversationHistory.length - 1];
    const block = { type: 'tool_use', id: toolUseId, name: toolName, input: args };
    if (last?.role === 'assistant' && Array.isArray(last.content)) {
      last.content.push(block);
    } else if (last?.role === 'assistant' && typeof last.content === 'string') {
      last.content = [{ type: 'text', text: last.content }, block];
    } else {
      conversationHistory.push({ role: 'assistant', content: [block] });
    }
  }

  // ── Main Send Loop ────────────────────────────────────────────────────────

  async function sendMessage(userText) {
    if (isStreaming || !userText.trim()) return;
    isStreaming = true;
    sendBtn.disabled = true;
    messageInput.disabled = true;

    addUserMessage(userText);
    pushUserMessage(userText);

    let provider;
    try {
      provider = await getProvider();
    } catch (e) {
      addErrorMessage(e.message);
      isStreaming = false;
      sendBtn.disabled = false;
      messageInput.disabled = false;
      return;
    }

    await runAgentLoop(provider);

    isStreaming = false;
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
    statusText.textContent = '';
  }

  async function runAgentLoop(provider) {
    let iteration = 0;
    const maxIterations = 10;

    while (iteration < maxIterations) {
      iteration++;
      statusText.textContent = iteration > 1 ? `Continuing (step ${iteration})...` : 'Thinking...';

      const bubble = createAssistantMessage();
      let accumulatedText = '';
      let pendingToolCalls = [];
      let streamDone = false;
      let streamError = null;
      let stopReason = null;

      await new Promise(resolve => {
        provider.streamMessage(
          conversationHistory,
          getActiveTools(),
          {
            onToken: (token) => {
              accumulatedText += token;
              appendToken(bubble, token);
            },
            onToolCall: (toolCall) => {
              pendingToolCalls.push(toolCall);
            },
            onDone: (reason) => {
              stopReason = reason;
              streamDone = true;
              resolve();
            },
            onError: (err) => {
              streamError = err;
              resolve();
            }
          }
        );
      });

      if (streamError) {
        finalizeMessage(bubble);
        addErrorMessage(`Error: ${streamError.message}`);
        return;
      }

      if (accumulatedText) {
        finalizeMessage(bubble);
        pushAssistantText(accumulatedText);
      }

      // Handle tool calls
      if (pendingToolCalls.length === 0) {
        // No tools called — we're done
        return;
      }

      // Execute each tool call
      for (const { toolName, toolUseId, args } of pendingToolCalls) {
        pushAssistantToolUse(toolUseId, toolName, args);

        const card = createToolCallCard(toolName);
        statusText.textContent = `Calling ${toolName}...`;

        let result;
        try {
          result = await executeToolViaContentScript(toolName, args);
          updateToolCallCard(card, { args, result });
        } catch (e) {
          updateToolCallCard(card, { args, result: null, error: e.message });
          result = { content: [{ type: 'text', text: `ERROR: ${e.message}` }] };
        }

        conversationHistory.push(provider.formatToolResult(toolUseId, result));
      }

      // Continue the loop to get the next response
    }

    addErrorMessage('Max iterations reached. The agent may be stuck in a loop.');
  }

  // ── Tool Execution Bridge ─────────────────────────────────────────────────

  async function executeToolViaContentScript(toolName, args) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Tool ${toolName} timed out`)), 30000);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          clearTimeout(timeout);
          reject(new Error('No active tab'));
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'EXECUTE_TOOL',
          toolName,
          args
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response?.result);
          }
        });
      });
    });
  }

  // ── Input Handling ────────────────────────────────────────────────────────

  function initInput() {
    messageInput.addEventListener('input', () => {
      sendBtn.disabled = !messageInput.value.trim() || isStreaming;

      // Auto-resize
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    });

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
          const text = messageInput.value.trim();
          messageInput.value = '';
          messageInput.style.height = 'auto';
          sendBtn.disabled = true;
          sendMessage(text);
        }
      }
    });

    sendBtn.addEventListener('click', () => {
      const text = messageInput.value.trim();
      if (text) {
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.disabled = true;
        sendMessage(text);
      }
    });
  }

  // ── Content Script Listener ───────────────────────────────────────────────

  function initMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOOLS_UPDATED') {
        registeredTools = message.tools || [];
        updateToolUI();
      }
    });
  }

  // ── Initialization ────────────────────────────────────────────────────────

  async function init() {
    const saved = await Settings.load();
    disabledTools = new Set(saved.disabledTools || []);

    initInput();
    initMessageListener();
    updateToolUI();

    // Request current tools from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_TOOLS' }, (response) => {
          if (chrome.runtime.lastError) return; // Content script not loaded yet
          if (response?.tools) {
            registeredTools = response.tools;
            updateToolUI();
          }
        });
      }
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
```

**Step 2: Test basic chat (no tools)**

1. Load extension, navigate to any page
2. Open side panel
3. Add Anthropic API key in settings
4. Type "Hello, who are you?" and press Enter
5. Verify: message appears, streaming text renders token by token

**Step 3: Commit**
```bash
git add sidepanel/app.js
git commit -m "feat: chat UI with streaming, tool call cards, agent loop"
```

---

## Phase 2: Tool Infrastructure

### Task 7: Content Script Bridge

**Files:**
- Create: `content/bridge.js`

**Step 1: Create content/bridge.js**

```javascript
// content/bridge.js — Content script messaging bridge
// This script initializes first (per manifest order), sets up the tool registry
// and handles messages from the side panel.

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

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TOOLS') {
    sendResponse({ tools: window.__webmcpRegistry.getAll() });
    return false;
  }

  if (message.type === 'EXECUTE_TOOL') {
    const tool = window.__webmcpRegistry.tools[message.toolName];
    if (!tool) {
      sendResponse({ error: `Tool "${message.toolName}" not registered` });
      return false;
    }

    // Execute async, must return true to keep channel open
    tool.execute(message.args)
      .then(result => sendResponse({ result }))
      .catch(err => sendResponse({ error: err.message || String(err) }));
    return true; // Keep message channel open for async response
  }
});
```

**Step 2: Commit**
```bash
git add content/bridge.js
git commit -m "feat: content script bridge for tool registry and execution"
```

---

### Task 8: DOM Helpers

**Files:**
- Create: `content/tools/helpers.js`

**Step 1: Create content/tools/helpers.js**

```javascript
// content/tools/helpers.js — Shared DOM utilities for Google Flights tool implementations

const WebMCPHelpers = (() => {

  /**
   * Wait for an element matching selector to appear in DOM.
   * Uses MutationObserver for efficiency.
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
   * Google Flights shows a loading indicator while fetching; we wait for it to disappear
   * and for result cards to appear.
   */
  async function waitForGoogleFlightsResults(timeout = 20000) {
    const start = Date.now();

    // First wait a moment for navigation to register
    await sleep(1500);

    // Wait for loading indicator to disappear
    try {
      await waitForElementToDisappear('[class*="loading"]', timeout - (Date.now() - start));
    } catch {
      // Loading indicator may not always appear — continue
    }

    // Wait for actual result cards
    const resultSelectors = [
      '[class*="resultInner"]',
      '[class*="FlightCard"]',
      '[class*="result-item"]',
      '[data-resultid]'
    ];

    for (const selector of resultSelectors) {
      const el = document.querySelector(selector);
      if (el) return true;
    }

    // Try waiting for any result selector
    for (const selector of resultSelectors) {
      try {
        await waitForElement(selector, 5000);
        return true;
      } catch {
        continue;
      }
    }

    return false; // Results may just not exist
  }

  /**
   * Wait for an element matching selector to disappear.
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
   * Find element by text content (case-insensitive, partial match).
   */
  function findByText(text, tag = '*') {
    const elements = document.querySelectorAll(tag);
    const lower = text.toLowerCase();
    for (const el of elements) {
      if (el.textContent.toLowerCase().includes(lower) &&
          el.children.length === 0) { // leaf nodes only
        return el;
      }
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
  function parseResultCard(card) {
    const getText = (selectors) => {
      for (const sel of selectors) {
        const el = card.querySelector(sel);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      return null;
    };

    // Price: look for dollar amounts
    const priceEl = card.querySelector('[class*="price"]') ||
                    card.querySelector('[class*="Price"]') ||
                    findInCard(card, /\$\d+/);
    const price = priceEl ? priceEl.textContent.trim() : null;

    // Times: departure and arrival
    const timeEls = card.querySelectorAll('[class*="time"]');
    const times = Array.from(timeEls)
      .map(el => el.textContent.trim())
      .filter(t => /\d{1,2}:\d{2}/.test(t));

    // Airline
    const airlineEl = card.querySelector('[class*="airline"]') ||
                      card.querySelector('[class*="Airline"]') ||
                      card.querySelector('img[alt]');
    const airline = airlineEl?.alt || airlineEl?.textContent?.trim() || null;

    // Duration
    const durationEl = card.querySelector('[class*="duration"]') ||
                       card.querySelector('[class*="Duration"]');
    const duration = durationEl?.textContent?.trim() || null;

    // Stops
    const stopsEl = card.querySelector('[class*="stop"]') ||
                    card.querySelector('[class*="Stop"]');
    const stops = stopsEl?.textContent?.trim() || null;

    return {
      price,
      departure: times[0] || null,
      arrival: times[1] || null,
      airline,
      duration,
      stops,
      raw: card.textContent.replace(/\s+/g, ' ').trim().slice(0, 200)
    };
  }

  function findInCard(card, pattern) {
    for (const el of card.querySelectorAll('*')) {
      if (pattern.test(el.textContent) && el.children.length === 0) return el;
    }
    return null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    waitForElement,
    waitForGoogleFlightsResults,
    waitForElementToDisappear,
    findByText,
    simulateClick,
    parseResultCard,
    sleep
  };
})();
```

**Step 2: Commit**
```bash
git add content/tools/helpers.js
git commit -m "feat: DOM helpers for waitForElement, parseResultCard, simulateClick"
```

---

## Phase 3: Google Flights Tools

### Task 9: search_flights Tool

**Files:**
- Create: `content/tools/google-flights/searchFlights.js`

**Step 1: Create content/tools/google-flights/searchFlights.js**

```javascript
// content/tools/google-flights/searchFlights.js

const SearchFlightsTool = {
  name: 'search_flights',
  description: 'Search for flights on Google Flights. Navigates to Google Flights with the given parameters. After calling this tool, call get_results to read the flight options.',
  inputSchema: {
    type: 'object',
    properties: {
      origin: {
        type: 'string',
        description: 'Departure airport IATA code (e.g., "SFO", "JFK", "LHR")'
      },
      destination: {
        type: 'string',
        description: 'Arrival airport IATA code (e.g., "LHR", "NRT", "CDG")'
      },
      departureDate: {
        type: 'string',
        description: 'Departure date in YYYY-MM-DD format'
      },
      returnDate: {
        type: 'string',
        description: 'Return date in YYYY-MM-DD format. Omit for one-way.'
      },
      cabinClass: {
        type: 'string',
        enum: ['economy', 'premium', 'business', 'first'],
        description: 'Cabin class. Defaults to economy.'
      },
      adults: {
        type: 'integer',
        description: 'Number of adult passengers. Defaults to 1.'
      }
    },
    required: ['origin', 'destination', 'departureDate']
  },

  execute: async (args) => {
    const { origin, destination, departureDate, returnDate, cabinClass = 'economy', adults = 1 } = args;

    // Validate
    if (!origin || !destination || !departureDate) {
      return { content: [{ type: 'text', text: 'ERROR: origin, destination, and departureDate are required.' }] };
    }

    const iataPattern = /^[A-Z]{3}$/i;
    if (!iataPattern.test(origin) || !iataPattern.test(destination)) {
      return { content: [{ type: 'text', text: 'ERROR: origin and destination must be 3-letter IATA airport codes (e.g., SFO, JFK, LHR).' }] };
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(departureDate)) {
      return { content: [{ type: 'text', text: 'ERROR: departureDate must be in YYYY-MM-DD format.' }] };
    }

    // Build Google Flights URL
    const cabinMap = { economy: 'e', premium: 'po', business: 'b', first: 'f' };
    const cabinCode = cabinMap[cabinClass] || 'e';

    const route = returnDate
      ? `${origin.toUpperCase()}-${destination.toUpperCase()}/${departureDate}/${returnDate}`
      : `${origin.toUpperCase()}-${destination.toUpperCase()}/${departureDate}`;

    const adultsParam = adults > 1 ? `/${adults}adults` : '';
    const url = `https://www.google.com/travel/flights/flights/${route}${adultsParam}?sort=bestflight_a&fs=cabin=${cabinCode}`;

    // Navigate
    window.location.href = url;

    // Wait briefly then check if navigation started
    await WebMCPHelpers.sleep(500);

    return {
      content: [{
        type: 'text',
        text: `Navigating to Google Flights to search for ${cabinClass} flights from ${origin.toUpperCase()} to ${destination.toUpperCase()} on ${departureDate}${returnDate ? ` returning ${returnDate}` : ' (one-way)'}${adults > 1 ? ` for ${adults} adults` : ''}. After the page loads, call get_results to see the available flights.`
      }]
    };
  }
};
```

**Step 2: Manual test**

1. Navigate to google.com/travel/flights in Chrome
2. Open the side panel
3. Ask: "Search for flights from SFO to NYC on 2026-04-15"
4. Verify: the agent calls `search_flights`, Google Flights navigates to results URL

**Step 3: Commit**
```bash
git add content/tools/google-flights/searchFlights.js
git commit -m "feat: search_flights tool - URL construction and navigation"
```

---

### Task 10: get_results Tool

**Files:**
- Create: `content/tools/google-flights/getResults.js`

**Step 1: Create content/tools/google-flights/getResults.js**

```javascript
// content/tools/google-flights/getResults.js

const GetResultsTool = {
  name: 'get_results',
  description: 'Read the current flight search results from the Google Flights page and return them as structured data. Must be on a Google Flights results page.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'integer',
        description: 'Maximum number of results to return. Defaults to 5.'
      }
    }
  },

  execute: async (args) => {
    const { maxResults = 5 } = args;

    if (!window.location.hostname.includes('google.com/travel/flights')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on google.com/travel/flights. Please navigate to Google Flights and run a search first.' }] };
    }

    if (!window.location.pathname.includes('/flights/')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on a Google Flights results page. Use search_flights first.' }] };
    }

    // Wait for results to load
    const loaded = await WebMCPHelpers.waitForGoogleFlightsResults(25000);

    // Try multiple selector strategies for result cards
    const cardSelectors = [
      '[class*="resultInner"]',
      '[class*="FlightCard"]',
      '[data-resultid]',
      '[class*="result-item"]',
      '.Base-Results-HorizonResult',
      '[class*="nrc6"]' // Fallback class pattern
    ];

    let cards = [];
    for (const selector of cardSelectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        cards = Array.from(found).slice(0, maxResults);
        break;
      }
    }

    if (cards.length === 0) {
      // Fallback: look for any element containing a price and flight times
      const allEls = document.querySelectorAll('[class]');
      const candidates = Array.from(allEls).filter(el => {
        const text = el.textContent;
        return /\$\d+/.test(text) &&
               /\d{1,2}:\d{2}/.test(text) &&
               el.offsetHeight > 50 &&
               el.children.length > 2;
      });
      cards = candidates.slice(0, maxResults);
    }

    if (cards.length === 0) {
      return { content: [{ type: 'text', text: 'No flight results found on this page. The page may still be loading or no flights match your criteria.' }] };
    }

    const results = cards.map((card, i) => {
      const parsed = WebMCPHelpers.parseResultCard(card);
      return { rank: i + 1, ...parsed };
    }).filter(r => r.price || r.departure || r.airline);

    if (results.length === 0) {
      return { content: [{ type: 'text', text: 'Found result cards but could not parse flight data. Google Flights may have updated their DOM structure.' }] };
    }

    const summary = results.map(r =>
      `${r.rank}. ${r.airline || 'Unknown airline'} — ${r.departure || '?'} → ${r.arrival || '?'} (${r.duration || '?'}, ${r.stops || 'unknown stops'}) — ${r.price || '?'}`
    ).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} flight result(s):\n\n${summary}`
      }]
    };
  }
};
```

**Step 2: Test**

1. Complete a search_flights call first
2. After Google Flights results load, ask: "What flights are available?"
3. Agent should call `get_results` and return structured data

**Step 3: Commit**
```bash
git add content/tools/google-flights/getResults.js
git commit -m "feat: get_results tool - parse Google Flights result cards"
```

---

### Task 11: set_filters Tool

**Files:**
- Create: `content/tools/google-flights/setFilters.js`

**Step 1: Create content/tools/google-flights/setFilters.js**

```javascript
// content/tools/google-flights/setFilters.js

const SetFiltersTool = {
  name: 'set_filters',
  description: 'Apply filters to the current Google Flights results. Modifies the URL to apply stop, airline, or price filters. Only works on a Google Flights results page.',
  inputSchema: {
    type: 'object',
    properties: {
      stops: {
        type: 'string',
        enum: ['any', 'nonstop', '1stop', '2stops'],
        description: 'Maximum number of stops. "nonstop" = direct only.'
      },
      maxPrice: {
        type: 'integer',
        description: 'Maximum price in USD.'
      }
    }
  },

  execute: async (args) => {
    const { stops, maxPrice } = args;

    if (!window.location.hostname.includes('google.com/travel/flights')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on google.com/travel/flights.' }] };
    }

    if (!window.location.pathname.includes('/flights/')) {
      return { content: [{ type: 'text', text: 'ERROR: Not on a Google Flights results page.' }] };
    }

    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    // Apply filters via Google Flights filter UI
    const fsFilters = [];
    const currentFs = params.get('fs') || '';

    // Parse existing fs params (preserve cabin class etc.)
    const existingFilters = currentFs.split(';').filter(f =>
      f && !f.startsWith('stops=') && !f.startsWith('price=')
    );
    fsFilters.push(...existingFilters);

    if (stops && stops !== 'any') {
      const stopsMap = { nonstop: '0', '1stop': '-1', '2stops': '-2' };
      const stopsCode = stopsMap[stops];
      if (stopsCode) fsFilters.push(`stops=${stopsCode}`);
    }

    if (maxPrice) {
      fsFilters.push(`price=-${maxPrice}`);
    }

    if (fsFilters.length > 0) {
      params.set('fs', fsFilters.join(';'));
    }

    const newUrl = `${url.origin}${url.pathname}?${params.toString()}`;
    window.location.href = newUrl;

    await WebMCPHelpers.sleep(500);

    const filterDesc = [
      stops && stops !== 'any' ? `stops: ${stops}` : null,
      maxPrice ? `max price: $${maxPrice}` : null
    ].filter(Boolean).join(', ');

    return {
      content: [{
        type: 'text',
        text: `Applied filters (${filterDesc || 'none'}) and updated Google Flights results. Call get_results to see the filtered flights.`
      }]
    };
  }
};
```

**Step 2: Commit**
```bash
git add content/tools/google-flights/setFilters.js
git commit -m "feat: set_filters tool - apply filters to Google Flights results"
```

---

### Task 12: Content Script Injector

**Files:**
- Create: `content/injector.js`

**Step 1: Create content/injector.js**

This script runs last (per manifest order) and registers tools based on the current page URL.

```javascript
// content/injector.js — Registers WebMCP tools based on current page

function registerGoogleFlightsTools() {
  const path = window.location.pathname;
  const registry = window.__webmcpRegistry;

  // Clear existing Google Flights tools
  ['search_flights', 'get_results', 'set_filters'].forEach(name => registry.unregister(name));

  if (path.includes('/flights/') && path.split('/').length > 3) {
    // On results page
    registry.register(GetResultsTool);
    registry.register(SetFiltersTool);
    registry.register(SearchFlightsTool); // Also available to search again
  } else {
    // On homepage or search form
    registry.register(SearchFlightsTool);
  }
}

// Initial registration
registerGoogleFlightsTools();

// Re-register on SPA navigation (Google Flights uses client-side routing)
let lastPathname = window.location.pathname;
const navObserver = new MutationObserver(() => {
  if (window.location.pathname !== lastPathname) {
    lastPathname = window.location.pathname;
    registerGoogleFlightsTools();
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });

// Also listen for popstate
window.addEventListener('popstate', () => {
  setTimeout(registerGoogleFlightsTools, 100);
});
```

**Step 2: Commit**
```bash
git add content/injector.js
git commit -m "feat: injector - dynamic tool registration based on Google Flights page context"
```

---

## Phase 4: Polish and End-to-End Testing

### Task 13: End-to-End Test Flow

**No new files — this is a manual testing task.**

**Test checklist:**

1. Load extension unpacked in Chrome 146+
2. Enable `chrome://flags/#enable-webmcp-testing`
3. Navigate to `https://www.google.com/travel/flights`
4. Click extension icon to open side panel
5. Open settings, add Anthropic API key, click "Test connection" → should show "Connected"
6. Close settings
7. Verify tool badge shows `1` (search_flights registered)
8. Type: "Find flights from SFO to London on April 15, returning April 22"
   - Expected: Agent calls `search_flights`, Google Flights navigates, tool card shows in chat
9. Wait for results page to load
10. Type: "What are the cheapest options?"
    - Expected: Agent calls `get_results`, returns 5 flights with prices
11. Type: "Show me only nonstop flights under $800"
    - Expected: Agent calls `set_filters`, page reloads, agent calls `get_results` again
12. Verify tool badge updates to show `3` tools on results page (get_results, set_filters, search_flights)

**Commit after verifying:**
```bash
git add -A
git commit -m "test: verified end-to-end agent flow on Google Flights"
```

---

### Task 14: README

**Files:**
- Create: `README.md`

**Step 1: Create README.md**

```markdown
# WebMCP Tool Injector

A Chrome extension that makes websites agent-ready by injecting WebMCP tool definitions. Targets Google Flights for flight search.

## Setup

1. Clone/download this repo
2. Open Chrome 146+ and enable `chrome://flags/#enable-webmcp-testing`
3. Go to `chrome://extensions`, enable Developer mode, click "Load unpacked"
4. Select the `gflight-webmcp` directory
5. Click the extension icon on google.com/travel/flights to open the side panel

## Usage

1. Open settings (gear icon) and add your Anthropic or OpenAI API key
2. Navigate to [google.com/travel/flights](https://www.google.com/travel/flights)
3. Open the side panel
4. Ask the agent to search for flights in natural language

**Example prompts:**
- "Search for flights from SFO to London on April 15, returning April 22"
- "Show me only nonstop flights"
- "What are the cheapest options under $600?"

## Architecture

```
sidepanel/          — Chat UI (HTML/CSS/JS, no build step)
  providers/        — Anthropic and OpenAI API clients
  app.js            — Chat loop, tool execution, message rendering
  settings.js       — API key management
content/            — Injected into google.com/travel/flights
  bridge.js         — Tool registry, messaging bridge
  tools/helpers.js  — DOM utilities
  tools/google-flights/      — Google Flights-specific tool implementations
background.js       — Service worker, side panel registration
manifest.json       — MV3 manifest
```

## Supported Tools

| Tool | Available on |
|------|-------------|
| `search_flights` | google.com/travel/flights homepage and results |
| `get_results` | google.com/travel/flights/flights/* results page |
| `set_filters` | google.com/travel/flights/flights/* results page |
```

**Step 2: Commit**
```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1 | 1–6 | Extension scaffold, side panel UI, settings, Anthropic + OpenAI providers, chat UI |
| 2 | 7–8 | Content script bridge, DOM helpers |
| 3 | 9–12 | All Google Flights tools + injector |
| 4 | 13–14 | E2E testing, README |
