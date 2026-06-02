(function initBackgroundShared(scope) {
  const ns = scope.FastTrMailBackground || (scope.FastTrMailBackground = {});
  const catalog = scope.FastTrMailCatalog;
  const i18n = scope.FastTrMailI18n;
  const entities = scope.FastTrMailEntities;
  const requestRegistryApi = scope.FastTrMailRequestRegistry;

  if (!catalog || !i18n || !entities || !requestRegistryApi) {
    throw new Error("FastTrMail shared dependencies failed to load.");
  }

  ns.DEFAULT_SETTINGS = { ...catalog.DEFAULT_SETTINGS };
  ns.PROVIDER_LABELS = { ...catalog.PROVIDER_LABELS };
  ns.normalizeSettings = catalog.normalizeSettings;
  ns.ERROR_CODES = { ...i18n.ERROR_CODES };

  ns.EDGE_AUTH_URL = "https://edge.microsoft.com/translate/auth";
  ns.EDGE_TRANSLATE_URL = "https://api.cognitive.microsofttranslator.com/translate";
  ns.EDGE_AUTH_RULE_ID = 1001;
  ns.EDGE_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0";
  ns.EDGE_SEC_CH_UA = '"Chromium";v="136", "Microsoft Edge";v="136", "Not.A/Brand";v="99"';

  ns.edgeAuthCache = null;
  ns.edgeAuthPromise = null;

  ns.LANGUAGE_DEFINITIONS = catalog.LANGUAGE_DEFINITIONS.map((language) => ({
    ...language
  }));
  ns.requestRegistry = requestRegistryApi.createRequestRegistry();

  ns.decodeHtmlEntities = entities.decodeHtmlEntities;

  ns.getJwtExpiry = function getJwtExpiry(token) {
    const parts = token.split(".");
    if (parts.length < 2) {
      return Date.now() + 10 * 60 * 1000;
    }

    try {
      const payload = JSON.parse(ns.base64UrlDecode(parts[1]));
      if (typeof payload.exp === "number") {
        return payload.exp * 1000;
      }
    } catch (_error) {
      return Date.now() + 10 * 60 * 1000;
    }

    return Date.now() + 10 * 60 * 1000;
  };

  ns.isJwtLikeToken = function isJwtLikeToken(token) {
    return typeof token === "string" && /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
  };

  ns.base64UrlDecode = function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return atob(padded);
  };

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
