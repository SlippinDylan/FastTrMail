(() => {
  const app = globalThis.FastTrMailContent;
  const { normalizeTranslationText, summarizeText } = app.utils;

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
        threadState.pendingRefresh = false;
        app.controller.scheduleThreadRefresh(threadRoot, { immediate: true });
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
        app.render.renderTitleTranslation(threadRoot, titleElement, "翻译中…", "loading");
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
      app.render.renderTitleTranslation(threadRoot, titleElement, "翻译中…", "loading");
    }

    app.debug.log("translation", "translate-thread-title-start", {
      requestId,
      titlePreview: summarizeText(titleText),
      thread: app.thread.describeThread(threadRoot, threadState)
    });
    void translateThreadTitle(threadRoot, threadState, runToken, requestId, titleText);
  }

  async function translateThreadTitle(threadRoot, threadState, runToken, requestId, titleText) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "translate-email",
        segments: [titleText]
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Title translation failed.");
      }

      const translatedTitle = Array.isArray(response.result?.translatedSegments)
        ? response.result.translatedSegments[0]
        : "";

      if (!translatedTitle) {
        throw new Error("标题翻译结果为空。");
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

      const message = error instanceof Error ? error.message : "标题翻译失败。";
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
        messageState.error = "无法定位邮件正文。";
        app.render.renderMessageStatus(descriptor, messageState.error, "error");
        continue;
      }

      const segments = app.segments.collectTranslatableSegments(contentRoot);
      if (segments.length === 0) {
        messageState.status = "no-segments";
        messageState.error = "未找到可翻译内容。";
        app.render.renderMessageStatus(descriptor, messageState.error, "error");
        continue;
      }

      const segmentSignature = app.segments.getSegmentSignature(segments);
      descriptor.segments = segments;
      descriptor.segmentSignature = segmentSignature;

      if (
        Array.isArray(messageState.translatedSegments) &&
        messageState.translatedSegments.length === segments.length &&
        messageState.segmentSignature === segmentSignature
      ) {
        const renderResult = applyCachedTranslation(bodyElement, segments, messageState.translatedSegments);
        messageState.status = renderResult.ok ? "translated" : "render-pending";
        messageState.error = renderResult.ok ? "" : "cached-render-failed";

        if (!renderResult.ok) {
          requestThreadRetry(threadRoot, threadState);
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
      requestThreadRetry(threadRoot, threadState);
      return;
    }

    messageState.status = "translating";
    messageState.error = "";
    app.render.clearMessageStatus(descriptor);
    app.render.removeInlineTranslations(renderElements.body);
    app.debug.log("translation", "translate-message-start", {
      messageKey: descriptor.key,
      segmentCount: segments.length,
      bodyConnected: renderElements.body.isConnected
    });

    const loadingRenderResult = app.render.renderLoadingTranslations(segments);
    if (!loadingRenderResult.ok) {
      messageState.status = "render-pending";
      messageState.error = "正在等待页面稳定后重试渲染。";
      app.render.renderMessageStatus(descriptor, messageState.error, "info");
      threadState.pendingRefresh = true;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "translate-email",
        segments: segments.map((segment) => segment.text)
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Translation failed.");
      }

      const translatedSegments = Array.isArray(response.result?.translatedSegments)
        ? response.result.translatedSegments
        : [];

      if (translatedSegments.length !== segments.length) {
        throw new Error("分段翻译结果数量不匹配。");
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
        messageState.status = "render-pending";
        requestThreadRetry(threadRoot, threadState);
        return;
      }

      if (!(liveBodyElement instanceof HTMLElement) || !(liveContentRoot instanceof HTMLElement)) {
        messageState.status = "render-pending";
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
            app.render.clearMessageStatus(descriptor);
            app.debug.log("translation", "translate-message-success", {
              messageKey: descriptor.key,
              segmentCount: translatedSegments.length
            });
            return;
          }

          messageState.status = "render-pending";
          messageState.error = "render-failed";
          app.render.renderMessageStatus(descriptor, "页面正在更新，翻译结果将自动重试。", "info");
          requestThreadRetry(threadRoot, threadState, false);
          return;
        }
      }

      messageState.status = "render-pending";
      messageState.error = "页面正在更新，翻译结果将自动重试。";
      app.render.renderMessageStatus(descriptor, messageState.error, "info");
      requestThreadRetry(threadRoot, threadState);
    } catch (error) {
      messageState.status = "error";
      messageState.error = error instanceof Error ? error.message : "Unknown error";

      const liveBodyElement = resolveRenderableMessageElements(threadRoot, threadState, descriptor).body
        || renderElements.body;

      if (app.runtime.isRunCurrent(threadState, runToken) && liveBodyElement instanceof HTMLElement && liveBodyElement.isConnected) {
        app.render.removeInlineTranslations(liveBodyElement);
        const errorRenderResult = app.render.renderSegmentError(segments, messageState.error);
        if (!errorRenderResult.ok) {
          app.render.renderMessageStatus(descriptor, messageState.error, "error");
          requestThreadRetry(threadRoot, threadState, false);
        }
      }
      app.debug.log("translation", "translate-message-error", {
        messageKey: descriptor.key,
        error: messageState.error
      });
    }
  }

  function requestThreadRetry(threadRoot, threadState, scheduleImmediately = true) {
    threadState.pendingRefresh = true;

    if (scheduleImmediately) {
      app.controller.scheduleThreadRefresh(threadRoot, { immediate: true });
    }
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
