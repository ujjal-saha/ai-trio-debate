// ---------------------------------------------------------------------------
// config.js  -  everything that depends on how the three websites are built.
//
// If a site redesigns and something stops working, THIS is the only file you
// should need to edit. Each list is tried in order; the first match wins.
//
//   input : the message box you type into
//   send  : the send button
//   stop  : the "stop generating" button (only exists while the AI is replying)
//   reply : the elements that hold the AI's answers (last one = newest)
//   replyInner : (optional) element inside a reply that holds the real text
//   replyInnerAll : (optional) true = read ALL matching inner elements, not just the first
//   label : (optional) hidden label text the site puts in front of answers
// ---------------------------------------------------------------------------

// Left-to-right order of the three windows on your screen.
var SITE_ORDER = ['claude', 'gemini', 'chatgpt'];

var SITES = {
  claude: {
    name: 'Claude',
    color: '#e08a5f',
    url: 'https://claude.ai/new',
    hosts: ['claude.ai'],
    input: [
      'div[contenteditable="true"].ProseMirror',
      '[data-testid="chat-input"]',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]'
    ],
    send: [
      'button[aria-label="Send message"]',
      'button[aria-label="Send Message"]'
    ],
    stop: [
      'button[aria-label="Stop response"]',
      'button[aria-label="Stop Response"]'
    ],
    reply: [
      '[data-is-streaming]',
      'div.font-claude-response',
      'div.font-claude-message'
    ],
    replyInner: '.font-claude-response',   // just the answer, not the "thinking" summary
    replyInnerAll: true,                   // the answer can come in several pieces
    label: /^\s*Claude responded:?\s*/i   // hidden screen-reader label to strip
  },

  gemini: {
    name: 'Gemini',
    color: '#6f9bff',
    url: 'https://gemini.google.com/app',
    hosts: ['gemini.google.com'],
    input: [
      'rich-textarea .ql-editor',
      'div.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]'
    ],
    send: [
      'button[aria-label="Send message"]',
      'button.send-button:not(.stop)'
    ],
    stop: [
      'button[aria-label="Stop response"]',
      'button.send-button.stop',
      'button.stop'
    ],
    reply: [
      'model-response',
      'message-content',
      '.model-response-text'
    ],
    replyInner: 'message-content',          // read the answer text from in here
    label: /^\s*Gemini said:?\s*/i          // hidden screen-reader label to strip
  },

  chatgpt: {
    name: 'ChatGPT',
    color: '#3fbf9b',
    url: 'https://chatgpt.com/',
    hosts: ['chatgpt.com', 'chat.openai.com'],
    input: [
      '#prompt-textarea',
      'div[contenteditable="true"].ProseMirror',
      'textarea[name="prompt-textarea"]',
      'textarea'
    ],
    send: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]'
    ],
    stop: [
      'button[data-testid="stop-button"]',
      'button[aria-label="Stop streaming"]'
    ],
    reply: [
      '[data-message-author-role="assistant"]'
    ],
    label: /^\s*ChatGPT said:?\s*/i
  }
};
