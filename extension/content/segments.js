(() => {
  const app = globalThis.FastTrMailContent;
  const {
    INLINE_TRANSLATION_CLASS,
    SEGMENT_ANCHOR_CLASS,
    SEGMENT_ATTRIBUTE
  } = app.constants;
  const { nextSegmentId, normalizeKeyText, withObserverMuted } = app.utils;

  function collectTranslatableSegments(bodyElement) {
    const flowRoot = findFlowSegmentRoot(bodyElement);
    const strategy = determineSegmentationStrategy(flowRoot, bodyElement);

    if (strategy === "flow-first" && flowRoot && shouldUseFlowSegmentation(flowRoot)) {
      const flowSegments = collectFlowSegments(flowRoot);
      if (flowSegments.length > 0) {
        return flowSegments;
      }
    }

    const blockSegments = collectBlockSegments(bodyElement);
    if (blockSegments.length > 0) {
      return blockSegments;
    }

    if (strategy !== "flow-first" && flowRoot && shouldUseFlowSegmentation(flowRoot)) {
      const flowSegments = collectFlowSegments(flowRoot);
      if (flowSegments.length > 0) {
        return flowSegments;
      }
    }

    const fallbackSegments = collectFallbackSegments(bodyElement, flowRoot);
    if (fallbackSegments.length > 0) {
      return fallbackSegments;
    }

    return [];
  }

  function findFlowSegmentRoot(bodyElement) {
    if (!(bodyElement instanceof HTMLElement)) {
      return null;
    }

    const preferredRoot = bodyElement.querySelector(".u-article, article, pre");
    return preferredRoot instanceof HTMLElement ? preferredRoot : bodyElement;
  }

  function shouldUseFlowSegmentation(container) {
    if (!(container instanceof HTMLElement)) {
      return false;
    }

    if (container.tagName.toLowerCase() === "pre") {
      return true;
    }

    for (const node of Array.from(container.childNodes)) {
      if (node instanceof HTMLElement && node.classList.contains(SEGMENT_ANCHOR_CLASS)) {
        continue;
      }

      if (node instanceof HTMLElement && node.classList.contains(INLINE_TRANSLATION_CLASS)) {
        continue;
      }

      if (node.nodeType === Node.TEXT_NODE && (node.textContent || "").trim()) {
        return true;
      }

      if (node instanceof HTMLBRElement || node instanceof HTMLHRElement) {
        return true;
      }

      if (node instanceof HTMLElement && !isBlockSegmentCandidate(node)) {
        const text = extractBodyText(node);
        if (text.trim()) {
          return true;
        }
      }
    }

    return false;
  }

  function collectFlowSegments(container) {
    if (!(container instanceof HTMLElement)) {
      return [];
    }

    const segments = [];
    let textParts = [];
    let lastContentNode = null;
    let consecutiveBreaks = 0;

    const flushSegment = () => {
      const text = normalizePreSegmentText(textParts.join(""));
      if (
        !text ||
        !lastContentNode ||
        shouldSkipSegmentText(text) ||
        !isTranslatableSegment(text, container)
      ) {
        textParts = [];
        lastContentNode = null;
        consecutiveBreaks = 0;
        return;
      }

      if (!(lastContentNode?.parentNode)) {
        textParts = [];
        lastContentNode = null;
        consecutiveBreaks = 0;
        return;
      }

      segments.push(createAnchoredSegment(lastContentNode, container, text));

      textParts = [];
      lastContentNode = null;
      consecutiveBreaks = 0;
    };

    for (const node of Array.from(container.childNodes)) {
      if (node instanceof HTMLElement && node.classList.contains(SEGMENT_ANCHOR_CLASS)) {
        continue;
      }

      if (node instanceof HTMLElement && node.classList.contains(INLINE_TRANSLATION_CLASS)) {
        continue;
      }

      if (node instanceof HTMLBRElement) {
        consecutiveBreaks += 1;
        if (consecutiveBreaks >= 2) {
          flushSegment();
        } else {
          textParts.push("\n");
        }
        continue;
      }

      if (node instanceof HTMLHRElement) {
        flushSegment();
        continue;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        textParts.push(text);
        if (text.trim()) {
          lastContentNode = node;
        }
        consecutiveBreaks = 0;
        continue;
      }

      if (node instanceof HTMLElement) {
        if (isBlockSegmentCandidate(node)) {
          flushSegment();

          if (!isVisible(node)) {
            consecutiveBreaks = 0;
            continue;
          }

          const text = extractBodyText(node);
          if (
            !text ||
            shouldSkipSegmentText(text) ||
            !isTranslatableSegment(text, node) ||
            hasNestedTranslatableBlocks(node)
          ) {
            consecutiveBreaks = 0;
            continue;
          }

          segments.push(createElementSegment(node, text));
          consecutiveBreaks = 0;
          continue;
        }

        const text = extractBodyText(node);
        textParts.push(text);
        if (text.trim()) {
          lastContentNode = node;
        }
        consecutiveBreaks = 0;
      }
    }

    flushSegment();
    return segments;
  }

  function collectBlockSegments(root) {
    if (!(root instanceof HTMLElement)) {
      return [];
    }

    const candidates = Array.from(
      root.querySelectorAll("p, div, li, blockquote, td, th, h1, h2, h3, h4, pre")
    );
    const segments = [];

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) {
        continue;
      }

      if (candidate.closest(`.${INLINE_TRANSLATION_CLASS}`)) {
        continue;
      }

      if (candidate.tagName.toLowerCase() === "pre") {
        segments.push(...collectFlowSegments(candidate));
        continue;
      }

      if (!isVisible(candidate) || !isStandaloneBlock(candidate)) {
        continue;
      }

      const text = extractBodyText(candidate);
      if (
        shouldSkipSegmentText(text) ||
        !isTranslatableSegment(text, candidate) ||
        hasNestedTranslatableBlocks(candidate)
      ) {
        continue;
      }

      segments.push(createElementSegment(candidate, text));
    }

    return segments;
  }

  function determineSegmentationStrategy(flowRoot, bodyElement) {
    if (!(flowRoot instanceof HTMLElement) || !(bodyElement instanceof HTMLElement)) {
      return "block-first";
    }

    const tagName = flowRoot.tagName.toLowerCase();
    if (tagName === "pre" || flowRoot.classList.contains("u-article--may-be-monospace")) {
      return "flow-first";
    }

    if (flowRoot.classList.contains("u-quirksmode")) {
      return "flow-first";
    }

    if (shouldUseFlowSegmentation(flowRoot) && shouldPreferFlowStrategy(flowRoot, bodyElement)) {
      return "flow-first";
    }

    return "block-first";
  }

  function shouldSkipSegmentText(text) {
    const compact = normalizeKeyText(text);
    if (!compact) {
      return true;
    }

    return /^--\s*reply above this line\s*--$/i.test(compact);
  }

  function createElementSegment(element, text) {
    const segmentId = getOrAssignSegmentId(element);

    return {
      id: segmentId,
      element,
      text
    };
  }

  function createAnchoredSegment(referenceNode, sourceElement, text) {
    const anchor = ensureSegmentAnchor(referenceNode);
    const segmentId = getOrAssignSegmentId(anchor);

    return {
      id: segmentId,
      referenceNode,
      sourceElement,
      text
    };
  }

  function normalizePreSegmentText(text) {
    return String(text)
      .replace(/\r\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function ensureSegmentAnchor(referenceNode) {
    const existingAnchor = getExistingSegmentAnchor(referenceNode);
    if (existingAnchor) {
      return existingAnchor;
    }

    if (!referenceNode?.parentNode) {
      return null;
    }

    const anchor = document.createElement("span");
    anchor.className = SEGMENT_ANCHOR_CLASS;
    anchor.setAttribute("aria-hidden", "true");

    withObserverMuted(() => {
      referenceNode.parentNode.insertBefore(anchor, referenceNode.nextSibling);
    });

    return anchor;
  }

  function getOrAssignSegmentId(node) {
    if (!(node instanceof HTMLElement)) {
      return nextSegmentId();
    }

    const existingId = node.getAttribute(SEGMENT_ATTRIBUTE);
    if (existingId) {
      return existingId;
    }

    const segmentId = nextSegmentId();
    node.setAttribute(SEGMENT_ATTRIBUTE, segmentId);
    return segmentId;
  }

  function getExistingSegmentAnchor(referenceNode) {
    let sibling = referenceNode?.nextSibling || null;
    while (sibling) {
      if (sibling instanceof HTMLElement && sibling.classList.contains(SEGMENT_ANCHOR_CLASS)) {
        return sibling;
      }

      if (sibling.nodeType === Node.TEXT_NODE && !(sibling.textContent || "").trim()) {
        sibling = sibling.nextSibling;
        continue;
      }

      break;
    }

    return null;
  }

  function getSegmentSignature(segments) {
    return segments.map((segment) => normalizeKeyText(segment.text)).join("\u0001");
  }

  function extractBodyText(element) {
    const clone = element.cloneNode(true);

    if (!(clone instanceof HTMLElement)) {
      return "";
    }

    clone.querySelectorAll(`.${INLINE_TRANSLATION_CLASS}, .${SEGMENT_ANCHOR_CLASS}, script, style, noscript, button`).forEach((node) => {
      node.remove();
    });

    const text = clone.innerText || clone.textContent || "";
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isStandaloneBlock(element) {
    const tagName = element.tagName.toLowerCase();
    const nestedTable = element.querySelector("table");
    if (nestedTable) {
      return false;
    }

    if (tagName === "div") {
      const blockDescendants = element.querySelectorAll("p, li, blockquote, td, th, h1, h2, h3, h4, pre");
      if (blockDescendants.length > 0) {
        return false;
      }
    }

    for (const child of element.children) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }

      if (child.closest(`.${INLINE_TRANSLATION_CLASS}`)) {
        continue;
      }

      if (!isBlockSegmentCandidate(child)) {
        continue;
      }

      const childText = extractBodyText(child);
      if (isVisible(child) && childText.length > 0) {
        return false;
      }
    }

    return true;
  }

  function isTranslatableSegment(text, element) {
    if (!text || text.length < 2) {
      return false;
    }

    if (element.querySelector("img, video, iframe")) {
      return false;
    }

    const compact = text.replace(/\s+/g, " ").trim();
    if (compact.length < 2) {
      return false;
    }

    if (/^https?:\/\/\S+$/i.test(compact)) {
      return false;
    }

    return hasTranslatableText(compact);
  }

  function isBlockSegmentCandidate(element) {
    const tagName = element.tagName.toLowerCase();
    return ["p", "div", "li", "blockquote", "td", "th", "h1", "h2", "h3", "h4", "pre"].includes(tagName);
  }

  function hasNestedTranslatableBlocks(element) {
    const descendants = element.querySelectorAll("p, div, li, blockquote, td, th, h1, h2, h3, h4, pre");

    for (const descendant of descendants) {
      if (!(descendant instanceof HTMLElement) || descendant === element) {
        continue;
      }

      if (descendant.closest(`.${INLINE_TRANSLATION_CLASS}`)) {
        continue;
      }

      if (!isVisible(descendant)) {
        continue;
      }

      const text = extractBodyText(descendant);
      if (isTranslatableSegment(text, descendant)) {
        return true;
      }
    }

    return false;
  }

  function collectFallbackSegments(bodyElement, flowRoot) {
    const roots = [flowRoot, bodyElement].filter((root, index, items) => {
      return root instanceof HTMLElement && items.indexOf(root) === index;
    });

    for (const root of roots) {
      const segment = createWholeRootFallbackSegment(root);
      if (segment) {
        return [segment];
      }
    }

    return [];
  }

  function createWholeRootFallbackSegment(root) {
    if (!(root instanceof HTMLElement)) {
      return null;
    }

    const text = extractBodyText(root);
    if (!text || shouldSkipSegmentText(text) || !hasTranslatableText(text)) {
      return null;
    }

    if (shouldAnchorWholeRootSegment(root)) {
      const lastContentNode = findLastMeaningfulNode(root);
      if (lastContentNode?.parentNode) {
        return createAnchoredSegment(lastContentNode, root, text);
      }
    }

    return createElementSegment(root, text);
  }

  function shouldPreferWholeRootTranslation(flowRoot, flowSegments) {
    if (!(flowRoot instanceof HTMLElement)) {
      return false;
    }

    const fullText = extractBodyText(flowRoot);
    const fullLength = normalizeKeyText(fullText).length;
    if (fullLength === 0) {
      return false;
    }

    const coveredLength = flowSegments.reduce((total, segment) => {
      return total + normalizeKeyText(segment.text).length;
    }, 0);

    return coveredLength / fullLength < 0.8;
  }

  function shouldPreferFlowStrategy(flowRoot, bodyElement) {
    if (!(flowRoot instanceof HTMLElement) || !(bodyElement instanceof HTMLElement)) {
      return false;
    }

    const fullText = extractBodyText(flowRoot);
    const fullLength = normalizeKeyText(fullText).length;
    if (fullLength === 0) {
      return false;
    }

    const hasBrChildren = flowRoot.querySelector("br") !== null || Array.from(flowRoot.childNodes).some((node) => {
      return node.nodeType === Node.TEXT_NODE && (node.textContent || "").trim();
    });

    if (!hasBrChildren) {
      return false;
    }

    const blockSegments = Array.from(
      bodyElement.querySelectorAll("p, div, li, blockquote, td, th, h1, h2, h3, h4, pre")
    )
      .filter((candidate) => candidate instanceof HTMLElement)
      .map((candidate) => extractBodyText(candidate))
      .filter((text) => {
        return !shouldSkipSegmentText(text) && hasTranslatableText(text);
      });

    const coveredLength = blockSegments.reduce((total, text) => {
      return total + normalizeKeyText(text).length;
    }, 0);

    return coveredLength / fullLength < 0.75;
  }

  function shouldAnchorWholeRootSegment(root) {
    if (!(root instanceof HTMLElement)) {
      return false;
    }

    const tagName = root.tagName.toLowerCase();
    return tagName !== "pre" && tagName !== "td" && tagName !== "th";
  }

  function findLastMeaningfulNode(root) {
    if (!(root instanceof HTMLElement)) {
      return null;
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            return (node.textContent || "").trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_SKIP;
          }

          if (!(node instanceof HTMLElement)) {
            return NodeFilter.FILTER_SKIP;
          }

          if (
            node.classList.contains(INLINE_TRANSLATION_CLASS) ||
            node.classList.contains(SEGMENT_ANCHOR_CLASS) ||
            node.tagName.toLowerCase() === "script" ||
            node.tagName.toLowerCase() === "style" ||
            node.tagName.toLowerCase() === "noscript"
          ) {
            return NodeFilter.FILTER_SKIP;
          }

          return extractBodyText(node).trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    let lastNode = null;
    while (walker.nextNode()) {
      lastNode = walker.currentNode;
    }

    return lastNode;
  }

  function hasTranslatableText(text) {
    const compact = String(text).replace(/\s+/g, " ").trim();
    if (compact.length < 2) {
      return false;
    }

    if (/^https?:\/\/\S+$/i.test(compact)) {
      return false;
    }

    return /[A-Za-z\u00C0-\u024F\u0400-\u04FF\u3040-\u30FF\uAC00-\uD7AF]/.test(compact);
  }

  app.segments = {
    collectTranslatableSegments,
    findFlowSegmentRoot,
    shouldUseFlowSegmentation,
    collectFlowSegments,
    collectBlockSegments,
    determineSegmentationStrategy,
    shouldSkipSegmentText,
    createElementSegment,
    createAnchoredSegment,
    normalizePreSegmentText,
    ensureSegmentAnchor,
    getExistingSegmentAnchor,
    getOrAssignSegmentId,
    getSegmentSignature,
    extractBodyText,
    isVisible,
    isStandaloneBlock,
    isTranslatableSegment,
    isBlockSegmentCandidate,
    hasNestedTranslatableBlocks,
    collectFallbackSegments,
    createWholeRootFallbackSegment,
    hasTranslatableText,
    shouldPreferWholeRootTranslation,
    shouldPreferFlowStrategy,
    shouldAnchorWholeRootSegment,
    findLastMeaningfulNode
  };
})();
