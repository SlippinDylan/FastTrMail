(function initBackgroundBootstrap(scope) {
  const MODULE_PATHS = [
    "shared/catalog.js",
    "shared/i18n.js",
    "shared/entities.js",
    "background/request-registry.js",
    "background/shared.js",
    "background/settings.js",
    "background/providers.js",
    "background/handlers.js"
  ];

  function start({
    importScriptsFn = scope.importScripts.bind(scope),
    runtimeScope = scope,
    logger = scope.console
  } = {}) {
    try {
      importScriptsFn(...MODULE_PATHS);

      const backgroundApp = runtimeScope.FastTrMailBackground;
      if (!backgroundApp || typeof backgroundApp.initialize !== "function") {
        throw new Error("FastTrMail background modules failed to initialize.");
      }

      backgroundApp.initialize();
      return { ok: true };
    } catch (error) {
      logger?.error?.("[FastTrMail] Background startup failed.", error);
      return { ok: false, error };
    }
  }

  const api = { start };
  scope.FastTrMailBackgroundBootstrap = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
