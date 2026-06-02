(() => {
  const app = globalThis.FastTrMailContent;
  const { normalizeTranslationText, summarizeText } = app.utils;
  const { resetRenderRetryState, registerRenderRetryAttempt } = app.retryPolicy;
  const { syncRetryStateForSignature, prepareForFreshTranslation } = globalThis.FastTrMailRetryStateGuard;

  async function refreshThread(threadRoot, threadState) {
    if (!(threadRoot instanceof HTMLElement) || !threadRoot.isConnected) {
      app.debug.log("translation", "skip-refresh-thread", {
        reason: "thread-root-disconnected",
        thread: app.thread.describeThread(threadRoot, threadState)
      });
      return;
    }

    if (threadState.processing) {
      threadState.pendingRefresh = true;
      app.debug.log("translation", "skip-refresh-thread", {
        reason: "thread-state-processing",
        thread: app.thread.describeThread(threadRoot, threadState)
      });
      return;
    }

    threadState.processing = true;
    threadState.uiLocale = await app.i18n.refreshLocale();
    const runToken = app.runtime.beginThreadRun(threadState);
    app.debug.log("translation", "refresh-thread-start", {
      runToken,
      thread: app.thread.describeThread(threadRoot, threadState)
    });

    try {
      app.thread.syncThreadButtons(threadRoot, threadState.active);

      const descriptors = app.thread.collectMessageDescriptors(threadRoot, threadState);
      app.thread.reconcileMessageStates(threadState, descriptors);

      if (!app.runtime.isRunCurrent(threadState, runToken)) {
        app.debug.log("translation", "refresh-thread-abort", {
          reason: "run-token-stale-before-processing",
          runToken,
          thread: app.thread.describeThread(threadRoot, threadState)
        });
        return;
      }

      processThreadTitle(threadRoot, threadState, runToken);
      await processActiveThread(threadRoot, threadState, descriptors, runToken);
    } finally {
      threadState.processing = false;
      app.debug.log("translation", "refresh-thread-finish", {
        runToken,
        pendingRefresh: threadState.pendingRefresh,
        active: threadState.active,
        cancelled: threadState.cancelled,
        thread: app.thread.describeThread(threadRoot, threadState)
      });

      if (threadState.pendingRefresh && threadState.active && !threadState.cancelled) {
        const delayMs = threadState.pendingRefreshDelayMs || 0;
        threadState.pendingRefresh = false;
        threadState.pendingRefreshDelayMs = 0;
        app.controller.scheduleThreadRefresh(threadRoot, { delayMs });
      }
    }
  }

  function processThreadTitle(threadRoot, threadState, runToken) {
    const titleState = threadState.title;
    const titleElement = app.thread.findTitleElement(threadRoot);
    const titleText = normalizeTranslationText(titleElement?.textContent || "");

    if (!(titleElement instanceof HTMLElement) || !titleText || !app.segments.hasTranslatableText(titleText)) {
      threadState.title = app.runtime.createTitleState();
      app.render.clearTitleTranslation(threadRoot);
      app.debug.log("translation", "skip-thread-title", {
        reason: "title-not-translatable",
        titlePreview: summarizeText(titleText)
      });
      return;
    }

    if (titleState.sourceText === titleText && titleState.status === "done" && titleState.translatedText) {
      if (app.runtime.isRunCurrent(threadState, runToken)) {
        app.render.renderTitleTranslation(threadRoot, titleElement, titleState.translatedText, "done");
      }
      return;
    }

    if (titleState.sourceText === titleText && titleState.status === "translating") {
      if (app.runtime.isRunCurrent(threadState, runToken)) {
        app.render.renderTitleTranslation(threadRoot, titleElement, app.i18n.t("content.loading", null, threadState.uiLocale), "loading");
      }
      return;
    }

    const requestId = titleState.requestId + 1;
    titleState.sourceText = titleText;
    titleState.translatedText = "";
    titleState.status = "translating";
    titleState.error = "";
    titleState.requestId = requestId;

    if (app.runtime.isRunCurrent(threadState, runToken)) {
      app.render.renderTitleTranslation(threadRoot, titleElement, app.i18n.t("content.loading", null, threadState.uiLocale), "loading");
    }

    app.debug.log("translation", "translate-thread-title-start", {
      requestId,
      titlePreview: summarizeText(titleText),
      thread: app.thread.describeThread(threadRoot, threadState)
    });
    void translateThreadTitle(threadRoot, threadState, runToken, requestId, titleText);
  }

  async function translateThreadTitle(threadRoot, threadState, runToken, requestId, titleText) {
    const backgroundRequestId = `title:${threadState.key}:${runToken.runId}:${requestId}`;
    app.runtime.trackThreadRequest(threadState, backgroundRequestId);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "translate-email",
        requestId: backgroundRequestId,
        segments: [titleText]
      });

      if (!response?.ok) {
        throw new Error(app.i18n.resolveErrorMessage(response, threadState.uiLocale));
      }

      const translatedTitle = Array.isArray(response.result?.translatedSegments)
        ? response.result.translatedSegments[0]
        : "";

      if (!translatedTitle) {
        throw new Error(app.i18n.t("content.titleTranslationEmpty", null, threadState.uiLocale));
      }

      if (!isTitleRequestCurrent(threadState, requestId, titleText)) {
        return;
      }

      threadState.title.translatedText = translatedTitle;
      threadState.title.status = "done";
      threadState.title.error = "";

      if (!app.runtime.isRunCurrent(threadState, runToken)) {
        return;
      }

      const liveTitleElement = app.thread.findTitleElement(threadRoot);
      if (liveTitleElement instanceof HTMLElement) {
        app.render.renderTitleTranslation(threadRoot, liveTitleElement, translatedTitle, "done");
      }
      app.debug.log("translation", "translate-thread-title-success", {
        requestId,
        titlePreview: summarizeText(titleText),
        translatedPreview: summarizeText(translatedTitle)
      });
    } catch (error) {
      if (!isTitleRequestCurrent(threadState, requestId, titleText)) {
        return;
      }

      const message = error instanceof Error && error.message
        ? error.message
        : app.i18n.t("content.titleTranslationFailed", null, threadState.uiLocale);
      threadState.title.translatedText = "";
      threadState.title.status = "error";
      threadState.title.error = message;

      if (!app.runtime.isRunCurrent(threadState, runToken)) {
        return;
      }

      const liveTitleElement = app.thread.findTitleElement(threadRoot);
      if (liveTitleElement instanceof HTMLElement) {
        app.render.renderTitleTranslation(threadRoot, liveTitleElement, message, "error");
      }
      app.debug.log("translation", "translate-thread-title-error", {
        requestId,
        titlePreview: summarizeText(titleText),
        error: message
      });
    } finally {
      app.runtime.releaseThreadRequest(threadState, backgroundRequestId);
    }
  }

  function isTitleRequestCurrent(threadState, requestId, titleText) {
    return threadState.title.requestId === requestId && threadState.title.sourceText === titleText;
  }

  async function processActiveThread(threadRoot, threadState, descriptors, runToken) {
    const translationQueue = [];

    for (const descriptor of descriptors) {
      if (!app.runtime.isRunCurrent(threadState, runToken)) {
        return;
      }

      const messageState = descriptor.state;
      const bodyElement = descriptor.body;
      const contentRoot = descriptor.contentRoot || bodyElement;
      app.render.clearMessageStatus(descriptor);

      if (!bodyElement) {
        if (app.thread.isMessageBodyDeferred(descriptor)) {
          messageState.status = "pending-body";
          messageState.error = "";
          continue;
        }

        messageState.status = "pending-body";
        messageState.error = app.i18n.t("content.bodyNotFound", null, threadState.uiLocale);
        app.render.renderMessageStatus(descriptor, messageState.error, "error");
        continue;
      }

      const segments = app.segments.collectTranslatableSegments(contentRoot);
      if (segments.length === 0) {
        messageState.status = "no-segments";
        messageState.error = app.i18n.t("content.noSegments", null, threadState.uiLocale);
        app.render.renderMessageStatus(descriptor, messageState.error, "error");
        continue;
      }

      const segmentSignature = app.segments.getSegmentSignature(segments);
      descriptor.segments = segments;
      descriptor.segmentSignature = segmentSignature;

      syncRetryStateForSignature(messageState, segmentSignature);

      if (
        Array.isArray(messageState.translatedSegments) &&
        messageState.translatedSegments.length === segments.length &&
        messageState.segmentSignature === segmentSignature
      ) {
        const renderResult = applyCachedTranslation(bodyElement, segments, messageState.translatedSegments);
        messageState.status = renderResult.ok ? "translated" : "render-pending";
        messageState.error = renderResult.ok ? "" : "cached-render-failed";

        if (!renderResult.ok) {
          requestThreadRetry(threadRoot, threadState, descriptor);
        }
        continue;
      }

      if (messageState.status === "translating") {
        continue;
      }

      translationQueue.push(descriptor);
    }

    for (const descriptor of translationQueue) {
      if (!app.runtime.isRunCurrent(threadState, runToken)) {
        break;
      }

      await translateMessageDescriptor(threadRoot, threadState, descriptor, runToken);
    }
  }

  function applyCachedTranslation(bodyElement, segments, translatedSegments) {
    return app.render.renderTranslatedSegments(segments, translatedSegments);
  }

  async function translateMessageDescriptor(threadRoot, threadState, descriptor, runToken) {
    const messageState = descriptor.state;
    const bodyElement = descriptor.body;
    const contentRoot = descriptor.contentRoot || bodyElement;
    const segments = descriptor.segments || [];

    if (
      !(bodyElement instanceof HTMLElement) ||
      !(contentRoot instanceof HTMLElement) ||
      segments.length === 0 ||
      !app.runtime.isRunCurrent(threadState, runToken)
    ) {
      return;
    }

    const renderElements = resolveRenderableMessageElements(threadRoot, threadState, descriptor);
    if (!(renderElements.body instanceof HTMLElement)) {
      messageState.status = "pending-body";
      requestThreadRetry(threadRoot, threadState, descriptor);
      return;
    }

    messageState.status = "translating";
    messageState.error = "";
    prepareForFreshTranslation(messageState);
    app.render.clearMessageStatus(descriptor);
    app.render.removeInlineTranslations(renderElements.body);
    app.debug.log("translation", "translate-message-start", {
      messageKey: descriptor.key,
      segmentCount: segments.length,
      bodyConnected: renderElements.body.isConnected
    });

    const loadingRenderResult = app.render.renderLoadingTranslations(segments);
    if (!loadingRenderResult.ok) {
      requestThreadRetry(threadRoot, threadState, descriptor);
    }

    const requestSerial = messageState.requestSerial + 1;
    const backgroundRequestId = `message:${descriptor.key}:${runToken.runId}:${requestSerial}`;

    try {
      messageState.requestSerial = requestSerial;
      app.runtime.trackThreadRequest(threadState, backgroundRequestId);
      const response = await chrome.runtime.sendMessage({
        type: "translate-email",
        requestId: backgroundRequestId,
        segments: segments.map((segment) => segment.text)
      });

      if (!response?.ok) {
        throw new Error(app.i18n.resolveErrorMessage(response, threadState.uiLocale));
      }

      const translatedSegments = Array.isArray(response.result?.translatedSegments)
        ? response.result.translatedSegments
        : [];

      if (translatedSegments.length !== segments.length) {
        throw new Error(app.i18n.t("content.segmentCountMismatch", null, threadState.uiLocale));
      }

      if (!app.runtime.isRunCurrent(threadState, runToken)) {
        if (renderElements.body.isConnected) {
          app.render.removeInlineTranslations(renderElements.body);
        }
        app.debug.log("translation", "translate-message-abort", {
          reason: "run-token-stale-after-response",
          messageKey: descriptor.key
        });
        return;
      }

      messageState.segmentSignature = descriptor.segmentSignature || "";
      messageState.translatedSegments = translatedSegments;
      messageState.status = "translated";

      const liveElements = resolveRenderableMessageElements(threadRoot, threadState, descriptor);
      const liveBodyElement = liveElements.body;
      const liveContentRoot = liveElements.contentRoot;

      if (!(liveBodyElement instanceof HTMLElement) && descriptor.messageNode instanceof HTMLElement) {
        requestThreadRetry(threadRoot, threadState, descriptor);
        return;
      }

      if (!(liveBodyElement instanceof HTMLElement) || !(liveContentRoot instanceof HTMLElement)) {
        requestThreadRetry(threadRoot, threadState, descriptor);
        return;
      }

      const liveSegments = app.segments.collectTranslatableSegments(liveContentRoot);
      if (liveSegments.length === translatedSegments.length) {
        const liveSignature = app.segments.getSegmentSignature(liveSegments);
        if (liveSignature === messageState.segmentSignature) {
          const renderResult = app.render.renderTranslatedSegments(liveSegments, translatedSegments);
          if (renderResult.ok) {
            messageState.status = "translated";
            messageState.error = "";
            resetRenderRetryState(messageState.renderRetryState);
            app.render.clearMessageStatus(descriptor);
            app.debug.log("translation", "translate-message-success", {
              messageKey: descriptor.key,
              segmentCount: translatedSegments.length
            });
            return;
          }

          messageState.status = "render-pending";
          messageState.error = "render-failed";
          requestThreadRetry(threadRoot, threadState, descriptor);
          return;
        }
      }

      messageState.status = "render-pending";
      messageState.error = app.i18n.t("content.pendingBody", null, threadState.uiLocale);
      requestThreadRetry(threadRoot, threadState, descriptor);
    } catch (error) {
      messageState.status = "error";
      messageState.error = error instanceof Error && error.message
        ? error.message
        : app.i18n.getErrorMessage(app.i18n.runtime.ERROR_CODES.TRANSLATION_REQUEST_FAILED, threadState.uiLocale);

      const liveBodyElement = resolveRenderableMessageElements(threadRoot, threadState, descriptor).body
        || renderElements.body;

      if (app.runtime.isRunCurrent(threadState, runToken) && liveBodyElement instanceof HTMLElement && liveBodyElement.isConnected) {
        app.render.removeInlineTranslations(liveBodyElement);
        const errorRenderResult = app.render.renderSegmentError(segments, messageState.error);
        if (!errorRenderResult.ok) {
          app.render.renderMessageStatus(descriptor, messageState.error, "error");
          requestThreadRetry(threadRoot, threadState, descriptor);
        }
      }
      app.debug.log("translation", "translate-message-error", {
        messageKey: descriptor.key,
        error: messageState.error
      });
    } finally {
      app.runtime.releaseThreadRequest(threadState, backgroundRequestId);
    }
  }

  function requestThreadRetry(threadRoot, threadState, descriptor) {
    const messageState = descriptor?.state;
    if (!messageState) {
      return;
    }

    const retryDecision = registerRenderRetryAttempt(messageState.renderRetryState);
    if (!retryDecision.shouldRetry) {
      messageState.status = "error";
      messageState.error = app.i18n.t(retryDecision.messageKey, null, threadState.uiLocale);
      app.render.renderMessageStatus(descriptor, messageState.error, "error");
      return;
    }

    threadState.pendingRefresh = true;
    threadState.pendingRefreshDelayMs = Math.max(
      threadState.pendingRefreshDelayMs || 0,
      retryDecision.delayMs
    );
    messageState.status = "render-pending";
    messageState.error = app.i18n.t("content.pendingBody", null, threadState.uiLocale);
    app.render.renderMessageStatus(descriptor, messageState.error, "info");
  }

  function clearThreadTranslations(threadRoot) {
    app.debug.log("translation", "clear-thread-translations", {
      thread: app.thread.describeThread(threadRoot),
      renderArtifacts: app.render.getThreadRenderArtifactCounts(threadRoot)
    });
    app.render.clearThreadRenderArtifacts(threadRoot);
    app.thread.clearThreadDomState(threadRoot);
  }

  function resolveRenderableMessageElements(threadRoot, threadState, descriptor) {
    const liveElements = app.thread.findLiveMessageElements(threadRoot, threadState, descriptor);
    if (liveElements.body instanceof HTMLElement && liveElements.body.isConnected) {
      return liveElements;
    }

    const body = descriptor.body instanceof HTMLElement && descriptor.body.isConnected
      ? descriptor.body
      : null;
    const contentRoot = descriptor.contentRoot instanceof HTMLElement && descriptor.contentRoot.isConnected
      ? descriptor.contentRoot
      : body;

    return { body, contentRoot };
  }

  app.translation = {
    refreshThread,
    processThreadTitle,
    processActiveThread,
    applyCachedTranslation,
    translateMessageDescriptor,
    clearThreadTranslations,
    resolveRenderableMessageElements
  };
})();
