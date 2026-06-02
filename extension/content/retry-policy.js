(function initRetryPolicy(scope) {
  const RENDER_RETRY_DELAYS_MS = Object.freeze([120, 320, 800]);
  const TERMINAL_RENDER_ERROR_KEY = "content.renderRetryStopped";

  function createRenderRetryState() {
    return {
      attemptCount: 0,
      lastDelayMs: 0
    };
  }

  function registerRenderRetryAttempt(state) {
    if (!state || typeof state !== "object") {
      throw new Error("Retry state is required.");
    }

    const attemptIndex = state.attemptCount;
    if (attemptIndex >= RENDER_RETRY_DELAYS_MS.length) {
      return {
        shouldRetry: false,
        messageKey: TERMINAL_RENDER_ERROR_KEY,
        attemptCount: state.attemptCount
      };
    }

    const delayMs = RENDER_RETRY_DELAYS_MS[attemptIndex];
    state.attemptCount += 1;
    state.lastDelayMs = delayMs;

    return {
      shouldRetry: true,
      delayMs,
      attemptCount: state.attemptCount
    };
  }

  function resetRenderRetryState(state) {
    if (!state || typeof state !== "object") {
      return createRenderRetryState();
    }

    state.attemptCount = 0;
    state.lastDelayMs = 0;
    return state;
  }

  const api = {
    RENDER_RETRY_DELAYS_MS,
    TERMINAL_RENDER_ERROR_KEY,
    createRenderRetryState,
    registerRenderRetryAttempt,
    resetRenderRetryState
  };

  scope.FastTrMailRetryPolicy = api;

  if (scope.FastTrMailContent) {
    scope.FastTrMailContent.retryPolicy = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
