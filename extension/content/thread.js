(() => {
  const app = globalThis.FastTrMailContent;
  const {
    BUTTON_ACTIVE_CLASS,
    BUTTON_CLASS,
    MESSAGE_INSTANCE_ATTRIBUTE,
    SEGMENT_ATTRIBUTE
  } = app.constants;
  const TOOLBAR_DIVIDER_CLASS = "fmt-translate-divider";
  const { threadStates } = app.state;
  const toolbarButtonThreadRoots = new WeakMap();
  const {
    nextMessageInstanceId,
    nextThreadStateKey,
    normalizeKeyText,
    summarizeText,
    withObserverMuted
  } = app.utils;

  function findThreadRoot(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    if (element.classList.contains(BUTTON_CLASS)) {
      const mappedThreadRoot = toolbarButtonThreadRoots.get(element);
      if (mappedThreadRoot instanceof HTMLElement) {
        return mappedThreadRoot;
      }
    }

    const directThreadRoot = element.closest(".v-Thread");
    if (directThreadRoot instanceof HTMLElement) {
      return directThreadRoot;
    }

    const pageRoot = findPageRoot(element);
    if (!(pageRoot instanceof HTMLElement)) {
      return null;
    }

    return findPrimaryThreadRoot(pageRoot);
  }

  function findPageRoot(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    return element.closest(".v-Page");
  }

  function normalizeIdentityValue(value, maxLength = 240) {
    return normalizeKeyText(value || "").slice(0, maxLength);
  }

  function buildIdentity(prefix, parts, fallback = "unknown") {
    const normalizedParts = parts
      .map((part) => normalizeIdentityValue(part))
      .filter(Boolean);

    if (normalizedParts.length > 0) {
      return `${prefix}::${normalizedParts.join("::")}`;
    }

    return `${prefix}::${fallback}`;
  }

  function findTitleElement(threadRoot) {
    if (!(threadRoot instanceof HTMLElement)) {
      return null;
    }

    const title = threadRoot.querySelector(".v-Thread-title h1");
    return title instanceof HTMLElement ? title : null;
  }

  function getTitleText(threadRoot) {
    return normalizeIdentityValue(findTitleElement(threadRoot)?.textContent || "", 320);
  }

  function getThreadKey(threadRoot) {
    return getExistingThreadState(threadRoot)?.key || "";
  }

  function ensureThreadState(threadRoot) {
    let state = getExistingThreadState(threadRoot);

    if (state) {
      return state;
    }

    const staleState = getExistingThreadState(threadRoot, { includeStale: true });
    if (staleState) {
      app.runtime.deactivateThreadState(staleState);
    }

    state = app.runtime.createThreadState(nextThreadStateKey());
    state.root = threadRoot;
    threadStates.set(threadRoot, state);
    app.debug.log("thread", "create-thread-state", describeThread(threadRoot, state));

    return state;
  }

  function getExistingThreadState(threadRoot, { includeStale = false } = {}) {
    if (!(threadRoot instanceof HTMLElement)) {
      return null;
    }

    const state = threadStates.get(threadRoot) || null;
    if (!includeStale && state && !app.runtime.isThreadStateCurrent(state)) {
      return null;
    }

    return state;
  }

  function resetThreadState(threadRoot) {
    const threadState = getExistingThreadState(threadRoot, { includeStale: true });
    if (threadState) {
      app.debug.log("thread", "reset-thread-state", describeThread(threadRoot, threadState));
      app.runtime.deactivateThreadState(threadState);
      threadStates.delete(threadRoot);
    }
  }

  function isThreadActive(threadRoot) {
    return getExistingThreadState(threadRoot)?.active === true;
  }

  function injectButtons(root, onTranslateClick) {
    withObserverMuted(() => {
      const pageRoots = collectRelevantPageRoots(root);

      for (const pageRoot of pageRoots) {
        if (!(pageRoot instanceof HTMLElement)) {
          continue;
        }

        const toolbar = findToolbarForPageRoot(pageRoot);
        const threadRoot = findPrimaryThreadRoot(pageRoot);
        const threadTitle = threadRoot instanceof HTMLElement
          ? threadRoot.querySelector(".v-Thread-title")
          : null;

        if (!(toolbar instanceof HTMLElement) || !(threadTitle instanceof HTMLElement)) {
          removeToolbarTranslateButtons(toolbar);
          continue;
        }

        const button = ensureTranslateButton(toolbar, onTranslateClick);
        toolbarButtonThreadRoots.set(button, threadRoot);
        updateButtonState(button, isThreadActive(threadRoot));
      }
    });
  }

  function collectRelevantPageRoots(root) {
    const pageRoots = new Set();

    if (root instanceof HTMLElement) {
      if (root.matches(".v-Page")) {
        pageRoots.add(root);
      }

      const directPageRoot = findPageRoot(root);
      if (directPageRoot instanceof HTMLElement) {
        pageRoots.add(directPageRoot);
      }
    }

    if (root && typeof root.querySelectorAll === "function") {
      root.querySelectorAll(".v-Page").forEach((pageRoot) => {
        if (pageRoot instanceof HTMLElement) {
          pageRoots.add(pageRoot);
        }
      });
    }

    return Array.from(pageRoots);
  }

  function findToolbarForPageRoot(pageRoot) {
    if (!(pageRoot instanceof HTMLElement)) {
      return null;
    }

    const toolbar = pageRoot.querySelector(".v-Toolbar");
    return toolbar instanceof HTMLElement ? toolbar : null;
  }

  function findPrimaryThreadRoot(pageRoot) {
    if (!(pageRoot instanceof HTMLElement)) {
      return null;
    }

    const candidates = Array.from(pageRoot.querySelectorAll(".v-Page-content .v-Thread")).filter(
      (candidate) => candidate instanceof HTMLElement
    );

    if (candidates.length === 0) {
      return null;
    }

    let bestCandidate = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    candidates.forEach((candidate, index) => {
      const title = candidate.querySelector(".v-Thread-title h1");
      const titleText = normalizeIdentityValue(title?.textContent || "", 320);
      const messageCardCount = candidate.querySelectorAll(".v-MessageCard.app-contentCard").length;
      const score = (
        (titleText ? 1000 : 0) +
        (isElementProbablyVisible(candidate) ? 100 : 0) +
        Math.min(messageCardCount, 20) * 10 +
        index
      );

      if (score >= bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    });

    return bestCandidate instanceof HTMLElement ? bestCandidate : null;
  }

  function isElementProbablyVisible(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (typeof element.getBoundingClientRect !== "function") {
      return true;
    }

    const rect = element.getBoundingClientRect();
    return (rect.width > 0 || rect.height > 0);
  }

  function ensureTranslateButton(toolbar, onTranslateClick) {
    const buttons = Array.from(toolbar.querySelectorAll(`.${BUTTON_CLASS}`)).filter((candidate) => {
      return candidate instanceof HTMLElement && candidate.closest(".v-Toolbar") === toolbar;
    });
    const [existingButton, ...duplicates] = buttons;

    duplicates.forEach((duplicate) => duplicate.remove());

    const button = existingButton instanceof HTMLButtonElement
      ? existingButton
      : createTranslateButton(onTranslateClick);

    placeTranslateButton(toolbar, button);
    app.debug.log("thread", existingButton ? "reuse-translate-button" : "create-translate-button", {
      toolbarText: summarizeText(toolbar.textContent),
      buttonTitle: button.getAttribute("title") || ""
    });
    return button;
  }

  function removeToolbarTranslateButtons(toolbar) {
    if (!(toolbar instanceof HTMLElement)) {
      return;
    }

    toolbar.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      toolbarButtonThreadRoots.delete(button);
      button.remove();
    });

    toolbar.querySelectorAll(`.${TOOLBAR_DIVIDER_CLASS}`).forEach((divider) => {
      if (divider instanceof HTMLElement) {
        divider.remove();
      }
    });
  }

  function createTranslateButton(onTranslateClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v-Button v-Button--subtleStandard v-Button--sizeM fmt-translate-button";
    button.style.position = "relative";
    button.innerHTML = "<span class=\"label\"></span>";
    updateButtonState(button, false);
    button.addEventListener("click", onTranslateClick);
    return button;
  }

  function placeTranslateButton(toolbar, button) {
    const actionButtons = Array.from(toolbar.querySelectorAll(":scope > button"));
    const anchorButton = actionButtons.find((candidate) => {
      if (candidate === button) {
        return false;
      }

      const labelText = normalizeIdentityValue(candidate.querySelector(".label")?.textContent || "", 40);
      return labelText === "更多" || labelText.toLowerCase() === "more";
    });
    const divider = ensureTranslateDivider(toolbar);
    const flexSpacer = toolbar.querySelector(".v-Toolbar-flex");

    if (anchorButton?.nextElementSibling instanceof HTMLElement) {
      toolbar.insertBefore(divider, anchorButton.nextElementSibling);
      toolbar.insertBefore(button, divider.nextElementSibling);
      return;
    }

    if (flexSpacer instanceof HTMLElement) {
      toolbar.insertBefore(divider, flexSpacer);
      toolbar.insertBefore(button, flexSpacer);
      return;
    }

    toolbar.appendChild(divider);
    toolbar.appendChild(button);
  }

  function ensureTranslateDivider(toolbar) {
    const existingDivider = toolbar.querySelector(`.${TOOLBAR_DIVIDER_CLASS}`);
    if (existingDivider instanceof HTMLElement) {
      return existingDivider;
    }

    const divider = document.createElement("span");
    divider.className = `v-Toolbar-divider ${TOOLBAR_DIVIDER_CLASS}`;
    return divider;
  }

  function getThreadMessageEntries(threadRoot) {
    const cards = Array.from(threadRoot.querySelectorAll(".v-MessageCard.app-contentCard")).filter(
      (card) => card instanceof HTMLElement
    );

    return cards.map((card) => ({
      card,
      header: card.querySelector(".v-MessageCard-header"),
      messageNode: findMessageNodeForCard(card)
    }));
  }

  function collectMessageDescriptors(threadRoot, threadState) {
    return getThreadMessageEntries(threadRoot).map((entry) => {
      const instanceId = getOrAssignMessageInstanceId(entry);
      const body = findBodyElement(entry.messageNode);
      const contentRoot = body instanceof HTMLElement
        ? findPrimaryContentRoot(body) || body
        : null;
      const identity = buildMessageIdentity(entry, body);

      return {
        instanceId,
        identity,
        card: entry.card,
        header: entry.header,
        messageNode: entry.messageNode,
        body,
        contentRoot
      };
    });
  }

  function buildMessageIdentity(entry, bodyElement) {
    const dataMessageId = getMessageDataId(entry);
    const detailsFingerprint = getMessageDetailsFingerprint(entry.messageNode);
    const fromText = normalizeIdentityValue(
      entry.card?.querySelector(".v-MessageCard-from")?.getAttribute("title")
      || entry.card?.querySelector(".v-MessageCard-from")?.textContent
      || ""
    );
    const senderAddress = normalizeIdentityValue(entry.card?.querySelector(".v-MessageCard-unknownSender")?.textContent || "");
    const toText = normalizeIdentityValue(
      entry.card?.querySelector(".v-Message-toName")?.getAttribute("title")
      || entry.card?.querySelector(".v-Message-toName")?.textContent
      || ""
    );
    const exactDateText = normalizeIdentityValue(entry.card?.querySelector(".v-MessageCard-time")?.getAttribute("title") || "");
    const bodyTextSource = bodyElement instanceof HTMLElement
      ? bodyElement
      : entry.messageNode instanceof HTMLElement
        ? entry.messageNode
        : null;
    const bodyExcerpt = !dataMessageId && !detailsFingerprint && bodyTextSource
      ? normalizeIdentityValue(app.segments.extractBodyText(bodyTextSource).slice(0, 200), 200)
      : "";

    return buildIdentity("message", [
      dataMessageId,
      detailsFingerprint,
      fromText,
      senderAddress,
      toText,
      exactDateText,
      bodyExcerpt,
      entry.messageNode?.getAttribute("data-message-id"),
      entry.card?.getAttribute("data-message-id")
    ], entry.card?.id || entry.messageNode?.id || "message");
  }

  function getMessageDataId(entry) {
    return normalizeIdentityValue(
      entry.messageNode?.getAttribute("data-message-id")
      || entry.card?.getAttribute("data-message-id")
      || "",
      320
    );
  }

  function getOrAssignMessageInstanceId(entry) {
    const existingId = getMessageInstanceId(entry);
    if (existingId) {
      return existingId;
    }

    const instanceId = nextMessageInstanceId();
    withObserverMuted(() => {
      if (entry.card instanceof HTMLElement) {
        entry.card.setAttribute(MESSAGE_INSTANCE_ATTRIBUTE, instanceId);
      }

      if (entry.messageNode instanceof HTMLElement) {
        entry.messageNode.setAttribute(MESSAGE_INSTANCE_ATTRIBUTE, instanceId);
      }
    });

    return instanceId;
  }

  function getMessageInstanceId(entry) {
    return normalizeIdentityValue(
      entry.card?.getAttribute(MESSAGE_INSTANCE_ATTRIBUTE)
      || entry.messageNode?.getAttribute(MESSAGE_INSTANCE_ATTRIBUTE)
      || "",
      320
    );
  }

  function getMessageDetailsFingerprint(messageNode) {
    if (!(messageNode instanceof HTMLElement)) {
      return "";
    }

    const detailsList = messageNode.querySelector(".v-Message-detailsList");
    if (detailsList instanceof HTMLElement) {
      return normalizeIdentityValue(detailsList.textContent || "", 400);
    }

    return "";
  }

  function reconcileMessageStates(threadState, descriptors) {
    const liveKeys = new Set();

    for (const descriptor of descriptors) {
      descriptor.key = `${threadState.key}::${descriptor.instanceId}`;
      liveKeys.add(descriptor.key);
      let messageState = threadState.messages.get(descriptor.key);

      if (!messageState) {
        messageState = app.runtime.createMessageState({
          key: descriptor.key,
          identity: descriptor.identity,
          instanceId: descriptor.instanceId
        });
        threadState.messages.set(descriptor.key, messageState);
      }

      messageState.identity = descriptor.identity;
      messageState.instanceId = descriptor.instanceId;
      descriptor.state = messageState;
    }

    for (const key of threadState.messages.keys()) {
      if (!liveKeys.has(key)) {
        threadState.messages.delete(key);
      }
    }
  }

  function findLiveBodyElement(threadRoot, threadState, descriptor) {
    return findLiveMessageElements(threadRoot, threadState, descriptor).body;
  }

  function findLiveMessageElements(threadRoot, threadState, descriptor) {
    const directBody = findBodyElement(descriptor.messageNode);
    if (directBody instanceof HTMLElement && directBody.isConnected) {
      return {
        body: directBody,
        contentRoot: findPrimaryContentRoot(directBody) || directBody
      };
    }

    const liveEntry = findMessageEntryByInstanceId(threadRoot, descriptor.state?.instanceId || descriptor.instanceId);
    if (!liveEntry) {
      return {
        body: null,
        contentRoot: null
      };
    }

    const liveBody = findBodyElement(liveEntry.messageNode);

    return {
      body: liveBody instanceof HTMLElement ? liveBody : null,
      contentRoot: liveBody instanceof HTMLElement
        ? findPrimaryContentRoot(liveBody) || liveBody
        : null
    };
  }

  function findMessageEntryByInstanceId(threadRoot, instanceId) {
    if (!(threadRoot instanceof HTMLElement) || !instanceId) {
      return null;
    }

    return getThreadMessageEntries(threadRoot).find((entry) => {
      return getMessageInstanceId(entry) === instanceId;
    }) || null;
  }

  function findMessageNodeForCard(card) {
    if (!(card instanceof HTMLElement)) {
      return null;
    }

    const nestedMessage = card.querySelector(".v-Message");
    if (nestedMessage instanceof HTMLElement) {
      return nestedMessage;
    }

    for (let sibling = card.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (!(sibling instanceof HTMLElement)) {
        continue;
      }

      if (sibling.matches(".v-MessageCard.app-contentCard")) {
        break;
      }

      if (sibling.matches(".v-Message")) {
        return sibling;
      }

      const nestedSiblingMessage = sibling.querySelector(".v-Message");
      if (nestedSiblingMessage instanceof HTMLElement) {
        return nestedSiblingMessage;
      }
    }

    return null;
  }

  function syncThreadButtons(threadRoot, isActive) {
    if (!(threadRoot instanceof HTMLElement)) {
      return;
    }

    threadRoot.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => {
      if (button instanceof HTMLElement) {
        updateButtonState(button, isActive);
      }
    });

    const pageRoot = findPageRoot(threadRoot);
    const toolbarButton = findToolbarTranslateButton(pageRoot, threadRoot);
    if (toolbarButton instanceof HTMLElement) {
      updateButtonState(toolbarButton, isActive);
    }
  }

  function findToolbarTranslateButton(pageRoot, threadRoot) {
    const toolbar = findToolbarForPageRoot(pageRoot);
    if (!(toolbar instanceof HTMLElement)) {
      return null;
    }

    const candidates = toolbar.querySelectorAll(`.${BUTTON_CLASS}`);
    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) {
        continue;
      }

      if (toolbarButtonThreadRoots.get(candidate) === threadRoot) {
        return candidate;
      }
    }

    return null;
  }

  function updateButtonState(button, isActive) {
    withObserverMuted(() => {
      const label = app.i18n.t(isActive ? "content.restoreOriginal" : "content.translate");
      button.setAttribute("title", label);
      button.setAttribute("aria-label", label);
      const labelNode = button.querySelector(".label");
      if (labelNode instanceof HTMLElement) {
        labelNode.textContent = label;
      }
      button.classList.toggle(BUTTON_ACTIVE_CLASS, isActive);
    });
  }

  function findBodyElement(messageNode) {
    const { extractBodyText } = app.segments;
    const { isCandidateBodyText, isExplicitBodyText } = app.policies;

    if (!(messageNode instanceof HTMLElement)) {
      return null;
    }

    const explicitSelectors = [
      ".v-Message-body",
      ".v-Message-bodyContents",
      ".v-MessageBody",
      ".u-containSelection.v-Message-body"
    ];

    for (const selector of explicitSelectors) {
      const found = messageNode.matches(selector)
        ? messageNode
        : messageNode.querySelector(selector);

      if (found instanceof HTMLElement && isExplicitBodyText(extractBodyText(found))) {
        return found;
      }
    }

    let bestCandidate = null;
    let bestScore = 0;

    for (const candidate of messageNode.querySelectorAll(".u-article, article, section, pre, blockquote, div")) {
      if (!(candidate instanceof HTMLElement)) {
        continue;
      }

      if (candidate.closest(`.${app.constants.INLINE_TRANSLATION_CLASS}`)) {
        continue;
      }

      const text = extractBodyText(candidate);
      if (!isCandidateBodyText(text)) {
        continue;
      }

      const rect = candidate.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }

      const score = text.length - candidate.querySelectorAll("button, input, svg").length * 20;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (!(bestCandidate instanceof HTMLElement)) {
      return null;
    }

    return bestCandidate.closest(".v-Message-body, .v-Message-bodyContents, .v-MessageBody")
      || bestCandidate;
  }

  function isMessageBodyDeferred(descriptor) {
    const card = descriptor?.card;
    if (!(card instanceof HTMLElement)) {
      return false;
    }

    if (card.classList.contains("is-collapsed")) {
      return true;
    }

    if (card.querySelector(".v-MessageCard-loadingBody")) {
      return true;
    }

    return false;
  }

  function findPrimaryContentRoot(container) {
    const { extractBodyText } = app.segments;

    if (!(container instanceof HTMLElement)) {
      return null;
    }

    const preferredSelectors = [
      ".u-article",
      "article",
      "pre",
      "blockquote",
      "section",
      "div"
    ];

    let bestCandidate = null;
    let bestScore = 0;

    for (const selector of preferredSelectors) {
      for (const candidate of container.querySelectorAll(selector)) {
        if (!(candidate instanceof HTMLElement)) {
          continue;
        }

        if (candidate.closest(`.${app.constants.INLINE_TRANSLATION_CLASS}`)) {
          continue;
        }

        const text = extractBodyText(candidate);
        if (text.length < 20) {
          continue;
        }

        if (text.length > bestScore) {
          bestScore = text.length;
          bestCandidate = candidate;
        }
      }
    }

    return bestCandidate;
  }

  function pruneDetachedThreadStates() {
    for (const threadState of Array.from(app.state.activeThreadStates)) {
      if (threadState.root instanceof HTMLElement && threadState.root.isConnected) {
        continue;
      }

      app.debug.log("thread", "prune-detached-thread-state", {
        key: threadState.key,
        wasActive: threadState.active,
        titleSource: summarizeText(threadState.title?.sourceText || "")
      });
      app.runtime.deactivateThreadState(threadState);
      if (threadState.root instanceof HTMLElement) {
        threadStates.delete(threadState.root);
      }
    }
  }

  function clearThreadDomState(root) {
    if (!root || typeof root.querySelectorAll !== "function") {
      return;
    }

    withObserverMuted(() => {
      root.querySelectorAll(`[${MESSAGE_INSTANCE_ATTRIBUTE}], [${SEGMENT_ATTRIBUTE}]`).forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }

        node.removeAttribute(MESSAGE_INSTANCE_ATTRIBUTE);
        node.removeAttribute(SEGMENT_ATTRIBUTE);
      });
    });
  }

  function describeThread(threadRoot, threadState = getExistingThreadState(threadRoot)) {
    return {
      key: threadState?.key || "",
      active: threadState?.active === true,
      cancelled: threadState?.cancelled === true,
      rootConnected: threadRoot instanceof HTMLElement ? threadRoot.isConnected : false,
      title: summarizeText(getTitleText(threadRoot), 160),
      messageCards: threadRoot instanceof HTMLElement
        ? threadRoot.querySelectorAll(".v-MessageCard.app-contentCard").length
        : 0
    };
  }

  app.thread = {
    findThreadRoot,
    getThreadKey,
    ensureThreadState,
    getExistingThreadState,
    describeThread,
    resetThreadState,
    isThreadActive,
    injectButtons,
    findTitleElement,
    getTitleText,
    getThreadMessageEntries,
    collectMessageDescriptors,
    reconcileMessageStates,
    findLiveBodyElement,
    findLiveMessageElements,
    syncThreadButtons,
    updateButtonState,
    findBodyElement,
    findPrimaryContentRoot,
    isMessageBodyDeferred,
    pruneDetachedThreadStates,
    clearThreadDomState
  };
})();
