const test = require("node:test");
const assert = require("node:assert/strict");

const i18n = require("../extension/shared/i18n.js");

test("resolveUiLanguage maps browser languages into supported runtime locales", () => {
  assert.equal(i18n.resolveUiLanguage("auto", "zh"), "zh-CN");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-CN"), "zh-CN");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-CHS"), "zh-CN");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-SG"), "zh-CN");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-Hans"), "zh-CN");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-Hant"), "zh-TW");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-CHT"), "zh-TW");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-TW"), "zh-TW");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-Hant-TW"), "zh-TW");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-HK"), "zh-HK");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-MO"), "zh-HK");
  assert.equal(i18n.resolveUiLanguage("auto", "zh-Hant-HK"), "zh-HK");
  assert.equal(i18n.resolveUiLanguage("auto", "en-US"), "en");
  assert.equal(i18n.resolveUiLanguage("auto", "fr-FR"), "en");
});

test("fixed uiLanguage values override browser language", () => {
  assert.equal(i18n.resolveUiLanguage("zh-TW", "en-US"), "zh-TW");
  assert.equal(i18n.resolveUiLanguage("en", "zh-CN"), "en");
});

test("normalizeUiLanguage falls back to auto for unsupported values", () => {
  assert.equal(i18n.normalizeUiLanguage("unsupported"), "auto");
  assert.equal(i18n.normalizeUiLanguage("zh-HK"), "zh-HK");
});

test("provider, target-language, and ui-language labels are localized", () => {
  assert.equal(i18n.getProviderLabel("en", "google-web"), "Google Web (No Key, Experimental)");
  assert.equal(i18n.getProviderLabel("zh-CN", "edge-web"), "Microsoft Edge（免 Key）");
  assert.equal(i18n.getProviderLabel("zh-TW", "microsoft"), "Microsoft Translator API");
  assert.equal(i18n.getTargetLanguageLabel("en", "zh-CN"), "Simplified Chinese");
  assert.equal(i18n.getTargetLanguageLabel("zh-HK", "en"), "英文");
  assert.equal(i18n.getUiLanguageLabel("en", "zh-HK"), "Traditional Chinese (Hong Kong)");
});

test("popup provider status labels are localized", () => {
  assert.equal(i18n.t("en", "popup.providerStatusSetupRequired"), "Setup required");
  assert.equal(i18n.t("en", "popup.providerStatusConfigured"), "Configured");
  assert.equal(i18n.t("zh-CN", "popup.providerStatusExperimental"), "实验模式");
});

test("error codes map to localized messages", () => {
  assert.equal(
    i18n.getErrorMessage("en", i18n.ERROR_CODES.GOOGLE_API_KEY_MISSING),
    "Google Cloud API Key is not configured. Please add it in Settings first."
  );
  assert.equal(
    i18n.getErrorMessage("zh-CN", i18n.ERROR_CODES.EDGE_WEB_UNAVAILABLE),
    "Microsoft Edge 免 Key 翻译请求失败。"
  );
  assert.equal(
    i18n.getErrorMessage("zh-HK", i18n.ERROR_CODES.TRANSLATION_CANCELLED),
    "翻譯請求已取消。"
  );
});

test("message dictionaries stay complete across supported locales", () => {
  const completeness = i18n.assertMessageCompleteness();
  assert.equal(completeness.ok, true);
  assert.deepEqual(completeness.missingKeysByLocale, {});
});
