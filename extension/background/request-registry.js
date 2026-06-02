(function initRequestRegistry(scope) {
  function createRequestRegistry() {
    const activeRequests = new Map();

    return {
      register(requestId) {
        if (!requestId) {
          throw new Error("Request id is required.");
        }

        this.finalize(requestId);

        const controller = new AbortController();
        const entry = {
          requestId,
          controller,
          signal: controller.signal
        };

        activeRequests.set(requestId, entry);
        return entry;
      },

      get(requestId) {
        return activeRequests.get(requestId) || null;
      },

      has(requestId) {
        return activeRequests.has(requestId);
      },

      cancel(requestId) {
        const entry = activeRequests.get(requestId);
        if (!entry) {
          return false;
        }

        entry.controller.abort();
        return true;
      },

      finalize(requestId) {
        return activeRequests.delete(requestId);
      }
    };
  }

  const api = { createRequestRegistry };
  scope.FastTrMailRequestRegistry = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
