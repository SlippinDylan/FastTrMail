(() => {
  const app = globalThis.FastTrMailContent;
  const {
    INLINE_TRANSLATION_CLASS,
    MESSAGE_STATUS_CLASS,
    SEGMENT_ANCHOR_CLASS,
    TRANSLATION_WRAPPER_CLASS,
    TITLE_TRANSLATION_CLASS
  } = app.constants;
  const { getPageKey, withObserverMuted } = app.utils;

  function getDocumentGeneration() {
    return app.state.documentGeneration;
  }

  function createTitleState() {
    return {
      sourceText: "",
      translatedText: "",
      status: "idle",
      error: "",
      requestId: 0
    };
  }

  function createThreadState(key) {
    return {
      key,
      active: false,
      cancelled: false,
      generation: getDocumentGeneration(),
      runId: 0,
      messages: new Map(),
      refreshTimer: 0,
      processing: false,
      pendingRefresh: false,
      pendingRefreshDelayMs: 0,
      pendingRequestIds: new Set(),
      title: createTitleState()
    };
  }

  function createMessageState({ key, identity, instanceId }) {
    return {
      key,
      identity,
      instanceId,
      status: "idle",
      segmentSignature: "",
      translatedSegments: null,
      requestSerial: 0,
      renderRetryState: app.retryPolicy.createRenderRetryState(),
      error: ""
    };
  }

  function clearRefreshTimer(threadState) {
    if (!threadState?.refreshTimer) {
      return;
    }

    window.clearTimeout(threadState.refreshTimer);
    threadState.refreshTimer = 0;
  }

  function activateThreadState(threadState) {
    if (!threadState) {
      return;
    }

    threadState.active = true;
    threadState.cancelled = false;
    threadState.generation = getDocumentGeneration();
    app.state.activeThreadStates.add(threadState);
    app.debug.log("runtime", "activate-thread-state", {
      key: threadState.key,
      generation: threadState.generation,
      runId: threadState.runId
    });
  }

  function isThreadStateCurrent(threadState) {
    if (!threadState) {
      return false;
    }

    return threadState.generation === getDocumentGeneration();
  }

  function deactivateThreadState(threadState) {
    if (!threadState) {
      return;
    }

    clearRefreshTimer(threadState);
    cancelPendingThreadRequests(threadState);
    threadState.active = false;
    threadState.cancelled = true;
    threadState.processing = false;
    threadState.pendingRefresh = false;
    threadState.pendingRefreshDelayMs = 0;
    threadState.runId += 1;
    app.state.activeThreadStates.delete(threadState);
    app.debug.log("runtime", "deactivate-thread-state", {
      key: threadState.key,
      generation: threadState.generation,
      runId: threadState.runId
    });

    if (threadState.title.status === "translating") {
      threadState.title.status = threadState.title.translatedText ? "done" : "idle";
      threadState.title.error = "";
    }

    for (const messageState of threadState.messages.values()) {
      if (messageState.status === "translating") {
        messageState.status = Array.isArray(messageState.translatedSegments) ? "translated" : "idle";
        messageState.error = "";
      }
    }
  }

  function trackThreadRequest(threadState, requestId) {
    if (!threadState || !requestId) {
      return;
    }

    threadState.pendingRequestIds.add(requestId);
  }

  function releaseThreadRequest(threadState, requestId) {
    if (!threadState || !requestId) {
      return;
    }

    threadState.pendingRequestIds.delete(requestId);
  }

  function cancelPendingThreadRequests(threadState) {
    if (!threadState?.pendingRequestIds || threadState.pendingRequestIds.size === 0) {
      return;
    }

    const requestIds = Array.from(threadState.pendingRequestIds);
    threadState.pendingRequestIds.clear();

    for (const requestId of requestIds) {
      try {
        void chrome.runtime.sendMessage({
          type: "cancel-translation",
          requestId
        });
      } catch (_error) {
      }
    }
  }

  function beginThreadRun(threadState) {
    activateThreadState(threadState);
    threadState.runId += 1;

    return {
      threadKey: threadState.key,
      generation: threadState.generation,
      runId: threadState.runId
    };
  }

  function isRunCurrent(threadState, runToken) {
    if (!threadState || !runToken) {
      return false;
    }

    return (
      threadState.active === true &&
      threadState.cancelled !== true &&
      threadState.generation === runToken.generation &&
      threadState.runId === runToken.runId &&
      app.state.currentLocationKey === getPageKey()
    );
  }

  function hasLocationChanged() {
    return app.state.currentLocationKey !== getPageKey();
  }

  function syncCurrentLocationKey() {
    const pageKey = getPageKey();
    app.state.currentLocationKey = pageKey;
    return pageKey;
  }

  function resetDocumentTranslationState() {
    syncCurrentLocationKey();
    app.state.documentGeneration += 1;

    for (const threadState of app.state.activeThreadStates) {
      deactivateThreadState(threadState);
    }

    app.state.activeThreadStates.clear();

    withObserverMuted(() => {
      document
        .querySelectorAll(
          `.${INLINE_TRANSLATION_CLASS}, .${SEGMENT_ANCHOR_CLASS}, .${MESSAGE_STATUS_CLASS}, .${TITLE_TRANSLATION_CLASS}, .${TRANSLATION_WRAPPER_CLASS}`
        )
        .forEach((node) => node.remove());
    });

    app.thread?.clearThreadDomState?.(document);
  }

  app.runtime = {
    getDocumentGeneration,
    createTitleState,
    createThreadState,
    createMessageState,
    clearRefreshTimer,
    activateThreadState,
    deactivateThreadState,
    trackThreadRequest,
    releaseThreadRequest,
    cancelPendingThreadRequests,
    isThreadStateCurrent,
    beginThreadRun,
    isRunCurrent,
    hasLocationChanged,
    syncCurrentLocationKey,
    resetDocumentTranslationState
  };
})();
