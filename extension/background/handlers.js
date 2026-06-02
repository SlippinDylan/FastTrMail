(function initBackgroundHandlers(scope) {
  const ns = scope.FastTrMailBackground;
  function getErrorMessage(error, fallbackMessage) {
    return error instanceof Error && error.message ? error.message : fallbackMessage;
  }

  ns.handleMessage = function handleMessage(message, _sender, sendResponse) {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === "translate-email") {
      ns.handleTranslateRequest(message)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => {
          if (error?.name === "AbortError") {
            sendResponse({ ok: false, cancelled: true, error: "翻译请求已取消。" });
            return;
          }

          sendResponse({ ok: false, error: getErrorMessage(error, "翻译请求失败。") });
        });

      return true;
    }

    if (message.type === "get-settings") {
      ns.getSettings()
        .then((settings) => sendResponse({ ok: true, settings }))
        .catch((error) => sendResponse({ ok: false, error: getErrorMessage(error, "读取设置失败。") }));

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
