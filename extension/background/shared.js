(function initBackgroundShared(scope) {
  const ns = scope.FastTrMailBackground || (scope.FastTrMailBackground = {});
  const catalog = scope.FastTrMailCatalog;
  const entities = scope.FastTrMailEntities;
  const requestRegistryApi = scope.FastTrMailRequestRegistry;

  if (!catalog || !entities || !requestRegistryApi) {
    throw new Error("FastTrMail shared dependencies failed to load.");
  }

  ns.DEFAULT_SETTINGS = { ...catalog.DEFAULT_SETTINGS };
  ns.PROVIDER_LABELS = { ...catalog.PROVIDER_LABELS };
  ns.normalizeSettings = catalog.normalizeSettings;

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
})(self);
