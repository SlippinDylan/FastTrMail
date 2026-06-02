(function initBackgroundSettings(scope) {
  const ns = scope.FastTrMailBackground;

  ns.installDefaultSettings = async function installDefaultSettings() {
    const keys = Object.keys(ns.DEFAULT_SETTINGS);
    const current = await chrome.storage.local.get(keys);
    const normalized = ns.normalizeSettings(current);
    const nextSettings = {};

    for (const key of keys) {
      if (current[key] !== normalized[key]) {
        nextSettings[key] = normalized[key];
      }
    }

    if (Object.keys(nextSettings).length > 0) {
      await chrome.storage.local.set(nextSettings);
    }
  };

  ns.getSettings = async function getSettings() {
    const stored = await chrome.storage.local.get(Object.keys(ns.DEFAULT_SETTINGS));
    return ns.normalizeSettings(stored);
  };

  ns.getLanguageDefinition = function getLanguageDefinition(languageId) {
    return ns.LANGUAGE_DEFINITIONS.find((item) => item.id === languageId) || null;
  };
})(self);
