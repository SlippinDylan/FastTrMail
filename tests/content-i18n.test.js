const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadExtensionScript(relativePath, sandbox) {
  const absolutePath = path.join(repoRoot, "extension", relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInNewContext(source, sandbox, { filename: absolutePath });
}

function createSandbox(uiLanguage = "zh-HK") {
  const sentMessages = [];
  const sandbox = {
    chrome: {
      i18n: {
        getUILanguage() {
          return "en-US";
        }
      },
      runtime: {
        async sendMessage(message) {
          sentMessages.push(message);
          return {
            ok: true,
            uiContext: {
              uiLanguage,
              locale: uiLanguage
            }
          };
        }
      }
    },
    navigator: {
      language: "en-US"
    },
    window: {
      location: {
        pathname: "/mail",
        search: ""
      }
    },
    console
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.__sentMessages__ = sentMessages;
  return sandbox;
}

test("content i18n refreshLocale uses background ui context instead of direct storage access", async () => {
  const sandbox = createSandbox("zh-HK");
  loadExtensionScript("shared/i18n.js", sandbox);
  loadExtensionScript("content/shared.js", sandbox);

  const locale = await sandbox.FastTrMailContent.i18n.refreshLocale();

  assert.equal(locale, "zh-HK");
  assert.deepEqual(toPlainData(sandbox.__sentMessages__), [{ type: "settings:get-ui-context" }]);
  assert.equal(sandbox.FastTrMailContent.i18n.t("content.translate"), "翻譯");
});

test("content i18n maps background error codes into localized strings", () => {
  const sandbox = createSandbox("en");
  loadExtensionScript("shared/i18n.js", sandbox);
  loadExtensionScript("content/shared.js", sandbox);
  sandbox.FastTrMailContent.state.uiLocale = "en";

  assert.equal(
    sandbox.FastTrMailContent.i18n.resolveErrorMessage({ errorCode: "google_api_key_missing" }),
    "Google Cloud API Key is not configured. Please add it in Settings first."
  );
});

test("content i18n keeps locale-specific fallback ordering for generic error lookups", () => {
  const sandbox = createSandbox("zh-HK");
  loadExtensionScript("shared/i18n.js", sandbox);
  loadExtensionScript("content/shared.js", sandbox);
  sandbox.FastTrMailContent.state.uiLocale = "zh-HK";

  assert.equal(
    sandbox.FastTrMailContent.i18n.getErrorMessage("translation_request_failed", "zh-HK"),
    "翻譯請求失敗。"
  );
});

test("content i18n preserves upstream error details when provided", () => {
  const sandbox = createSandbox("zh-TW");
  loadExtensionScript("shared/i18n.js", sandbox);
  loadExtensionScript("content/shared.js", sandbox);
  sandbox.FastTrMailContent.state.uiLocale = "zh-TW";

  assert.equal(
    sandbox.FastTrMailContent.i18n.resolveErrorMessage({
      errorCode: "microsoft_unavailable",
      metadata: {
        upstreamMessage: "The subscription key is invalid."
      }
    }),
    "Microsoft 翻譯請求失敗。\nThe subscription key is invalid."
  );
});
