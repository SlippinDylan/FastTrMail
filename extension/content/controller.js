(() => {
  const app = globalThis.FastTrMailContent;
  const {
    BUTTON_CLASS,
    INLINE_TRANSLATION_CLASS,
    MESSAGE_STATUS_CLASS,
    TITLE_TRANSLATION_CLASS,
    SEGMENT_ANCHOR_CLASS,
    TRANSLATION_WRAPPER_CLASS
  } = app.constants;

  function initialize() {
    app.thread.injectButtons(document, onTranslateClick);

    const observer = new MutationObserver((mutations) => {
      if (app.state.observerMuteDepth > 0) {
        return;
      }

      if (app.runtime.hasLocationChanged()) {
        scheduleDocumentRefresh();
        return;
      }

      const affectedThreadRoots = collectAffectedThreadRoots(mutations);

      if (affectedThreadRoots.size > 0) {
        scheduleObservedThreadRefresh(affectedThreadRoots);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-hidden"]
    });
  }

  function scheduleDocumentRefresh() {
    if (app.state.documentRefreshScheduled) {
      return;
    }

    app.state.documentRefreshScheduled = true;
    window.setTimeout(() => {
      app.state.documentRefreshScheduled = false;

      if (app.runtime.hasLocationChanged()) {
        app.runtime.resetDocumentTranslationState();
      }

      clearObservedThreadRefreshQueue();
      app.thread.injectButtons(document, onTranslateClick);
      app.thread.pruneDetachedThreadStates();
    }, 0);
  }

  function scheduleObservedThreadRefresh(threadRoots) {
    for (const threadRoot of threadRoots) {
      if (threadRoot instanceof HTMLElement) {
        app.state.observedThreadRoots.add(threadRoot);
      }
    }

    if (app.state.observedThreadFlushTimer) {
      return;
    }

    app.state.observedThreadFlushTimer = window.setTimeout(() => {
      const roots = Array.from(app.state.observedThreadRoots);
      clearObservedThreadRefreshQueue();

      if (app.runtime.hasLocationChanged()) {
        scheduleDocumentRefresh();
        return;
      }

      app.thread.pruneDetachedThreadStates();

      for (const threadRoot of roots) {
        if (!(threadRoot instanceof HTMLElement) || !threadRoot.isConnected) {
          continue;
        }

        app.thread.injectButtons(threadRoot, onTranslateClick);

        const state = app.thread.getExistingThreadState(threadRoot);
        if (state?.active) {
          scheduleThreadRefresh(threadRoot, { immediate: true });
        }
      }
    }, 0);
  }

  function clearObservedThreadRefreshQueue() {
    if (app.state.observedThreadFlushTimer) {
      window.clearTimeout(app.state.observedThreadFlushTimer);
      app.state.observedThreadFlushTimer = 0;
    }

    app.state.observedThreadRoots.clear();
  }

  async function onTranslateClick(event) {
    const button = event.currentTarget;
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const threadRoot = app.thread.findThreadRoot(button);
    if (!threadRoot) {
      return;
    }

    const threadState = app.thread.getExistingThreadState(threadRoot);
    const shouldRestoreOriginal = threadState?.active === true || app.render.hasThreadRenderArtifacts(threadRoot);
    app.debug.log("controller", "translate-button-click", {
      buttonTitle: button.getAttribute("title") || "",
      buttonActiveClass: button.classList.contains(app.constants.BUTTON_ACTIVE_CLASS),
      shouldRestoreOriginal,
      thread: app.thread.describeThread(threadRoot, threadState),
      renderArtifacts: app.render.getThreadRenderArtifactCounts(threadRoot)
    });

    if (shouldRestoreOriginal) {
      app.thread.resetThreadState(threadRoot);
      app.thread.syncThreadButtons(threadRoot, false);
      app.translation.clearThreadTranslations(threadRoot);
      app.debug.log("controller", "restore-original-complete", {
        thread: app.thread.describeThread(threadRoot),
        renderArtifacts: app.render.getThreadRenderArtifactCounts(threadRoot)
      });
      return;
    }

    const nextThreadState = app.thread.ensureThreadState(threadRoot);
    app.runtime.activateThreadState(nextThreadState);
    app.thread.syncThreadButtons(threadRoot, true);
    app.debug.log("controller", "activate-translation", {
      thread: app.thread.describeThread(threadRoot, nextThreadState),
      renderArtifacts: app.render.getThreadRenderArtifactCounts(threadRoot)
    });
    scheduleThreadRefresh(threadRoot, { immediate: true });
  }

  function scheduleThreadRefresh(threadRoot, { immediate = false } = {}) {
    if (!(threadRoot instanceof HTMLElement)) {
      return;
    }

    const state = app.thread.getExistingThreadState(threadRoot);
    if (!state?.active) {
      app.debug.log("controller", "skip-thread-refresh", {
        reason: "inactive-or-missing-state",
        thread: app.thread.describeThread(threadRoot, state)
      });
      return;
    }

    if (state.processing) {
      state.pendingRefresh = true;
      app.debug.log("controller", "defer-thread-refresh", {
        reason: "state-processing",
        thread: app.thread.describeThread(threadRoot, state)
      });
      return;
    }

    if (state.refreshTimer) {
      app.debug.log("controller", "skip-thread-refresh", {
        reason: "refresh-already-scheduled",
        thread: app.thread.describeThread(threadRoot, state)
      });
      return;
    }

    const delay = immediate ? 0 : 80;
    app.debug.log("controller", "schedule-thread-refresh", {
      delay,
      thread: app.thread.describeThread(threadRoot, state)
    });
    state.refreshTimer = window.setTimeout(() => {
      state.refreshTimer = 0;
      app.debug.log("controller", "run-thread-refresh", {
        thread: app.thread.describeThread(threadRoot, state)
      });
      void app.translation.refreshThread(threadRoot, state);
    }, delay);
  }

  function isInternalMutation(mutation) {
    const nodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || [])
    ];

    if (mutation.type === "attributes") {
      return isInternalNode(mutation.target);
    }

    return nodes.length > 0 && nodes.every((node) => isInternalNode(node));
  }

  function collectAffectedThreadRoots(mutations) {
    const affectedThreadRoots = new Set();

    for (const mutation of mutations) {
      if (isInternalMutation(mutation)) {
        continue;
      }

      if (mutation.type === "attributes") {
        if (shouldReactToAttributeMutation(mutation.target)) {
          addAffectedThreadRootsFromNode(mutation.target, affectedThreadRoots);
        }
        continue;
      }

      addAffectedThreadRootsFromNode(mutation.target, affectedThreadRoots);

      for (const node of mutation.addedNodes || []) {
        addAffectedThreadRootsFromNode(node, affectedThreadRoots);
      }

      for (const node of mutation.removedNodes || []) {
        addAffectedThreadRootsFromNode(node, affectedThreadRoots);
      }
    }

    return affectedThreadRoots;
  }

  function addAffectedThreadRootsFromNode(node, affectedThreadRoots) {
    if (!(node instanceof HTMLElement) || isInternalNode(node)) {
      return;
    }

    const directThreadRoot = node.matches(".v-Thread")
      ? node
      : node.closest(".v-Thread");

    if (directThreadRoot instanceof HTMLElement) {
      affectedThreadRoots.add(directThreadRoot);
    }

    node.querySelectorAll(".v-Thread").forEach((threadRoot) => {
      if (threadRoot instanceof HTMLElement) {
        affectedThreadRoots.add(threadRoot);
      }
    });
  }

  function isInternalNode(node) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    return (
      node.classList.contains(BUTTON_CLASS) ||
      node.classList.contains(SEGMENT_ANCHOR_CLASS) ||
      node.classList.contains(TRANSLATION_WRAPPER_CLASS) ||
      node.classList.contains(INLINE_TRANSLATION_CLASS) ||
      node.classList.contains(TITLE_TRANSLATION_CLASS) ||
      node.classList.contains(MESSAGE_STATUS_CLASS) ||
      node.closest?.(`.${TRANSLATION_WRAPPER_CLASS}`) !== null ||
      node.closest?.(`.${INLINE_TRANSLATION_CLASS}`) !== null ||
      node.closest?.(`.${TITLE_TRANSLATION_CLASS}`) !== null ||
      node.closest?.(`.${MESSAGE_STATUS_CLASS}`) !== null ||
      node.closest?.(`.${SEGMENT_ANCHOR_CLASS}`) !== null
    );
  }

  function shouldReactToAttributeMutation(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (
      target.closest(`.${INLINE_TRANSLATION_CLASS}`) ||
      target.closest(`.${TITLE_TRANSLATION_CLASS}`) ||
      target.closest(`.${MESSAGE_STATUS_CLASS}`) ||
      target.classList.contains(BUTTON_CLASS)
    ) {
      return false;
    }

    return Boolean(
      target.closest(".v-Message") ||
      target.closest(".v-MessageCard") ||
      target.closest(".v-Thread")
    );
  }

  app.controller = {
    initialize,
    scheduleDocumentRefresh,
    scheduleObservedThreadRefresh,
    onTranslateClick,
    scheduleThreadRefresh,
    isInternalMutation,
    collectAffectedThreadRoots,
    isInternalNode,
    shouldReactToAttributeMutation
  };
})();
