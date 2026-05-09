(function initBackgroundHandlers(scope) {
  const ns = scope.FastTrMailBackground;

  ns.handleMessage = function handleMessage(message, _sender, sendResponse) {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === "translate-email") {
      ns.handleTranslateRequest(message)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === "get-settings") {
      ns.getSettings()
        .then((settings) => sendResponse({ ok: true, settings }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    return false;
  };

  ns.initialize = function initialize() {
    chrome.runtime.onInstalled.addListener(ns.installDefaultSettings);
    chrome.runtime.onMessage.addListener(ns.handleMessage);
  };
})(self);
