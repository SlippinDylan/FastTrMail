(function initOptionsPage(scope) {
  const { DEFAULT_SETTINGS, LANGUAGES, PROVIDERS, normalizeSettings } = scope.FastTrMailCatalog;
  const i18n = scope.FastTrMailI18n;

  function collectPageElements(documentRef = scope.document) {
    if (!documentRef || typeof documentRef.getElementById !== "function") {
      return null;
    }

    const elements = {
      form: documentRef.getElementById("settings-form"),
      uiLanguageSelect: documentRef.getElementById("uiLanguage"),
      providerSelect: documentRef.getElementById("provider"),
      targetLanguageSelect: documentRef.getElementById("targetLanguage"),
      googlePanel: documentRef.getElementById("google-provider-panel"),
      microsoftPanel: documentRef.getElementById("microsoft-provider-panel"),
      googleApiKeyInput: documentRef.getElementById("googleApiKey"),
      microsoftApiKeyInput: documentRef.getElementById("microsoftApiKey"),
      microsoftRegionInput: documentRef.getElementById("microsoftRegion"),
      statusNode: documentRef.getElementById("status")
    };

    return Object.values(elements).every(Boolean) ? elements : null;
  }

  function getProviderPanelState(provider) {
    return {
      googleVisible: provider === "google-api",
      microsoftVisible: provider === "microsoft"
    };
  }

  function setPanelVisibility(panel, visible) {
    if (!panel) {
      return;
    }

    panel.hidden = !visible;

    if (panel.dataset) {
      panel.dataset.active = visible ? "true" : "false";
    }

    if (typeof panel.setAttribute === "function") {
      panel.setAttribute("aria-hidden", visible ? "false" : "true");
    }
  }

  function syncProviderFields(provider = pageElements?.providerSelect?.value || "", elements = pageElements) {
    if (!elements) {
      return;
    }

    const state = getProviderPanelState(provider);
    setPanelVisibility(elements.googlePanel, state.googleVisible);
    setPanelVisibility(elements.microsoftPanel, state.microsoftVisible);
  }

  function clearNodeChildren(node) {
    if (!node) {
      return;
    }

    if (typeof node.innerHTML === "string") {
      node.innerHTML = "";
    }

    if (Array.isArray(node.children)) {
      node.children.length = 0;
    }
  }

  function populateSelectOptions(selectNode, options, documentRef = scope.document) {
    const selectedValue = selectNode.value;
    clearNodeChildren(selectNode);

    const fragment = documentRef.createDocumentFragment();

    for (const optionDefinition of options) {
      const option = documentRef.createElement("option");
      option.value = optionDefinition.id;
      option.textContent = optionDefinition.label;
      fragment.appendChild(option);
    }

    selectNode.appendChild(fragment);
    if (options.some((option) => option.id === selectedValue)) {
      selectNode.value = selectedValue;
    }
  }

  function getResolvedLocale(uiLanguage) {
    return i18n.resolveUiLanguage(uiLanguage);
  }

  function renderLocalizedPage(settings, elements = pageElements) {
    if (!elements) {
      return;
    }

    const locale = getResolvedLocale(settings.uiLanguage);

    i18n.applyDocumentLanguage(scope.document, locale);
    scope.document.title = i18n.t(locale, "options.documentTitle");
    i18n.applyTranslations(scope.document, locale);

    populateSelectOptions(elements.uiLanguageSelect, i18n.getUiLanguageOptions(locale));
    populateSelectOptions(elements.providerSelect, i18n.getProviderOptions(locale, PROVIDERS));
    populateSelectOptions(elements.targetLanguageSelect, i18n.getTargetLanguageOptions(locale, LANGUAGES));

    elements.uiLanguageSelect.value = settings.uiLanguage;
    elements.providerSelect.value = settings.provider;
    elements.targetLanguageSelect.value = settings.targetLanguage;

    syncProviderFields(settings.provider, elements);
  }

  function readSettingsFromForm(elements = pageElements) {
    return normalizeSettings({
      uiLanguage: elements.uiLanguageSelect.value,
      provider: elements.providerSelect.value,
      targetLanguage: elements.targetLanguageSelect.value,
      googleApiKey: elements.googleApiKeyInput.value.trim(),
      microsoftApiKey: elements.microsoftApiKeyInput.value.trim(),
      microsoftRegion: elements.microsoftRegionInput.value.trim()
    });
  }

  async function initialize(elements = pageElements) {
    const stored = await scope.chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const settings = normalizeSettings(stored);

    elements.googleApiKeyInput.value = settings.googleApiKey;
    elements.microsoftApiKeyInput.value = settings.microsoftApiKey;
    elements.microsoftRegionInput.value = settings.microsoftRegion;

    renderLocalizedPage(settings, elements);
  }

  function setStatus(messageKey, state, elements = pageElements, locale = getResolvedLocale(elements?.uiLanguageSelect?.value || DEFAULT_SETTINGS.uiLanguage)) {
    const statusNode = elements?.statusNode;
    if (!statusNode) {
      return;
    }

    statusNode.textContent = i18n.t(locale, messageKey);
    statusNode.dataset.state = state;

    if (state !== "success") {
      return;
    }

    scope.window.setTimeout(() => {
      if (statusNode.dataset.state === state) {
        statusNode.textContent = "";
        statusNode.dataset.state = "";
      }
    }, 1800);
  }

  async function handleSubmit(event, elements = pageElements) {
    event.preventDefault();

    const settings = readSettingsFromForm(elements);
    const locale = getResolvedLocale(settings.uiLanguage);

    try {
      await scope.chrome.storage.local.set(settings);
      setStatus("options.saved", "success", elements, locale);
    } catch (_error) {
      setStatus("options.saveFailed", "error", elements, locale);
    }
  }

  function handleUiLanguageChange(elements = pageElements) {
    const settings = readSettingsFromForm(elements);
    renderLocalizedPage(settings, elements);
  }

  function bindPageEvents(elements = pageElements) {
    elements.uiLanguageSelect.addEventListener("change", () => {
      handleUiLanguageChange(elements);
    });

    elements.providerSelect.addEventListener("change", () => {
      syncProviderFields(elements.providerSelect.value, elements);
    });

    elements.form.addEventListener("submit", (event) => {
      void handleSubmit(event, elements);
    });
  }

  const api = {
    collectPageElements,
    getProviderPanelState,
    syncProviderFields,
    readSettingsFromForm,
    renderLocalizedPage,
    initialize,
    handleSubmit,
    handleUiLanguageChange,
    setStatus
  };

  let pageElements = collectPageElements();

  if (pageElements) {
    bindPageEvents(pageElements);
    initialize(pageElements).catch(() => {
      const locale = getResolvedLocale(DEFAULT_SETTINGS.uiLanguage);
      i18n.applyDocumentLanguage(scope.document, locale);
      scope.document.title = i18n.t(locale, "options.documentTitle");
      i18n.applyTranslations(scope.document, locale);
      setStatus("options.loadFailed", "error", pageElements, locale);
    });
  }

  scope.FastTrMailOptionsPage = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
