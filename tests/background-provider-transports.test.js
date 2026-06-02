const test = require("node:test");
const assert = require("node:assert/strict");

const { createBackgroundApp } = require("./helpers/background-harness.js");

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

test("translateWithGoogleApi sends the expected request and decodes HTML entities", async () => {
  const { sandbox, background } = createBackgroundApp();
  const requests = [];

  sandbox.fetch = async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      async json() {
        return {
          data: {
            translations: [
              { translatedText: "Tom &amp; Jerry" }
            ]
          }
        };
      }
    };
  };

  const result = await background.translateWithGoogleApi(
    "Hello",
    { googleApiKey: "api-key" },
    background.getLanguageDefinition("en")
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /translation\.googleapis\.com/);
  assert.match(requests[0].url, /key=api-key/);
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    q: "Hello",
    target: "en",
    format: "text"
  });
  assert.deepEqual(toPlainData(result), {
    provider: "google-api",
    providerLabel: "Google Cloud API",
    targetLanguage: "en",
    targetLanguageLabel: "English",
    translatedText: "Tom & Jerry"
  });
});

test("handleSegmentTranslateRequest preserves segment order for google-web fan-out", async () => {
  const { background } = createBackgroundApp();
  const language = background.getLanguageDefinition("zh-CN");

  background.translateWithGoogleWeb = async (text) => {
    if (text === "first") {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { translatedText: "第一段" };
    }

    return { translatedText: "第二段" };
  };

  const result = await background.handleSegmentTranslateRequest(
    ["first", "second"],
    { provider: "google-web" },
    language
  );

  assert.deepEqual(toPlainData(result), {
    provider: "google-web",
    providerLabel: "Google Web（免 Key）",
    targetLanguage: "zh-CN",
    targetLanguageLabel: "简体中文",
    translatedSegments: ["第一段", "第二段"]
  });
});

test("translateSegmentsWithGoogleApi rejects mismatched segment counts", async () => {
  const { sandbox, background } = createBackgroundApp();

  sandbox.fetch = async () => ({
    ok: true,
    async json() {
      return {
        data: {
          translations: [
            { translatedText: "一" }
          ]
        }
      };
    }
  });

  await assert.rejects(
    background.translateSegmentsWithGoogleApi(
      ["one", "two"],
      { googleApiKey: "api-key" },
      background.getLanguageDefinition("zh-CN")
    ),
    (error) => error?.code === "google_api_unavailable"
  );
});

test("translateWithMicrosoft surfaces upstream service error messages", async () => {
  const { sandbox, background } = createBackgroundApp();

  sandbox.fetch = async () => ({
    ok: false,
    async json() {
      return {
        error: {
          message: "bad key"
        }
      };
    }
  });

  await assert.rejects(
    background.translateWithMicrosoft(
      "hello",
      {
        microsoftApiKey: "api-key",
        microsoftRegion: "eastasia"
      },
      background.getLanguageDefinition("zh-CN")
    ),
    (error) => error?.code === "microsoft_unavailable"
  );
});
