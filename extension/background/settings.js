(function initBackgroundSettings(scope) {
  const ns = scope.FastTrMailBackground;
  let volatileSecretSettings = ns.normalizeSecretSettings({});

  async function readNormalized(area, keys, normalize) {
    const stored = await area.get(keys);
    return normalize(stored);
  }

  function getSessionStorageArea() {
    const area = chrome.storage?.session;

    if (!area || typeof area.get !== "function" || typeof area.set !== "function") {
      return null;
    }

    return area;
  }

  async function loadSecretSettingsSnapshot() {
    const sessionArea = getSessionStorageArea();

    if (!sessionArea) {
      return {
        settings: { ...volatileSecretSettings },
        persisted: false
      };
    }

    try {
      const normalized = await readNormalized(
        sessionArea,
        ns.SECRET_SETTINGS_KEYS,
        ns.normalizeSecretSettings
      );
      volatileSecretSettings = normalized;
      return {
        settings: { ...normalized },
        persisted: true
      };
    } catch (_error) {
      return {
        settings: { ...volatileSecretSettings },
        persisted: false
      };
    }
  }

  async function persistSecretSettingsSnapshot(settings) {
    const normalized = ns.normalizeSecretSettings(settings);
    volatileSecretSettings = normalized;

    const sessionArea = getSessionStorageArea();
    if (!sessionArea) {
      return {
        normalized,
        persisted: false
      };
    }

    try {
      await sessionArea.set(normalized);
      return {
        normalized,
        persisted: true
      };
    } catch (_error) {
      return {
        normalized,
        persisted: false
      };
    }
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

  function mergeSecretSettingsSources(legacySettings, currentSettings) {
    const legacy = ns.normalizeSecretSettings(legacySettings);
    const current = ns.normalizeSecretSettings(currentSettings);
    const merged = {};

    for (const key of ns.SECRET_SETTINGS_KEYS) {
      merged[key] = current[key] || legacy[key] || "";
    }

    return merged;
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

    const currentSecretState = await loadSecretSettingsSnapshot();
    const currentSecretSettings = currentSecretState.settings;
    const normalizedSecretSettings = mergeSecretSettingsSources(
      legacySecretSettings,
      currentSecretSettings
    );
    const nextSecretSettings = collectChangedValues(
      ns.SECRET_SETTINGS_KEYS,
      currentSecretSettings,
      normalizedSecretSettings
    );

    const sessionWrite = Object.keys(nextSecretSettings).length > 0
      ? await persistSecretSettingsSnapshot(normalizedSecretSettings)
      : { persisted: currentSecretState.persisted };

    if (sessionWrite.persisted && typeof chrome.storage.local.remove === "function") {
      await chrome.storage.local.remove(ns.SECRET_SETTINGS_KEYS);
    }
  };

  ns.getPublicSettings = async function getPublicSettings() {
    return readNormalized(chrome.storage.local, ns.PUBLIC_SETTINGS_KEYS, ns.normalizePublicSettings);
  };

  ns.getSecretSettings = async function getSecretSettings() {
    return (await loadSecretSettingsSnapshot()).settings;
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
    const { normalized } = await persistSecretSettingsSnapshot(settings);
    return normalized;
  };

  ns.getLanguageDefinition = function getLanguageDefinition(languageId) {
    return ns.LANGUAGE_DEFINITIONS.find((item) => item.id === languageId) || null;
  };
})(self);
