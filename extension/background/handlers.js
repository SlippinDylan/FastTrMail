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

    if (message.type === "settings:get-public") {
      ns.getPublicSettings()
        .then((publicSettings) => sendResponse({ ok: true, publicSettings }))
        .catch((error) => sendResponse(ns.createErrorResponse(error, ns.ERROR_CODES.SETTINGS_READ_FAILED)));

      return true;
    }

    if (message.type === "settings:get-options-view") {
      Promise.all([ns.getPublicSettings(), ns.getSecretSettings()])
        .then(([publicSettings, secretSettings]) => sendResponse({ ok: true, publicSettings, secretSettings }))
        .catch((error) => sendResponse(ns.createErrorResponse(error, ns.ERROR_CODES.SETTINGS_READ_FAILED)));

      return true;
    }

    if (message.type === "settings:get-ui-context") {
      ns.getUiContext()
        .then((uiContext) => sendResponse({ ok: true, uiContext }))
        .catch((error) => sendResponse(ns.createErrorResponse(error, ns.ERROR_CODES.SETTINGS_READ_FAILED)));

      return true;
    }

    if (message.type === "settings:save-public") {
      ns.savePublicSettings(message.publicSettings)
        .then((publicSettings) => sendResponse({ ok: true, publicSettings }))
        .catch((error) => sendResponse(ns.createErrorResponse(error, ns.ERROR_CODES.SETTINGS_READ_FAILED)));

      return true;
    }

    if (message.type === "settings:save-secrets") {
      ns.saveSecretSettings(message.secretSettings)
        .then((secretSettings) => sendResponse({ ok: true, secretSettings }))
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
    void ns.configureStorageAccess().catch(() => {});
    chrome.runtime.onInstalled.addListener(ns.installDefaultSettings);
    chrome.runtime.onMessage.addListener(ns.handleMessage);
  };
})(self);
