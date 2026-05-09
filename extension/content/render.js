(() => {
  const app = globalThis.FastTrMailContent;
  const {
    INLINE_TRANSLATION_CLASS,
    MESSAGE_STATUS_CLASS,
    TITLE_TRANSLATION_CLASS,
    SEGMENT_ANCHOR_CLASS,
    TRANSLATION_WRAPPER_CLASS,
    SEGMENT_ATTRIBUTE
  } = app.constants;
  const {
    getLuminance,
    normalizeTranslationText,
    parseColor,
    summarizeText,
    withObserverMuted
  } = app.utils;
  const {
    ensureSegmentAnchor,
    getExistingSegmentAnchor
  } = app.segments;

  function removeInlineTranslations(bodyElement) {
    withObserverMuted(() => {
      bodyElement
        .querySelectorAll(`.${INLINE_TRANSLATION_CLASS}, .${SEGMENT_ANCHOR_CLASS}, .${TRANSLATION_WRAPPER_CLASS}`)
        .forEach((node) => node.remove());
    });
  }

  function clearThreadRenderArtifacts(threadRoot) {
    if (!(threadRoot instanceof HTMLElement)) {
      return;
    }

    const before = getThreadRenderArtifactCounts(threadRoot);
    withObserverMuted(() => {
      threadRoot
        .querySelectorAll(`.${INLINE_TRANSLATION_CLASS}, .${SEGMENT_ANCHOR_CLASS}, .${MESSAGE_STATUS_CLASS}, .${TITLE_TRANSLATION_CLASS}, .${TRANSLATION_WRAPPER_CLASS}`)
        .forEach((node) => node.remove());
    });
    const after = getThreadRenderArtifactCounts(threadRoot);
    app.debug.log("render", "clear-thread-render-artifacts", { before, after });
  }

  function hasThreadRenderArtifacts(threadRoot) {
    if (!(threadRoot instanceof HTMLElement)) {
      return false;
    }

    return threadRoot.querySelector(
      `.${INLINE_TRANSLATION_CLASS}, .${SEGMENT_ANCHOR_CLASS}, .${MESSAGE_STATUS_CLASS}, .${TITLE_TRANSLATION_CLASS}, .${TRANSLATION_WRAPPER_CLASS}`
    ) !== null;
  }

  function getThreadRenderArtifactCounts(threadRoot) {
    if (!(threadRoot instanceof HTMLElement)) {
      return {
        inlineTranslations: 0,
        titleTranslations: 0,
        messageStatuses: 0,
        segmentAnchors: 0,
        translationWrappers: 0
      };
    }

    return {
      inlineTranslations: threadRoot.querySelectorAll(`.${INLINE_TRANSLATION_CLASS}`).length,
      titleTranslations: threadRoot.querySelectorAll(`.${TITLE_TRANSLATION_CLASS}`).length,
      messageStatuses: threadRoot.querySelectorAll(`.${MESSAGE_STATUS_CLASS}`).length,
      segmentAnchors: threadRoot.querySelectorAll(`.${SEGMENT_ANCHOR_CLASS}`).length,
      translationWrappers: threadRoot.querySelectorAll(`.${TRANSLATION_WRAPPER_CLASS}`).length
    };
  }

  function clearTitleTranslation(threadRoot) {
    const titleNode = findTitleTranslationNode(threadRoot);
    if (!titleNode) {
      return;
    }

    withObserverMuted(() => {
      titleNode.remove();
    });
  }

  function renderTitleTranslation(threadRoot, sourceElement, content, state = "done") {
    if (!(threadRoot instanceof HTMLElement) || !(sourceElement instanceof HTMLElement)) {
      return false;
    }

    const normalizedContent = normalizeTranslationText(content);
    const existingNode = findTitleTranslationNode(threadRoot);
    if (existingNode) {
      const didUpdate = setTitleTranslationState(existingNode, {
        state,
        content: normalizedContent,
        sourceElement
      });
      if (didUpdate) {
        app.debug.log("render", "render-title-translation", {
          state,
          contentPreview: summarizeText(normalizedContent),
          connected: existingNode.isConnected,
          reused: true
        });
      }
      return didUpdate;
    }

    const node = document.createElement("div");
    node.className = TITLE_TRANSLATION_CLASS;
    node.dataset.state = state;
    node.innerHTML = '<div class="fmt-title-translation-content"></div>';
    const didInitialize = setTitleTranslationState(node, {
      state,
      content: normalizedContent,
      sourceElement
    });
    if (!didInitialize) {
      return false;
    }

    withObserverMuted(() => {
      sourceElement.insertAdjacentElement("afterend", node);
    });

    app.debug.log("render", "render-title-translation", {
      state,
      contentPreview: summarizeText(normalizedContent),
      connected: node.isConnected,
      reused: false
    });

    return node.isConnected;
  }

  function clearMessageStatus(descriptor) {
    const statusNode = findMessageStatusNode(descriptor);
    if (!statusNode) {
      return;
    }

    withObserverMuted(() => {
      statusNode.remove();
    });
  }

  function renderMessageStatus(descriptor, message, state = "info") {
    clearMessageStatus(descriptor);

    const mountTarget = getMessageStatusMountTarget(descriptor);
    if (!(mountTarget instanceof HTMLElement)) {
      return false;
    }

    const node = document.createElement("div");
    node.className = MESSAGE_STATUS_CLASS;
    node.dataset.state = state;
    node.dataset.messageKey = descriptor.key || "";
    node.textContent = normalizeTranslationText(message);

    node.style.marginTop = "8px";
    node.style.padding = "8px 10px";
    node.style.borderRadius = "8px";
    node.style.fontSize = "13px";
    node.style.lineHeight = "1.45";

    if (state === "error") {
      node.style.color = "#c94b5b";
      node.style.backgroundColor = "rgba(255, 122, 122, 0.08)";
    } else {
      node.style.color = "#76859c";
      node.style.backgroundColor = "rgba(170, 182, 200, 0.10)";
    }

    withObserverMuted(() => {
      if (mountTarget.matches(".v-Message-body, .u-containSelection, .u-article, article, pre")) {
        mountTarget.insertAdjacentElement("afterbegin", node);
        return;
      }

      mountTarget.insertAdjacentElement("afterend", node);
    });

    return node.isConnected;
  }

  function renderLoadingTranslations(segments) {
    const result = createRenderResult(segments.length);

    for (const segment of segments) {
      let translationNode = findInlineTranslationNode(segment);
      if (!translationNode) {
        translationNode = insertTranslationNode(segment, {
          state: "loading",
          content: "翻译中…"
        });
      }

      if (!translationNode) {
        result.ok = false;
        result.failedSegments.push({
          segmentId: segment.id,
          reason: "insert-failed"
        });
        continue;
      }

      const didUpdate = setInlineTranslationState(translationNode, {
        state: "loading",
        content: "翻译中…",
        sourceElement: getSegmentSourceElement(segment)
      });

      if (!didUpdate) {
        result.ok = false;
        result.failedSegments.push({
          segmentId: segment.id,
          reason: "update-failed"
        });
        continue;
      }

      result.renderedCount += 1;
    }

    return result;
  }

  function renderTranslatedSegments(segments, translatedSegments) {
    const result = createRenderResult(segments.length);

    segments.forEach((segment, index) => {
      let translationNode = findInlineTranslationNode(segment);
      if (!translationNode) {
        translationNode = insertTranslationNode(segment, {
          state: "done",
          content: translatedSegments[index]
        });
      }

      if (!translationNode) {
        result.ok = false;
        result.failedSegments.push({
          segmentId: segment.id,
          reason: "insert-failed"
        });
        return;
      }

      const didUpdate = setInlineTranslationState(translationNode, {
        state: "done",
        content: translatedSegments[index],
        sourceElement: getSegmentSourceElement(segment)
      });

      if (!didUpdate) {
        result.ok = false;
        result.failedSegments.push({
          segmentId: segment.id,
          reason: "update-failed"
        });
        return;
      }

      result.renderedCount += 1;
    });

    return result;
  }

  function renderSegmentError(segments, message) {
    const result = createRenderResult(segments.length);

    segments.forEach((segment) => {
      let translationNode = findInlineTranslationNode(segment);
      if (!translationNode) {
        translationNode = insertTranslationNode(segment, {
          state: "error",
          content: message
        });
      }

      if (!translationNode) {
        result.ok = false;
        result.failedSegments.push({
          segmentId: segment.id,
          reason: "insert-failed"
        });
        return;
      }

      const didUpdate = setInlineTranslationState(translationNode, {
        state: "error",
        content: message,
        sourceElement: getSegmentSourceElement(segment)
      });

      if (!didUpdate) {
        result.ok = false;
        result.failedSegments.push({
          segmentId: segment.id,
          reason: "update-failed"
        });
        return;
      }

      result.renderedCount += 1;
    });

    return result;
  }

  function insertTranslationNode(segment, { state, content }) {
    const node = document.createElement("div");
    node.className = INLINE_TRANSLATION_CLASS;
    node.dataset.state = state;
    node.setAttribute(SEGMENT_ATTRIBUTE, segment.id || "");
    node.innerHTML = '<div class="fmt-inline-translation-content"></div>';
    applyTranslationStyles(node, getSegmentSourceElement(segment), state);
    setInlineTranslationState(node, {
      state,
      content,
      sourceElement: getSegmentSourceElement(segment)
    });

    const inserted = withObserverMuted(() => insertTranslationAtValidPosition(segment, node));
    return inserted ? node : null;
  }

  function setInlineTranslationState(node, { state, content, sourceElement }) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    const normalizedContent = normalizeTranslationText(content);
    const contentNode = node.querySelector(".fmt-inline-translation-content");
    if (!(contentNode instanceof HTMLElement)) {
      return false;
    }

    if (
      node.dataset.state === state &&
      contentNode.textContent === normalizedContent
    ) {
      return true;
    }

    return withObserverMuted(() => {
      node.dataset.state = state;
      if (sourceElement instanceof HTMLElement) {
        applyTranslationStyles(node, sourceElement, state);
      }

      contentNode.textContent = normalizedContent;
      return true;
    });
  }

  function setTitleTranslationState(node, { state, content, sourceElement }) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    const normalizedContent = normalizeTranslationText(content);
    const contentNode = node.querySelector(".fmt-title-translation-content");
    if (!(contentNode instanceof HTMLElement)) {
      return false;
    }

    if (
      node.dataset.state === state &&
      contentNode.textContent === normalizedContent
    ) {
      return true;
    }

    return withObserverMuted(() => {
      node.dataset.state = state;
      applyTranslationStyles(node, sourceElement, state === "done" ? "done" : state);
      node.style.fontWeight = "500";
      contentNode.textContent = normalizedContent;
      return true;
    });
  }

  function findInlineTranslationNode(segmentOrId) {
    const segmentId = typeof segmentOrId === "string" ? segmentOrId : segmentOrId?.id;
    if (!segmentId) {
      return null;
    }

    if (segmentOrId && typeof segmentOrId === "object") {
      const localNode = findInlineTranslationNodeNearSegment(segmentOrId, segmentId);
      if (localNode) {
        return localNode;
      }
    }

    return document.querySelector(`.${INLINE_TRANSLATION_CLASS}[${SEGMENT_ATTRIBUTE}="${segmentId}"]`);
  }

  function findInlineTranslationNodeNearSegment(segment, segmentId) {
    if (segment.referenceNode) {
      const anchor = getExistingSegmentAnchor(segment.referenceNode);
      const sibling = anchor?.nextElementSibling || null;
      if (matchesInlineTranslationNode(sibling, segmentId)) {
        return sibling;
      }
    }

    const element = segment.element;
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    if (matchesInlineTranslationNode(element.lastElementChild, segmentId)) {
      return element.lastElementChild;
    }

    if (matchesInlineTranslationNode(element.nextElementSibling, segmentId)) {
      return element.nextElementSibling;
    }

    const rowSibling = element.parentElement?.nextElementSibling;
    if (rowSibling instanceof HTMLElement) {
      const rowNode = rowSibling.querySelector(`.${INLINE_TRANSLATION_CLASS}[${SEGMENT_ATTRIBUTE}="${segmentId}"]`);
      if (rowNode instanceof HTMLElement) {
        return rowNode;
      }
    }

    return null;
  }

  function matchesInlineTranslationNode(node, segmentId) {
    return node instanceof HTMLElement
      && node.classList.contains(INLINE_TRANSLATION_CLASS)
      && node.getAttribute(SEGMENT_ATTRIBUTE) === segmentId;
  }

  function insertTranslationAtValidPosition(segment, node) {
    if (segment.referenceNode) {
      const anchor = ensureSegmentAnchor(segment.referenceNode);
      if (!(anchor instanceof HTMLElement) || !anchor.isConnected) {
        return false;
      }
      anchor.insertAdjacentElement("afterend", node);
      return node.isConnected;
    }

    const element = segment.element;
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();

    if (tagName === "td" || tagName === "th") {
      node.style.marginTop = "8px";
      if (tagName === "th") {
        node.style.whiteSpace = "nowrap";
      }
      element.appendChild(node);
      return true;
    }

    const parentTag = element.parentElement?.tagName?.toLowerCase();
    if (parentTag === "tr") {
      const wrapper = document.createElement("td");
      wrapper.className = TRANSLATION_WRAPPER_CLASS;
      const colSpan = element.parentElement.children.length;
      if (colSpan > 1) {
        wrapper.colSpan = colSpan;
      }
      wrapper.appendChild(node);

      const row = document.createElement("tr");
      row.className = TRANSLATION_WRAPPER_CLASS;
      row.appendChild(wrapper);
      element.parentElement.insertAdjacentElement("afterend", row);
      return true;
    }

    element.insertAdjacentElement("afterend", node);
    return true;
  }

  function getSegmentSourceElement(segment) {
    if (segment?.sourceElement instanceof HTMLElement) {
      return segment.sourceElement;
    }

    return segment?.element instanceof HTMLElement ? segment.element : null;
  }

  function applyTranslationStyles(node, sourceElement, state) {
    if (!(node instanceof HTMLElement) || !(sourceElement instanceof HTMLElement)) {
      return;
    }

    const sourceStyle = window.getComputedStyle(sourceElement);
    node.style.fontFamily = sourceStyle.fontFamily;
    node.style.fontSize = sourceStyle.fontSize;
    node.style.fontWeight = sourceStyle.fontWeight;
    node.style.lineHeight = sourceStyle.lineHeight;

    const baseColor = parseColor(sourceStyle.color);
    const isDarkThemeText = getLuminance(baseColor) > 0.6;

    if (state === "error") {
      node.style.color = isDarkThemeText ? "#ff9aa7" : "#c94b5b";
      node.style.backgroundColor = isDarkThemeText ? "rgba(255, 122, 122, 0.10)" : "rgba(255, 122, 122, 0.08)";
      return;
    }

    if (state === "loading") {
      node.style.color = isDarkThemeText ? "#aab6c8" : "#76859c";
      node.style.backgroundColor = isDarkThemeText ? "rgba(170, 182, 200, 0.08)" : "rgba(170, 182, 200, 0.10)";
      return;
    }

    node.style.color = isDarkThemeText ? "#78a9ff" : "#467dde";
    node.style.backgroundColor = isDarkThemeText ? "rgba(70, 125, 222, 0.10)" : "rgba(70, 125, 222, 0.09)";
  }

  function createRenderResult(expectedCount) {
    return {
      ok: true,
      expectedCount,
      renderedCount: 0,
      failedSegments: []
    };
  }

  function getMessageStatusMountTarget(descriptor) {
    if (descriptor?.body instanceof HTMLElement && descriptor.body.isConnected) {
      return descriptor.body;
    }

    if (descriptor?.messageNode instanceof HTMLElement && descriptor.messageNode.isConnected) {
      return descriptor.messageNode;
    }

    if (descriptor?.card instanceof HTMLElement && descriptor.card.isConnected) {
      return descriptor.card;
    }

    return null;
  }

  function findMessageStatusNode(descriptor) {
    const key = descriptor?.key;
    if (!key) {
      return null;
    }

    return document.querySelector(`.${MESSAGE_STATUS_CLASS}[data-message-key="${CSS.escape(key)}"]`);
  }

  function findTitleTranslationNode(threadRoot) {
    if (!(threadRoot instanceof HTMLElement)) {
      return null;
    }

    return threadRoot.querySelector(`.${TITLE_TRANSLATION_CLASS}`);
  }

  app.render = {
    removeInlineTranslations,
    clearThreadRenderArtifacts,
    hasThreadRenderArtifacts,
    getThreadRenderArtifactCounts,
    clearTitleTranslation,
    renderTitleTranslation,
    clearMessageStatus,
    renderMessageStatus,
    renderLoadingTranslations,
    renderTranslatedSegments,
    renderSegmentError,
    insertTranslationNode,
    setInlineTranslationState,
    findInlineTranslationNode,
    insertTranslationAtValidPosition,
    getSegmentSourceElement,
    applyTranslationStyles,
    getMessageStatusMountTarget,
    findMessageStatusNode,
    findTitleTranslationNode
  };
})();
