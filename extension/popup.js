const PROVIDER_LABELS = {
  "google-web": "Google Web（免 Key）",
  "edge-web": "Microsoft Edge（免 Key）",
  "google-api": "Google Cloud API",
  microsoft: "Microsoft Translator API"
};

const LANGUAGE_LABELS = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  ru: "Русский"
};

document.getElementById("open-options").addEventListener("click", async () => {
  await chrome.runtime.openOptionsPage();
  window.close();
});

initialize();

async function initialize() {
  const stored = await chrome.storage.local.get([
    "provider",
    "targetLanguage"
  ]);

  const provider = stored.provider || "google-web";
  const language = stored.targetLanguage || "zh-CN";

  document.getElementById("current-provider").textContent =
    PROVIDER_LABELS[provider] || provider;
  document.getElementById("current-language").textContent =
    LANGUAGE_LABELS[language] || language;
}
