const test = require("node:test");
const assert = require("node:assert/strict");

const { createBackgroundApp } = require("./helpers/background-harness.js");

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

const SETTINGS_MODULES = [
  "shared/catalog.js",
  "shared/i18n.js",
  "shared/entities.js",
  "background/request-registry.js",
  "background/shared.js",
  "background/settings.js"
];

test("installDefaultSettings repairs missing and unsupported stored settings", async () => {
  const { sandbox, background, catalog } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });
  const localWrites = [];
  const sessionWrites = [];
  const localRemovals = [];

  sandbox.chrome.storage.local.get = async (keys) => {
    if (Array.isArray(keys) && keys.includes("googleApiKey")) {
      return {
        googleApiKey: " key "
      };
    }

    return {
      provider: "unsupported-provider",
      targetLanguage: "xx"
    };
  };
  sandbox.chrome.storage.local.set = async (settings) => {
    localWrites.push(settings);
  };
  sandbox.chrome.storage.local.remove = async (keys) => {
    localRemovals.push(keys);
  };
  sandbox.chrome.storage.session.get = async () => ({});
  sandbox.chrome.storage.session.set = async (settings) => {
    sessionWrites.push(settings);
  };

  await background.installDefaultSettings();

  assert.deepEqual(toPlainData(localWrites), [{
    provider: catalog.DEFAULT_PUBLIC_SETTINGS.provider,
    targetLanguage: catalog.DEFAULT_PUBLIC_SETTINGS.targetLanguage,
    uiLanguage: catalog.DEFAULT_PUBLIC_SETTINGS.uiLanguage
  }]);
  assert.deepEqual(toPlainData(sessionWrites), [{
    googleApiKey: "key",
    microsoftApiKey: "",
    microsoftRegion: ""
  }]);
  assert.deepEqual(toPlainData(localRemovals), [[
    "googleApiKey",
    "microsoftApiKey",
    "microsoftRegion"
  ]]);
});

test("getPublicSettings normalizes only public settings", async () => {
  const { sandbox, background, catalog } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });

  sandbox.chrome.storage.local.get = async () => ({
    provider: "unsupported-provider",
    targetLanguage: "xx",
    uiLanguage: "unsupported-ui-language",
    googleApiKey: "should-be-ignored"
  });

  const settings = await background.getPublicSettings();

  assert.deepEqual(toPlainData(settings), {
    ...catalog.DEFAULT_PUBLIC_SETTINGS
  });
});

test("getSecretSettings normalizes only secret settings", async () => {
  const { sandbox, background } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });

  sandbox.chrome.storage.session.get = async () => ({
    provider: "google-web",
    googleApiKey: 123,
    microsoftApiKey: " secret ",
    microsoftRegion: null
  });

  const settings = await background.getSecretSettings();

  assert.deepEqual(toPlainData(settings), {
    googleApiKey: "",
    microsoftApiKey: "secret",
    microsoftRegion: ""
  });
});

test("getEffectiveSettings merges normalized public and secret settings before provider execution", async () => {
  const { sandbox, background, catalog } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });

  sandbox.chrome.storage.local.get = async () => ({
    provider: "unsupported-provider",
    targetLanguage: "xx",
    uiLanguage: "unsupported-ui-language"
  });
  sandbox.chrome.storage.session.get = async () => ({
    googleApiKey: 123,
    microsoftApiKey: " secret ",
    microsoftRegion: null
  });

  const settings = await background.getEffectiveSettings();

  assert.deepEqual(toPlainData(settings), {
    ...catalog.DEFAULT_SETTINGS,
    microsoftApiKey: "secret"
  });
});

test("savePublicSettings persists normalized public settings in local storage only", async () => {
  const { sandbox, background } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });
  const writes = [];

  sandbox.chrome.storage.local.set = async (settings) => {
    writes.push(settings);
  };

  const saved = await background.savePublicSettings({
    provider: "unsupported-provider",
    targetLanguage: "en",
    uiLanguage: "unsupported-ui-language",
    googleApiKey: "ignored"
  });

  assert.deepEqual(toPlainData(writes), [{
    provider: "google-api",
    targetLanguage: "en",
    uiLanguage: "auto"
  }]);
  assert.deepEqual(toPlainData(saved), {
    provider: "google-api",
    targetLanguage: "en",
    uiLanguage: "auto"
  });
});

test("saveSecretSettings persists normalized secret settings in session storage only", async () => {
  const { sandbox, background } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });
  const writes = [];

  sandbox.chrome.storage.session.set = async (settings) => {
    writes.push(settings);
  };

  const saved = await background.saveSecretSettings({
    googleApiKey: " key ",
    microsoftApiKey: 123,
    microsoftRegion: " eastasia ",
    provider: "ignored"
  });

  assert.deepEqual(toPlainData(writes), [{
    googleApiKey: "key",
    microsoftApiKey: "",
    microsoftRegion: "eastasia"
  }]);
  assert.deepEqual(toPlainData(saved), {
    googleApiKey: "key",
    microsoftApiKey: "",
    microsoftRegion: "eastasia"
  });
});

test("configureStorageAccess restricts local and session storage to trusted contexts", async () => {
  const { background, accessLevelCalls } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });

  await background.configureStorageAccess();

  assert.deepEqual(toPlainData(accessLevelCalls), {
    local: [{ accessLevel: "TRUSTED_CONTEXTS" }],
    session: [{ accessLevel: "TRUSTED_CONTEXTS" }]
  });
});

test("getLanguageDefinition returns the configured language metadata when supported", () => {
  const { background } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });

  assert.deepEqual(toPlainData(background.getLanguageDefinition("zh-CN")), {
    id: "zh-CN",
    label: "简体中文",
    google: "zh-CN",
    microsoft: "zh-Hans"
  });
  assert.equal(background.getLanguageDefinition("unsupported"), null);
});
