(function initContentPolicies(scope) {
  const app = scope.FastTrMailContent || (scope.FastTrMailContent = {});
  const normalizeKeyText = app.utils?.normalizeKeyText || ((text) => String(text).replace(/\s+/g, " ").trim());

  const CANDIDATE_BODY_MIN_LENGTH = 3;

  function normalizeText(text) {
    return normalizeKeyText(text || "");
  }

  function hasTranslatableText(text) {
    const compact = normalizeText(text);
    if (!compact) {
      return false;
    }

    if (/^https?:\/\/\S+$/i.test(compact)) {
      return false;
    }

    return /\p{Letter}/u.test(compact);
  }

  function isExplicitBodyText(text) {
    return hasTranslatableText(text);
  }

  function isCandidateBodyText(text) {
    const compact = normalizeText(text);
    if (compact.length < CANDIDATE_BODY_MIN_LENGTH) {
      return false;
    }

    return hasTranslatableText(compact);
  }

  const api = {
    hasTranslatableText,
    isExplicitBodyText,
    isCandidateBodyText
  };

  app.policies = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
