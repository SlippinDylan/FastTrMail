(function initBackgroundSettings(scope) {
  const ns = scope.FastTrMailBackground;

  async function readNormalized(area, keys, normalize) {
    const stored = await area.get(keys);
    return normalize(stored);
  }

  function collectChangedValues(keys, current, normalized) {
    const nextValues = {};

    for (const key of keys) {
      if (current[key] !== normalized[key]) {
        nextValues[key] = normalized[key];
      }
    }

    return nextValues;
  }

  ns.configureStorageAccess = async function configureStorageAccess() {
    await Promise.all([
      typeof chrome.storage?.local?.setAccessLevel === "function"
        ? chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
        : Promise.resolve(),
      typeof chrome.storage?.session?.setAccessLevel === "function"
        ? chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
        : Promise.resolve()
    ]);
  };

  ns.installDefaultSettings = async function installDefaultSettings() {
    await ns.configureStorageAccess();

    const currentPublicSettings = await chrome.storage.local.get(ns.PUBLIC_SETTINGS_KEYS);
    const legacySecretSettings = await chrome.storage.local.get(ns.SECRET_SETTINGS_KEYS);
    const normalizedPublicSettings = ns.normalizePublicSettings(currentPublicSettings);
    const nextPublicSettings = collectChangedValues(
      ns.PUBLIC_SETTINGS_KEYS,
      currentPublicSettings,
      normalizedPublicSettings
    );

    if (Object.keys(nextPublicSettings).length > 0) {
      await chrome.storage.local.set(nextPublicSettings);
    }

    const currentSecretSettings = await chrome.storage.session.get(ns.SECRET_SETTINGS_KEYS);
    const normalizedSecretSettings = ns.normalizeSecretSettings({
      ...legacySecretSettings,
      ...currentSecretSettings
    });
    const nextSecretSettings = collectChangedValues(
      ns.SECRET_SETTINGS_KEYS,
      currentSecretSettings,
      normalizedSecretSettings
    );

    if (Object.keys(nextSecretSettings).length > 0) {
      await chrome.storage.session.set(nextSecretSettings);
    }

    if (typeof chrome.storage.local.remove === "function") {
      await chrome.storage.local.remove(ns.SECRET_SETTINGS_KEYS);
    }
  };

  ns.getPublicSettings = async function getPublicSettings() {
    return readNormalized(chrome.storage.local, ns.PUBLIC_SETTINGS_KEYS, ns.normalizePublicSettings);
  };

  ns.getSecretSettings = async function getSecretSettings() {
    return readNormalized(chrome.storage.session, ns.SECRET_SETTINGS_KEYS, ns.normalizeSecretSettings);
  };

  ns.getEffectiveSettings = async function getEffectiveSettings() {
    const [publicSettings, secretSettings] = await Promise.all([
      ns.getPublicSettings(),
      ns.getSecretSettings()
    ]);

    return {
      ...publicSettings,
      ...secretSettings
    };
  };

  ns.getUiContext = async function getUiContext() {
    const publicSettings = await ns.getPublicSettings();
    return {
      uiLanguage: publicSettings.uiLanguage,
      locale: ns.resolveUiLanguage(publicSettings.uiLanguage)
    };
  };

  ns.savePublicSettings = async function savePublicSettings(settings) {
    const normalized = ns.normalizePublicSettings(settings);
    await chrome.storage.local.set(normalized);
    return normalized;
  };

  ns.saveSecretSettings = async function saveSecretSettings(settings) {
    const normalized = ns.normalizeSecretSettings(settings);
    await chrome.storage.session.set(normalized);
    return normalized;
  };

  ns.getLanguageDefinition = function getLanguageDefinition(languageId) {
    return ns.LANGUAGE_DEFINITIONS.find((item) => item.id === languageId) || null;
  };
})(self);
