(function initBackgroundHandlers(scope) {
  const ns = scope.FastTrMailBackground;

  ns.handleMessage = function handleMessage(message, _sender, sendResponse) {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === "translate-email") {
      ns.handleTranslateRequest(message)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse(ns.createErrorResponse(error, ns.ERROR_CODES.TRANSLATION_REQUEST_FAILED)));

      return true;
    }

    if (message.type === "get-settings") {
      ns.getSettings()
        .then((settings) => sendResponse({ ok: true, settings }))
        .catch((error) => sendResponse(ns.createErrorResponse(error, ns.ERROR_CODES.SETTINGS_READ_FAILED)));

      return true;
    }

    if (message.type === "cancel-translation") {
      sendResponse({
        ok: true,
        cancelled: ns.cancelTranslateRequest(message.requestId)
      });
      return false;
    }

    return false;
  };

  ns.initialize = function initialize() {
    chrome.runtime.onInstalled.addListener(ns.installDefaultSettings);
    chrome.runtime.onMessage.addListener(ns.handleMessage);
  };
})(self);
