(function initCatalog(scope) {
  const PROVIDERS = [
    { id: "google-api", label: "Google Cloud API" },
    { id: "microsoft", label: "Microsoft Translator API" },
    { id: "google-web", label: "Google Web（免 Key，实验性）" },
    { id: "edge-web", label: "Microsoft Edge（免 Key）" }
  ];

  const LANGUAGES = [
    { id: "zh-CN", label: "简体中文", google: "zh-CN", microsoft: "zh-Hans" },
    { id: "zh-TW", label: "繁體中文", google: "zh-TW", microsoft: "zh-Hant" },
    { id: "en", label: "English", google: "en", microsoft: "en" },
    { id: "ja", label: "日本語", google: "ja", microsoft: "ja" },
    { id: "ko", label: "한국어", google: "ko", microsoft: "ko" },
    { id: "fr", label: "Français", google: "fr", microsoft: "fr" },
    { id: "de", label: "Deutsch", google: "de", microsoft: "de" },
    { id: "es", label: "Español", google: "es", microsoft: "es" },
    { id: "it", label: "Italiano", google: "it", microsoft: "it" },
    { id: "pt", label: "Português", google: "pt", microsoft: "pt" },
    { id: "ru", label: "Русский", google: "ru", microsoft: "ru" }
  ];

  const DEFAULT_PUBLIC_SETTINGS = {
    provider: "google-api",
    targetLanguage: "zh-CN",
    uiLanguage: "auto"
  };

  const DEFAULT_SECRET_SETTINGS = {
    googleApiKey: "",
    microsoftApiKey: "",
    microsoftRegion: ""
  };
  const DEFAULT_SETTINGS = {
    ...DEFAULT_PUBLIC_SETTINGS,
    ...DEFAULT_SECRET_SETTINGS
  };
  const PUBLIC_SETTINGS_KEYS = Object.freeze(Object.keys(DEFAULT_PUBLIC_SETTINGS));
  const SECRET_SETTINGS_KEYS = Object.freeze(Object.keys(DEFAULT_SECRET_SETTINGS));
  const PROVIDER_IDS = new Set(PROVIDERS.map((provider) => provider.id));
  const LANGUAGE_IDS = new Set(LANGUAGES.map((language) => language.id));
  const UI_LANGUAGE_IDS = new Set(["auto", "zh-CN", "en", "zh-TW", "zh-HK"]);

  const PROVIDER_LABELS = Object.freeze(
    Object.fromEntries(PROVIDERS.map((provider) => [provider.id, provider.label]))
  );

  const LANGUAGE_LABELS = Object.freeze(
    Object.fromEntries(LANGUAGES.map((language) => [language.id, language.label]))
  );

  function normalizeOptionalText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizePublicSettings(settings) {
    const source = settings && typeof settings === "object" ? settings : {};

    return {
      provider: PROVIDER_IDS.has(source.provider) ? source.provider : DEFAULT_PUBLIC_SETTINGS.provider,
      targetLanguage: LANGUAGE_IDS.has(source.targetLanguage) ? source.targetLanguage : DEFAULT_PUBLIC_SETTINGS.targetLanguage,
      uiLanguage: UI_LANGUAGE_IDS.has(source.uiLanguage) ? source.uiLanguage : DEFAULT_PUBLIC_SETTINGS.uiLanguage
    };
  }

  function normalizeSecretSettings(settings) {
    const source = settings && typeof settings === "object" ? settings : {};

    return {
      googleApiKey: normalizeOptionalText(source.googleApiKey),
      microsoftApiKey: normalizeOptionalText(source.microsoftApiKey),
      microsoftRegion: normalizeOptionalText(source.microsoftRegion)
    };
  }

  function normalizeSettings(settings) {
    return {
      ...normalizePublicSettings(settings),
      ...normalizeSecretSettings(settings)
    };
  }

  const api = {
    PROVIDERS: Object.freeze(PROVIDERS.map((provider) => ({ ...provider }))),
    PROVIDER_LABELS,
    LANGUAGES: Object.freeze(LANGUAGES.map((language) => ({ ...language }))),
    LANGUAGE_DEFINITIONS: Object.freeze(LANGUAGES.map((language) => ({ ...language }))),
    LANGUAGE_LABELS,
    PUBLIC_SETTINGS_KEYS,
    SECRET_SETTINGS_KEYS,
    DEFAULT_PUBLIC_SETTINGS: Object.freeze({ ...DEFAULT_PUBLIC_SETTINGS }),
    DEFAULT_SECRET_SETTINGS: Object.freeze({ ...DEFAULT_SECRET_SETTINGS }),
    DEFAULT_SETTINGS: Object.freeze({ ...DEFAULT_SETTINGS }),
    normalizePublicSettings,
    normalizeSecretSettings,
    normalizeSettings
  };

  scope.FastTrMailCatalog = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
