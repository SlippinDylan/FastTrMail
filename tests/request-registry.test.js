const test = require("node:test");
const assert = require("node:assert/strict");

const requestRegistryModule = require("../extension/background/request-registry.js");

test("request registry aborts a registered request and removes it after finalize", () => {
  const registry = requestRegistryModule.createRequestRegistry();
  const entry = registry.register("request-1");

  assert.equal(registry.has("request-1"), true);
  assert.equal(entry.signal.aborted, false);

  registry.cancel("request-1");
  assert.equal(entry.signal.aborted, true);

  registry.finalize("request-1");
  assert.equal(registry.has("request-1"), false);
});

test("request registry ignores duplicate finalize and unknown cancel", () => {
  const registry = requestRegistryModule.createRequestRegistry();
  const entry = registry.register("request-2");

  registry.finalize("request-2");
  registry.finalize("request-2");
  registry.cancel("missing-request");

  assert.equal(entry.signal.aborted, false);
  assert.equal(registry.has("request-2"), false);
});
