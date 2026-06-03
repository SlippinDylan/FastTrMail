const { DEFAULT_PUBLIC_SETTINGS, DEFAULT_SECRET_SETTINGS, normalizeSettings } = globalThis.FastTrMailCatalog;
const i18n = globalThis.FastTrMailI18n;

document.getElementById("open-options").addEventListener("click", async () => {
  await chrome.runtime.openOptionsPage();
  window.close();
});

initialize().catch(() => {
  const locale = i18n.resolveUiLanguage(DEFAULT_PUBLIC_SETTINGS.uiLanguage);
  applyLocalizedFrame(locale);
  const loadFailed = i18n.t(locale, "popup.loadFailed");
  document.getElementById("current-provider").textContent = loadFailed;
  document.getElementById("current-language").textContent = loadFailed;
  const statusNode = document.getElementById("current-status");
  if (statusNode) {
    statusNode.textContent = loadFailed;
  }
});

async function initialize() {
  const response = await chrome.runtime.sendMessage({ type: "settings:get-options-view" });
  if (!response?.ok) {
    throw new Error(response?.errorCode || "settings_read_failed");
  }

  const settings = normalizeSettings({
    ...DEFAULT_PUBLIC_SETTINGS,
    ...DEFAULT_SECRET_SETTINGS,
    ...response.publicSettings,
    ...response.secretSettings
  });
  const locale = i18n.resolveUiLanguage(settings.uiLanguage);

  applyLocalizedFrame(locale);

  document.getElementById("current-provider").textContent =
    i18n.getProviderLabel(locale, settings.provider);
  document.getElementById("current-language").textContent =
    i18n.getTargetLanguageLabel(locale, settings.targetLanguage);

  const statusNode = document.getElementById("current-status");
  if (statusNode) {
    statusNode.textContent = i18n.t(locale, getProviderStatusMessageKey(settings));
  }
}

function applyLocalizedFrame(locale) {
  i18n.applyDocumentLanguage(document, locale);
  document.title = i18n.t(locale, "popup.documentTitle");
  i18n.applyTranslations(document, locale);
}

function getProviderStatusMessageKey(settings) {
  if (settings.provider === "google-web") {
    return "popup.providerStatusExperimental";
  }

  if (settings.provider === "google-api") {
    return settings.googleApiKey
      ? "popup.providerStatusConfigured"
      : "popup.providerStatusSetupRequired";
  }

  return settings.microsoftApiKey && settings.microsoftRegion
    ? "popup.providerStatusConfigured"
    : "popup.providerStatusSetupRequired";
}
