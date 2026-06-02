(function initOptionsPage(scope) {
  const { DEFAULT_SETTINGS, LANGUAGES, PROVIDERS, normalizeSettings } = scope.FastTrMailCatalog;

  function collectPageElements(documentRef = scope.document) {
    if (!documentRef || typeof documentRef.getElementById !== "function") {
      return null;
    }

    const elements = {
      form: documentRef.getElementById("settings-form"),
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

  function populateLanguageOptions(selectNode) {
    const fragment = scope.document.createDocumentFragment();

    for (const language of LANGUAGES) {
      const option = scope.document.createElement("option");
      option.value = language.id;
      option.textContent = language.label;
      fragment.appendChild(option);
    }

    selectNode.appendChild(fragment);
  }

  function populateProviderOptions(selectNode) {
    selectNode.innerHTML = "";

    const fragment = scope.document.createDocumentFragment();

    for (const provider of PROVIDERS) {
      const option = scope.document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.label;
      fragment.appendChild(option);
    }

    selectNode.appendChild(fragment);
  }

  function readSettingsFromForm(elements = pageElements) {
    return normalizeSettings({
      provider: elements.providerSelect.value,
      targetLanguage: elements.targetLanguageSelect.value,
      googleApiKey: elements.googleApiKeyInput.value.trim(),
      microsoftApiKey: elements.microsoftApiKeyInput.value.trim(),
      microsoftRegion: elements.microsoftRegionInput.value.trim()
    });
  }

  async function initialize(elements = pageElements) {
    populateProviderOptions(elements.providerSelect);
    populateLanguageOptions(elements.targetLanguageSelect);

    const stored = await scope.chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const settings = normalizeSettings(stored);

    elements.providerSelect.value = settings.provider;
    elements.targetLanguageSelect.value = settings.targetLanguage;
    elements.googleApiKeyInput.value = settings.googleApiKey;
    elements.microsoftApiKeyInput.value = settings.microsoftApiKey;
    elements.microsoftRegionInput.value = settings.microsoftRegion;

    syncProviderFields(settings.provider, elements);
  }

  function setStatus(message, state, elements = pageElements) {
    const statusNode = elements?.statusNode;
    if (!statusNode) {
      return;
    }

    statusNode.textContent = message;
    statusNode.dataset.state = state;

    if (state !== "success") {
      return;
    }

    scope.window.setTimeout(() => {
      if (statusNode.textContent === message && statusNode.dataset.state === state) {
        statusNode.textContent = "";
        statusNode.dataset.state = "";
      }
    }, 1800);
  }

  async function handleSubmit(event, elements = pageElements) {
    event.preventDefault();

    try {
      const settings = readSettingsFromForm(elements);
      await scope.chrome.storage.local.set(settings);
      setStatus("设置已保存。", "success", elements);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "设置保存失败。", "error", elements);
    }
  }

  function bindPageEvents(elements = pageElements) {
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
    initialize,
    handleSubmit,
    setStatus
  };

  let pageElements = collectPageElements();

  if (pageElements) {
    bindPageEvents(pageElements);
    initialize(pageElements).catch((error) => {
      setStatus(error instanceof Error ? error.message : "设置页初始化失败。", "error", pageElements);
    });
  }

  scope.FastTrMailOptionsPage = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
