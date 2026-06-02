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
  const writes = [];

  sandbox.chrome.storage.local.get = async () => ({
    provider: "unsupported-provider",
    targetLanguage: "xx",
    googleApiKey: " key "
  });
  sandbox.chrome.storage.local.set = async (settings) => {
    writes.push(settings);
  };

  await background.installDefaultSettings();

  assert.deepEqual(toPlainData(writes), [{
    provider: catalog.DEFAULT_SETTINGS.provider,
    targetLanguage: catalog.DEFAULT_SETTINGS.targetLanguage,
    uiLanguage: catalog.DEFAULT_SETTINGS.uiLanguage,
    googleApiKey: "key",
    microsoftApiKey: "",
    microsoftRegion: ""
  }]);
});

test("getSettings normalizes persisted settings before returning them", async () => {
  const { sandbox, background, catalog } = createBackgroundApp({ modulePaths: SETTINGS_MODULES });

  sandbox.chrome.storage.local.get = async () => ({
    provider: "unsupported-provider",
    targetLanguage: "xx",
    googleApiKey: 123,
    microsoftApiKey: " secret ",
    microsoftRegion: null
  });

  const settings = await background.getSettings();

  assert.deepEqual(toPlainData(settings), {
    ...catalog.DEFAULT_SETTINGS,
    microsoftApiKey: "secret"
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
