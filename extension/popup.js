const { PROVIDER_LABELS, LANGUAGE_LABELS, DEFAULT_SETTINGS, normalizeSettings } = globalThis.FastTrMailCatalog;

document.getElementById("open-options").addEventListener("click", async () => {
  await chrome.runtime.openOptionsPage();
  window.close();
});

initialize().catch(() => {
  document.getElementById("current-provider").textContent = "读取失败";
  document.getElementById("current-language").textContent = "读取失败";
});

async function initialize() {
  const stored = await chrome.storage.local.get([
    "provider",
    "targetLanguage"
  ]);

  const settings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...stored
  });
  const provider = settings.provider;
  const language = settings.targetLanguage;

  document.getElementById("current-provider").textContent =
    PROVIDER_LABELS[provider] || provider;
  document.getElementById("current-language").textContent =
    LANGUAGE_LABELS[language] || language;
}
