const { DEFAULT_SETTINGS, normalizeSettings } = globalThis.FastTrMailCatalog;
const i18n = globalThis.FastTrMailI18n;

document.getElementById("open-options").addEventListener("click", async () => {
  await chrome.runtime.openOptionsPage();
  window.close();
});

initialize().catch(() => {
  const locale = i18n.resolveUiLanguage(DEFAULT_SETTINGS.uiLanguage);
  applyLocalizedFrame(locale);
  const loadFailed = i18n.t(locale, "popup.loadFailed");
  document.getElementById("current-provider").textContent = loadFailed;
  document.getElementById("current-language").textContent = loadFailed;
});

async function initialize() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const settings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...stored
  });
  const locale = i18n.resolveUiLanguage(settings.uiLanguage);

  applyLocalizedFrame(locale);

  document.getElementById("current-provider").textContent =
    i18n.getProviderLabel(locale, settings.provider);
  document.getElementById("current-language").textContent =
    i18n.getTargetLanguageLabel(locale, settings.targetLanguage);
}

function applyLocalizedFrame(locale) {
  i18n.applyDocumentLanguage(document, locale);
  document.title = i18n.t(locale, "popup.documentTitle");
  i18n.applyTranslations(document, locale);
}
