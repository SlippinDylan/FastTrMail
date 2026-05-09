(function initBackgroundShared(scope) {
  const ns = scope.FastTrMailBackground || (scope.FastTrMailBackground = {});

  ns.DEFAULT_SETTINGS = {
    provider: "google-web",
    targetLanguage: "zh-CN",
    googleApiKey: "",
    microsoftApiKey: "",
    microsoftRegion: ""
  };

  ns.EDGE_AUTH_URL = "https://edge.microsoft.com/translate/auth";
  ns.EDGE_TRANSLATE_URL = "https://api.cognitive.microsofttranslator.com/translate";
  ns.EDGE_AUTH_RULE_ID = 1001;
  ns.EDGE_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0";
  ns.EDGE_SEC_CH_UA = '"Chromium";v="136", "Microsoft Edge";v="136", "Not.A/Brand";v="99"';

  ns.edgeAuthCache = null;
  ns.edgeAuthPromise = null;

  ns.LANGUAGE_DEFINITIONS = [
    { id: "zh-CN", label: "Chinese (Simplified)", google: "zh-CN", microsoft: "zh-Hans" },
    { id: "zh-TW", label: "Chinese (Traditional)", google: "zh-TW", microsoft: "zh-Hant" },
    { id: "en", label: "English", google: "en", microsoft: "en" },
    { id: "ja", label: "Japanese", google: "ja", microsoft: "ja" },
    { id: "ko", label: "Korean", google: "ko", microsoft: "ko" },
    { id: "fr", label: "French", google: "fr", microsoft: "fr" },
    { id: "de", label: "German", google: "de", microsoft: "de" },
    { id: "es", label: "Spanish", google: "es", microsoft: "es" },
    { id: "it", label: "Italian", google: "it", microsoft: "it" },
    { id: "pt", label: "Portuguese", google: "pt", microsoft: "pt" },
    { id: "ru", label: "Russian", google: "ru", microsoft: "ru" }
  ];

  ns.decodeHtmlEntities = function decodeHtmlEntities(text) {
    return text
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  };

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
