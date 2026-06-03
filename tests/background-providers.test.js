const test = require("node:test");
const assert = require("node:assert/strict");

const { createBackgroundApp } = require("./helpers/background-harness.js");

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

test("handleTranslateRequest normalizes settings, sanitizes segments, and finalizes request tracking", async () => {
  const { sandbox, background, catalog } = createBackgroundApp();

  sandbox.chrome.storage.local.get = async () => ({
    provider: "unsupported-provider",
    targetLanguage: "unsupported-language"
  });

  background.handleSegmentTranslateRequest = async (segments, settings, languageDefinition, signal) => {
    assert.deepEqual(segments, ["first", "second"]);
    assert.equal(settings.provider, catalog.DEFAULT_SETTINGS.provider);
    assert.equal(languageDefinition.id, catalog.DEFAULT_SETTINGS.targetLanguage);
    assert.ok(signal);
    assert.equal(background.requestRegistry.has("request-1"), true);

    return {
      provider: settings.provider,
      translatedSegments: ["第一段", "第二段"]
    };
  };

  const result = await background.handleTranslateRequest({
    requestId: " request-1 ",
    segments: [" first ", "", " second "]
  });

  assert.deepEqual(toPlainData(result), {
    provider: catalog.DEFAULT_SETTINGS.provider,
    translatedSegments: ["第一段", "第二段"]
  });
  assert.equal(background.requestRegistry.has("request-1"), false);
});

test("handleTranslateRequest rejects empty text payloads", async () => {
  const { background } = createBackgroundApp();

  await assert.rejects(
    background.handleTranslateRequest({ text: "   " }),
    (error) => error?.code === "empty_translatable_text"
  );
});

test("handleTranslateRequest still reaches google-web when session storage is unavailable", async () => {
  const { sandbox, background } = createBackgroundApp();

  sandbox.chrome.storage.local.get = async () => ({
    provider: "google-web",
    targetLanguage: "zh-CN",
    uiLanguage: "auto"
  });
  delete sandbox.chrome.storage.session;

  background.translateWithGoogleWeb = async (text, languageDefinition, signal) => {
    assert.equal(text, "hello");
    assert.equal(languageDefinition.id, "zh-CN");
    assert.equal(signal, undefined);

    return {
      provider: "google-web",
      translatedText: "你好"
    };
  };

  const result = await background.handleTranslateRequest({ text: "hello" });

  assert.deepEqual(toPlainData(result), {
    provider: "google-web",
    translatedText: "你好"
  });
});

test("cancelTranslateRequest trims request ids before delegating to the registry", () => {
  const { background } = createBackgroundApp();

  background.requestRegistry.register("request-2");

  assert.equal(background.cancelTranslateRequest(" request-2 "), true);
  assert.equal(background.requestRegistry.get("request-2").signal.aborted, true);
  assert.equal(background.cancelTranslateRequest("   "), false);
});
