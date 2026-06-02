const test = require("node:test");
const assert = require("node:assert/strict");

const retryPolicy = require("../extension/content/retry-policy.js");

test("render retry policy backs off and terminates after the configured budget", () => {
  const state = retryPolicy.createRenderRetryState();

  const first = retryPolicy.registerRenderRetryAttempt(state);
  assert.equal(first.shouldRetry, true);
  assert.equal(first.delayMs, retryPolicy.RENDER_RETRY_DELAYS_MS[0]);

  const second = retryPolicy.registerRenderRetryAttempt(state);
  assert.equal(second.shouldRetry, true);
  assert.equal(second.delayMs, retryPolicy.RENDER_RETRY_DELAYS_MS[1]);

  const third = retryPolicy.registerRenderRetryAttempt(state);
  assert.equal(third.shouldRetry, true);
  assert.equal(third.delayMs, retryPolicy.RENDER_RETRY_DELAYS_MS[2]);

  const terminal = retryPolicy.registerRenderRetryAttempt(state);
  assert.equal(terminal.shouldRetry, false);
  assert.match(terminal.message, /页面结构/);
});

test("render retry policy reset clears accumulated attempts", () => {
  const state = retryPolicy.createRenderRetryState();

  retryPolicy.registerRenderRetryAttempt(state);
  retryPolicy.resetRenderRetryState(state);

  const fresh = retryPolicy.registerRenderRetryAttempt(state);
  assert.equal(fresh.shouldRetry, true);
  assert.equal(fresh.delayMs, retryPolicy.RENDER_RETRY_DELAYS_MS[0]);
});
