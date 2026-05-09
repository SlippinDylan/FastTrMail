(function initBackgroundSettings(scope) {
  const ns = scope.FastTrMailBackground;

  ns.installDefaultSettings = async function installDefaultSettings() {
    const current = await chrome.storage.local.get(Object.keys(ns.DEFAULT_SETTINGS));
    const nextSettings = {};

    for (const [key, value] of Object.entries(ns.DEFAULT_SETTINGS)) {
      if (typeof current[key] === "undefined") {
        nextSettings[key] = value;
      }
    }

    if (Object.keys(nextSettings).length > 0) {
      await chrome.storage.local.set(nextSettings);
    }
  };

  ns.getSettings = async function getSettings() {
    const stored = await chrome.storage.local.get(Object.keys(ns.DEFAULT_SETTINGS));
    return { ...ns.DEFAULT_SETTINGS, ...stored };
  };

  ns.getLanguageDefinition = function getLanguageDefinition(languageId) {
    return ns.LANGUAGE_DEFINITIONS.find((item) => item.id === languageId) || null;
  };
})(self);
