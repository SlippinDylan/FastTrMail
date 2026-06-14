const test = require("node:test");
const assert = require("node:assert/strict");

const { createBackgroundApp } = require("./helpers/background-harness.js");

const SHARED_MODULES = [
  "shared/catalog.js",
  "shared/i18n.js",
  "shared/entities.js",
  "background/request-registry.js",
  "background/shared.js"
];

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

test("mapWithConcurrency preserves input order while limiting parallel work", async () => {
  const { background } = createBackgroundApp({ modulePaths: SHARED_MODULES });
  let active = 0;
  let maxActive = 0;

  const result = await background.mapWithConcurrency(
    ["first", "second", "third"],
    2,
    async (value, index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, index === 0 ? 15 : 5));
      active -= 1;
      return value.toUpperCase();
    }
  );

  assert.deepEqual(toPlainData(result), ["FIRST", "SECOND", "THIRD"]);
  assert.equal(maxActive, 2);
});

test("getJwtExpiry falls back to a near-future timestamp when the token payload is malformed", () => {
  const { background } = createBackgroundApp({ modulePaths: SHARED_MODULES });
  const before = Date.now() + 9 * 60 * 1000;
  const expiresAt = background.getJwtExpiry("not-a-jwt");
  const after = Date.now() + 11 * 60 * 1000;

  assert.ok(expiresAt >= before);
  assert.ok(expiresAt <= after);
});

test("createErrorResponse preserves structured metadata for UI-side diagnostics", () => {
  const { background } = createBackgroundApp({ modulePaths: SHARED_MODULES });
  const error = background.createError(background.ERROR_CODES.MICROSOFT_UNAVAILABLE, {
    metadata: {
      provider: "microsoft",
      upstreamMessage: "The subscription key is invalid."
    }
  });

  assert.deepEqual(toPlainData(background.createErrorResponse(error)), {
    ok: false,
    errorCode: "microsoft_unavailable",
    metadata: {
      provider: "microsoft",
      upstreamMessage: "The subscription key is invalid."
    }
  });
});
