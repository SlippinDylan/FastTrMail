const test = require("node:test");
const assert = require("node:assert/strict");

const catalog = require("../extension/shared/catalog.js");

test("default settings point to a supported provider and language", () => {
  assert.ok(catalog.PROVIDERS.some((provider) => provider.id === catalog.DEFAULT_SETTINGS.provider));
  assert.ok(catalog.LANGUAGES.some((language) => language.id === catalog.DEFAULT_SETTINGS.targetLanguage));
  assert.equal(catalog.DEFAULT_SETTINGS.uiLanguage, "auto");
});

test("provider labels and language labels are derived from the shared catalog", () => {
  assert.equal(catalog.PROVIDER_LABELS["google-web"], "Google Web（免 Key）");
  assert.equal(catalog.PROVIDER_LABELS["edge-web"], "Microsoft Edge（免 Key）");
  assert.equal(catalog.LANGUAGE_LABELS["zh-CN"], "简体中文");
  assert.equal(catalog.LANGUAGE_LABELS.en, "English");
});

test("normalizeSettings falls back to supported defaults and trims credential fields", () => {
  assert.deepEqual(
    catalog.normalizeSettings({
      provider: "unsupported-provider",
      targetLanguage: "unsupported-language",
      uiLanguage: "unsupported-ui-language",
      googleApiKey: " key ",
      microsoftApiKey: 123,
      microsoftRegion: " eastasia "
    }),
    {
      provider: catalog.DEFAULT_SETTINGS.provider,
      targetLanguage: catalog.DEFAULT_SETTINGS.targetLanguage,
      uiLanguage: catalog.DEFAULT_SETTINGS.uiLanguage,
      googleApiKey: "key",
      microsoftApiKey: "",
      microsoftRegion: "eastasia"
    }
  );
});
