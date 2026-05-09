(() => {
  const app = globalThis.FastTrMailContent = globalThis.FastTrMailContent || {};
  const getCurrentPageKey = () => `${window.location.pathname}${window.location.search}`;

  app.constants = {
    BUTTON_CLASS: "fmt-translate-button",
    BUTTON_ACTIVE_CLASS: "fmt-translate-button-active",
    INLINE_TRANSLATION_CLASS: "fmt-inline-translation",
    TITLE_TRANSLATION_CLASS: "fmt-title-translation",
    MESSAGE_STATUS_CLASS: "fmt-message-status",
    SEGMENT_ANCHOR_CLASS: "fmt-segment-anchor",
    TRANSLATION_WRAPPER_CLASS: "fmt-translation-wrapper",
    MESSAGE_INSTANCE_ATTRIBUTE: "data-fmt-message-instance-id",
    SEGMENT_ATTRIBUTE: "data-fmt-segment-id",
    TRANSLATE_ICON: [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="u-standardicon v-Icon" role="presentation">',
      '  <path d="M4.75 6.75h9.5"></path>',
      '  <path d="M9.5 6.75c0 5.3-2.44 8.73-6.15 10.5"></path>',
      '  <path d="M6.1 10.6c1.2 2.05 3.06 3.72 5.4 4.85"></path>',
      '  <path d="M14.5 17.25l2.15-5.5 2.1 5.5"></path>',
      '  <path d="M15.25 15.5h2.85"></path>',
      "</svg>",
      '<span class="label">翻译</span>'
    ].join("")
  };

  app.state = {
    threadStates: new WeakMap(),
    activeThreadStates: new Set(),
    observerMuteDepth: 0,
    documentRefreshScheduled: false,
    observedThreadRoots: new Set(),
    observedThreadFlushTimer: 0,
    messageInstanceCounter: 0,
    segmentCounter: 0,
    threadStateCounter: 0,
    currentLocationKey: getCurrentPageKey(),
    documentGeneration: 0
  };

  app.utils = {
    nextSegmentId() {
      const segmentId = `fmt-segment-${app.state.segmentCounter}`;
      app.state.segmentCounter += 1;
      return segmentId;
    },
    nextMessageInstanceId() {
      const messageInstanceId = `fmt-message-${app.state.messageInstanceCounter}`;
      app.state.messageInstanceCounter += 1;
      return messageInstanceId;
    },
    nextThreadStateKey() {
      const threadStateKey = `fmt-thread-${app.state.threadStateCounter}`;
      app.state.threadStateCounter += 1;
      return threadStateKey;
    },
    getPageKey() {
      return getCurrentPageKey();
    },
    parseColor(colorValue) {
      const match = colorValue.match(/\d+(\.\d+)?/g) || ["0", "0", "0"];
      return {
        r: Number(match[0] || 0),
        g: Number(match[1] || 0),
        b: Number(match[2] || 0)
      };
    },
    getLuminance({ r, g, b }) {
      const channels = [r, g, b].map((value) => {
        const normalized = value / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });

      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    },
    normalizeKeyText(text) {
      return String(text).replace(/\s+/g, " ").trim();
    },
    normalizeTranslationText(text) {
      return String(text)
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    },
    withObserverMuted(task) {
      app.state.observerMuteDepth += 1;
      try {
        return task();
      } finally {
        app.state.observerMuteDepth -= 1;
      }
    },
    summarizeText(text, maxLength = 120) {
      const normalized = String(text || "").replace(/\s+/g, " ").trim();
      if (normalized.length <= maxLength) {
        return normalized;
      }

      return `${normalized.slice(0, maxLength)}...`;
    }
  };

  app.debug = {
    enabled: false,
    events: [],
    log() {
    },
    getEvents() {
      return this.events.slice();
    }
  };
})();
