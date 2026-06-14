const test = require("node:test");
const assert = require("node:assert/strict");

const catalog = require("../extension/shared/catalog.js");

test("default settings point to a supported provider and language", () => {
  assert.ok(catalog.PROVIDERS.some((provider) => provider.id === catalog.DEFAULT_SETTINGS.provider));
  assert.ok(catalog.LANGUAGES.some((language) => language.id === catalog.DEFAULT_SETTINGS.targetLanguage));
  assert.equal(catalog.DEFAULT_SETTINGS.uiLanguage, "auto");
  assert.equal(catalog.DEFAULT_SETTINGS.provider, "google-api");
});

test("provider labels and language labels are derived from the shared catalog", () => {
  assert.equal(catalog.PROVIDER_LABELS["google-web"], "Google Web（免 Key，实验性）");
  assert.equal(catalog.PROVIDER_LABELS["edge-web"], "Microsoft Edge（免 Key）");
  assert.equal(catalog.PROVIDER_LABELS.microsoft, "Microsoft Translator API");
  assert.equal(catalog.LANGUAGE_LABELS["zh-CN"], "简体中文");
  assert.equal(catalog.LANGUAGE_LABELS.en, "English");
});

test("provider catalog restores edge-web transport", () => {
  assert.equal(catalog.PROVIDERS.some((provider) => provider.id === "edge-web"), true);
  assert.equal(Object.hasOwn(catalog.PROVIDER_LABELS, "edge-web"), true);
});

test("provider catalog keeps official APIs first and experimental providers last", () => {
  assert.deepEqual(
    catalog.PROVIDERS.map((provider) => provider.id),
    ["google-api", "microsoft", "google-web", "edge-web"]
  );
});

test("normalizePublicSettings falls back to supported defaults without credential fields", () => {
  assert.deepEqual(
    catalog.normalizePublicSettings({
      provider: "unsupported-provider",
      targetLanguage: "unsupported-language",
      uiLanguage: "unsupported-ui-language",
      googleApiKey: " key "
    }),
    {
      provider: catalog.DEFAULT_PUBLIC_SETTINGS.provider,
      targetLanguage: catalog.DEFAULT_PUBLIC_SETTINGS.targetLanguage,
      uiLanguage: catalog.DEFAULT_PUBLIC_SETTINGS.uiLanguage
    }
  );
});

test("normalizeSecretSettings trims only secret fields", () => {
  assert.deepEqual(
    catalog.normalizeSecretSettings({
      googleApiKey: " key ",
      microsoftApiKey: 123,
      microsoftRegion: " eastasia ",
      provider: "google-web"
    }),
    {
      googleApiKey: "key",
      microsoftApiKey: "",
      microsoftRegion: "eastasia"
    }
  );
});

test("normalizeSettings merges normalized public and secret settings", () => {
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
