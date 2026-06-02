(function initEntities(scope) {
  const NAMED_ENTITY_MAP = Object.freeze({
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " "
  });

  function decodeNumericEntity(rawValue, radix) {
    const codePoint = Number.parseInt(rawValue, radix);
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      return null;
    }

    try {
      return String.fromCodePoint(codePoint);
    } catch (_error) {
      return null;
    }
  }

  function decodeHtmlEntities(text) {
    return String(text || "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, token) => {
      if (token[0] === "#") {
        if ((token[1] || "").toLowerCase() === "x") {
          return decodeNumericEntity(token.slice(2), 16) || entity;
        }

        return decodeNumericEntity(token.slice(1), 10) || entity;
      }

      return NAMED_ENTITY_MAP[token] || entity;
    });
  }

  const api = { decodeHtmlEntities };
  scope.FastTrMailEntities = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
