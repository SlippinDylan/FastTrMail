(function initBackgroundShared(scope) {
  const ns = scope.FastTrMailBackground || (scope.FastTrMailBackground = {});
  const catalog = scope.FastTrMailCatalog;
  const i18n = scope.FastTrMailI18n;
  const entities = scope.FastTrMailEntities;
  const requestRegistryApi = scope.FastTrMailRequestRegistry;

  if (!catalog || !i18n || !entities || !requestRegistryApi) {
    throw new Error("FastTrMail shared dependencies failed to load.");
  }

  ns.PUBLIC_SETTINGS_KEYS = catalog.PUBLIC_SETTINGS_KEYS.slice();
  ns.SECRET_SETTINGS_KEYS = catalog.SECRET_SETTINGS_KEYS.slice();
  ns.DEFAULT_PUBLIC_SETTINGS = { ...catalog.DEFAULT_PUBLIC_SETTINGS };
  ns.DEFAULT_SECRET_SETTINGS = { ...catalog.DEFAULT_SECRET_SETTINGS };
  ns.DEFAULT_SETTINGS = { ...catalog.DEFAULT_SETTINGS };
  ns.PROVIDER_LABELS = { ...catalog.PROVIDER_LABELS };
  ns.normalizePublicSettings = catalog.normalizePublicSettings;
  ns.normalizeSecretSettings = catalog.normalizeSecretSettings;
  ns.normalizeSettings = catalog.normalizeSettings;
  ns.resolveUiLanguage = i18n.resolveUiLanguage;
  ns.ERROR_CODES = { ...i18n.ERROR_CODES };

  ns.LANGUAGE_DEFINITIONS = catalog.LANGUAGE_DEFINITIONS.map((language) => ({
    ...language
  }));
  ns.requestRegistry = requestRegistryApi.createRequestRegistry();

  ns.decodeHtmlEntities = entities.decodeHtmlEntities;

  ns.mapWithConcurrency = async function mapWithConcurrency(items, concurrency, iteratee) {
    const limit = Math.max(1, Number(concurrency) || 1);
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, () => worker())
    );

    return results;
  };

  ns.createError = function createError(code, { cause, message, metadata } = {}) {
    const error = cause instanceof Error
      ? cause
      : new Error(typeof message === "string" && message ? message : code);

    error.code = code;

    if (typeof message === "string" && message) {
      error.message = message;
    }

    if (metadata && typeof metadata === "object") {
      error.metadata = { ...metadata };
    }

    return error;
  };

  ns.getErrorCode = function getErrorCode(error, fallbackCode = ns.ERROR_CODES.TRANSLATION_REQUEST_FAILED) {
    if (error?.name === "AbortError") {
      return ns.ERROR_CODES.TRANSLATION_CANCELLED;
    }

    if (typeof error?.code === "string" && error.code) {
      return error.code;
    }

    return fallbackCode;
  };

  ns.createErrorResponse = function createErrorResponse(error, fallbackCode) {
    const errorCode = ns.getErrorCode(error, fallbackCode);
    const response = {
      ok: false,
      errorCode
    };

    if (errorCode === ns.ERROR_CODES.TRANSLATION_CANCELLED) {
      response.cancelled = true;
    }

    if (error?.metadata && typeof error.metadata === "object") {
      response.metadata = { ...error.metadata };
    }

    return response;
  };
})(self);
