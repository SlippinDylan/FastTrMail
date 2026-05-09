const DEFAULT_SETTINGS = {
  provider: "google-web",
  targetLanguage: "zh-CN",
  googleApiKey: "",
  microsoftApiKey: "",
  microsoftRegion: ""
};

const LANGUAGES = [
  { id: "zh-CN", label: "简体中文" },
  { id: "zh-TW", label: "繁體中文" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
  { id: "ru", label: "Русский" }
];

const form = document.getElementById("settings-form");
const providerSelect = document.getElementById("provider");
const targetLanguageSelect = document.getElementById("targetLanguage");
const googleCard = document.getElementById("google-card");
const microsoftCard = document.getElementById("microsoft-card");
const statusNode = document.getElementById("status");

initialize();

async function initialize() {
  populateLanguageOptions();

  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const settings = { ...DEFAULT_SETTINGS, ...stored };

  providerSelect.value = settings.provider;
  targetLanguageSelect.value = settings.targetLanguage;
  document.getElementById("googleApiKey").value = settings.googleApiKey;
  document.getElementById("microsoftApiKey").value = settings.microsoftApiKey;
  document.getElementById("microsoftRegion").value = settings.microsoftRegion;

  syncProviderFields();
}

providerSelect.addEventListener("change", syncProviderFields);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const settings = {
    provider: providerSelect.value,
    targetLanguage: targetLanguageSelect.value,
    googleApiKey: document.getElementById("googleApiKey").value.trim(),
    microsoftApiKey: document.getElementById("microsoftApiKey").value.trim(),
    microsoftRegion: document.getElementById("microsoftRegion").value.trim()
  };

  await chrome.storage.local.set(settings);
  statusNode.textContent = "设置已保存。";
  window.setTimeout(() => {
    if (statusNode.textContent === "设置已保存。") {
      statusNode.textContent = "";
    }
  }, 1800);
});

function populateLanguageOptions() {
  const fragment = document.createDocumentFragment();

  for (const language of LANGUAGES) {
    const option = document.createElement("option");
    option.value = language.id;
    option.textContent = language.label;
    fragment.appendChild(option);
  }

  targetLanguageSelect.appendChild(fragment);
}

function syncProviderFields() {
  const provider = providerSelect.value;
  googleCard.dataset.active = provider === "google-api" ? "true" : "false";
  microsoftCard.dataset.active = provider === "microsoft" ? "true" : "false";
}
