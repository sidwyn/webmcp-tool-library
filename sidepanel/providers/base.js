// sidepanel/providers/base.js — Base class for LLM providers

class BaseLLMProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.sitePrompt = '';
  }

  /**
   * Send a message and stream the response.
   * @param {Array} messages - Conversation history in the provider's format
   * @param {Array} tools - WebMCP tool definitions
   * @param {Object} pageContext - Current page context
   * @param {Object} callbacks
   * @param {Function} callbacks.onToken - Called with each text token string
   * @param {Function} callbacks.onToolCall - Called with { toolName, toolUseId, args }
   * @param {Function} callbacks.onDone - Called with final stop reason
   * @param {Function} callbacks.onError - Called with Error object
   */
  async streamMessage(messages, tools, pageContext, callbacks) {
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
