const test = require("node:test");
const assert = require("node:assert/strict");

const retryStateGuard = require("../extension/content/retry-state-guard.js");
const retryPolicy = require("../extension/content/retry-policy.js");

test("does not reset retry state while the same segment signature is being retried", () => {
  const renderRetryState = retryPolicy.createRenderRetryState();
  const messageState = {
    segmentSignature: "signature-a",
    status: "render-pending",
    renderRetryState
  };

  retryPolicy.registerRenderRetryAttempt(renderRetryState);
  retryPolicy.registerRenderRetryAttempt(renderRetryState);

  retryStateGuard.syncRetryStateForSignature(messageState, "signature-a");

  assert.equal(messageState.renderRetryState.attemptCount, 2);
});

test("resets retry state when the segment signature changes", () => {
  const renderRetryState = retryPolicy.createRenderRetryState();
  const messageState = {
    segmentSignature: "signature-a",
    status: "render-pending",
    renderRetryState
  };

  retryPolicy.registerRenderRetryAttempt(renderRetryState);
  retryPolicy.registerRenderRetryAttempt(renderRetryState);

  retryStateGuard.syncRetryStateForSignature(messageState, "signature-b");

  assert.equal(messageState.renderRetryState.attemptCount, 0);
});

test("resets retry state when a fresh translation run starts", () => {
  const renderRetryState = retryPolicy.createRenderRetryState();
  const messageState = {
    segmentSignature: "signature-a",
    status: "render-pending",
    renderRetryState
  };

  retryPolicy.registerRenderRetryAttempt(renderRetryState);

  retryStateGuard.prepareForFreshTranslation(messageState);

  assert.equal(messageState.renderRetryState.attemptCount, 0);
});
