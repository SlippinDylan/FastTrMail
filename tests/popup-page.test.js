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

function createElement() {
  return {
    textContent: "",
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
  };
}

function createDocument() {
  const nodes = {
    "open-options": createElement(),
    "current-provider": createElement(),
    "current-language": createElement(),
    "current-status": createElement()
  };

  return {
    nodes,
    title: "",
    documentElement: {
      lang: ""
    },
    getElementById(id) {
      return nodes[id] || null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function flushTasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function loadPopup(response) {
  const document = createDocument();
  const sentMessages = [];
  let openOptionsCalls = 0;
  let closeCalls = 0;
  const sandbox = {
    chrome: {
      runtime: {
        async sendMessage(message) {
          sentMessages.push(message);
          return response;
        },
        async openOptionsPage() {
          openOptionsCalls += 1;
        }
      }
    },
    document,
    window: {
      close() {
        closeCalls += 1;
      }
    },
    console
  };

  sandbox.globalThis = sandbox;
  loadExtensionScript("shared/catalog.js", sandbox);
  loadExtensionScript("shared/i18n.js", sandbox);
  loadExtensionScript("popup.js", sandbox);

  return {
    document,
    sentMessages,
    getOpenOptionsCalls() {
      return openOptionsCalls;
    },
    getCloseCalls() {
      return closeCalls;
    }
  };
}

test("popup loads provider summary through background messaging and surfaces setup state", async () => {
  const popup = loadPopup({
    ok: true,
    publicSettings: {
      provider: "google-api",
      targetLanguage: "en",
      uiLanguage: "en"
    },
    secretSettings: {
      googleApiKey: "",
      microsoftApiKey: "",
      microsoftRegion: ""
    }
  });

  await flushTasks();

  assert.deepEqual(toPlainData(popup.sentMessages), [{ type: "settings:get-options-view" }]);
  assert.equal(popup.document.nodes["current-provider"].textContent, "Google Cloud API");
  assert.equal(popup.document.nodes["current-language"].textContent, "English");
  assert.equal(popup.document.nodes["current-status"].textContent, "Setup required");
});

test("popup open settings button still opens the options page", async () => {
  const popup = loadPopup({
    ok: true,
    publicSettings: {
      provider: "google-web",
      targetLanguage: "zh-CN",
      uiLanguage: "zh-CN"
    },
    secretSettings: {
      googleApiKey: "",
      microsoftApiKey: "",
      microsoftRegion: ""
    }
  });

  await popup.document.nodes["open-options"].listeners.click();

  assert.equal(popup.getOpenOptionsCalls(), 1);
  assert.equal(popup.getCloseCalls(), 1);
});
