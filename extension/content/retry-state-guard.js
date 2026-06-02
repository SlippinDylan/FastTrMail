(function initRetryStateGuard(scope) {
  const retryPolicy = scope.FastTrMailRetryPolicy
    || (typeof require === "function" ? require("./retry-policy.js") : null);

  if (!retryPolicy) {
    throw new Error("FastTrMail retry policy is required.");
  }

  function syncRetryStateForSignature(messageState, nextSegmentSignature) {
    if (!messageState?.renderRetryState) {
      return;
    }

    const previousSignature = messageState.segmentSignature || "";
    const nextSignature = nextSegmentSignature || "";

    if (previousSignature && previousSignature === nextSignature) {
      return;
    }

    retryPolicy.resetRenderRetryState(messageState.renderRetryState);
  }

  function prepareForFreshTranslation(messageState) {
    if (!messageState?.renderRetryState) {
      return;
    }

    retryPolicy.resetRenderRetryState(messageState.renderRetryState);
  }

  const api = {
    syncRetryStateForSignature,
    prepareForFreshTranslation
  };

  scope.FastTrMailRetryStateGuard = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
