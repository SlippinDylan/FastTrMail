const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const optionsHtmlPath = path.join(repoRoot, "extension", "options.html");
const optionsCssPath = path.join(repoRoot, "extension", "options.css");

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

function flushTasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function loadExtensionScript(relativePath, sandbox) {
  const absolutePath = path.join(repoRoot, "extension", relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInNewContext(source, sandbox, { filename: absolutePath });
}

function createElement(tagName = "div") {
  return {
    tagName: tagName.toUpperCase(),
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    appendChild(child) {
      if (child && Array.isArray(child.children)) {
        this.children.push(...child.children);
        return child;
      }

      this.children.push(child);
      return child;
    },
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    }
  };
}

function createDocument() {
  const nodes = {
    "settings-form": createElement("form"),
    uiLanguage: createElement("select"),
    provider: createElement("select"),
    targetLanguage: createElement("select"),
    "google-provider-panel": createElement("section"),
    "microsoft-provider-panel": createElement("section"),
    googleApiKey: createElement("input"),
    microsoftApiKey: createElement("input"),
    microsoftRegion: createElement("input"),
    status: createElement("span")
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
    },
    createElement(tagName) {
      return createElement(tagName);
    },
    createDocumentFragment() {
      return {
        children: [],
        appendChild(child) {
          this.children.push(child);
          return child;
        }
      };
    }
  };
}

function loadOptionsPage() {
  const document = createDocument();
  const sentMessages = [];
  const sandbox = {
    chrome: {
      runtime: {
        async sendMessage(message) {
          sentMessages.push(message);

          if (message.type === "settings:get-options-view") {
            return {
              ok: true,
              publicSettings: {
                provider: "google-api",
                targetLanguage: "zh-CN",
                uiLanguage: "auto"
              },
              secretSettings: {
                googleApiKey: "",
                microsoftApiKey: "",
                microsoftRegion: ""
              }
            };
          }

          if (message.type === "settings:save-public") {
            return {
              ok: true,
              publicSettings: message.publicSettings
            };
          }

          if (message.type === "settings:save-secrets") {
            return {
              ok: true,
              secretSettings: message.secretSettings
            };
          }

          throw new Error(`Unhandled message type: ${message.type}`);
        }
      }
    },
    document,
    window: {
      setTimeout
    },
    setTimeout,
    clearTimeout,
    console,
    module: { exports: {} },
    exports: {}
  };

  sandbox.globalThis = sandbox;
  loadExtensionScript("shared/catalog.js", sandbox);
  loadExtensionScript("shared/i18n.js", sandbox);
  loadExtensionScript("options.js", sandbox);

  return {
    page: sandbox.FastTrMailOptionsPage || sandbox.module.exports,
    sandbox,
    document,
    sentMessages
  };
}

test("getProviderPanelState exposes only the matching credential section", () => {
  const { page } = loadOptionsPage();

  assert.deepEqual(toPlainData(page.getProviderPanelState("google-web")), {
    googleVisible: false,
    microsoftVisible: false
  });
  assert.deepEqual(toPlainData(page.getProviderPanelState("edge-web")), {
    googleVisible: false,
    microsoftVisible: false
  });
  assert.deepEqual(toPlainData(page.getProviderPanelState("google-api")), {
    googleVisible: true,
    microsoftVisible: false
  });
  assert.deepEqual(toPlainData(page.getProviderPanelState("microsoft")), {
    googleVisible: false,
    microsoftVisible: true
  });
});

test("syncProviderFields toggles panel visibility attributes from the selected provider", () => {
  const { page } = loadOptionsPage();
  const nodes = {
    googlePanel: createElement("section"),
    microsoftPanel: createElement("section")
  };

  page.syncProviderFields("google-api", nodes);
  assert.equal(nodes.googlePanel.hidden, false);
  assert.equal(nodes.microsoftPanel.hidden, true);

  page.syncProviderFields("microsoft", nodes);
  assert.equal(nodes.googlePanel.hidden, true);
  assert.equal(nodes.microsoftPanel.hidden, false);
});

test("options markup keeps one settings card and a standalone save action row", () => {
  const optionsHtml = fs.readFileSync(optionsHtmlPath, "utf8");

  assert.match(optionsHtml, /<section class="card settings-card">/);
  assert.match(optionsHtml, /id="uiLanguage"/);
  assert.match(optionsHtml, /<div class="page-actions">/);
});

test("options markup places the standalone action row after the settings card", () => {
  const optionsHtml = fs.readFileSync(optionsHtmlPath, "utf8");

  const settingsCardIndex = optionsHtml.indexOf("class=\"card settings-card\"");
  const actionRowIndex = optionsHtml.indexOf("class=\"page-actions\"");
  assert.ok(settingsCardIndex >= 0);
  assert.ok(actionRowIndex > settingsCardIndex);
});

test("options page grid keeps cards content-sized instead of stretching to viewport height", () => {
  const optionsCss = fs.readFileSync(optionsCssPath, "utf8");

  assert.match(optionsCss, /\.page\s*\{[\s\S]*align-content:\s*start;/);
});

test("readSettingsFromForm includes uiLanguage and normalizes unsupported values", () => {
  const { page } = loadOptionsPage();
  const elements = {
    uiLanguageSelect: { value: "unsupported" },
    providerSelect: { value: "google-web" },
    targetLanguageSelect: { value: "en" },
    googleApiKeyInput: { value: " key " },
    microsoftApiKeyInput: { value: " secret " },
    microsoftRegionInput: { value: " eastasia " }
  };

  assert.deepEqual(toPlainData(page.readSettingsFromForm(elements)), {
    uiLanguage: "auto",
    provider: "google-web",
    targetLanguage: "en",
    googleApiKey: "key",
    microsoftApiKey: "secret",
    microsoftRegion: "eastasia"
  });
});

test("initialize loads public and secret settings through background messaging", async () => {
  const { page, document, sentMessages } = loadOptionsPage();
  const elements = page.collectPageElements(document);

  await page.initialize(elements);

  assert.equal(sentMessages.at(-1).type, "settings:get-options-view");
  assert.equal(document.nodes.provider.value, "google-api");
  assert.equal(document.nodes.targetLanguage.value, "zh-CN");
  assert.equal(document.nodes.uiLanguage.value, "auto");
});

test("handleSubmit persists public and secret settings through separate background messages", async () => {
  const { page, document, sentMessages } = loadOptionsPage();
  const elements = page.collectPageElements(document);

  document.nodes.uiLanguage.value = "en";
  document.nodes.provider.value = "microsoft";
  document.nodes.targetLanguage.value = "ja";
  document.nodes.googleApiKey.value = " google-key ";
  document.nodes.microsoftApiKey.value = " ms-key ";
  document.nodes.microsoftRegion.value = " global ";

  await page.handleSubmit({ preventDefault() {} }, elements);
  await flushTasks();

  assert.deepEqual(
    toPlainData(sentMessages.slice(-2)),
    [
      {
        type: "settings:save-public",
        publicSettings: {
          uiLanguage: "en",
          provider: "microsoft",
          targetLanguage: "ja"
        }
      },
      {
        type: "settings:save-secrets",
        secretSettings: {
          googleApiKey: "google-key",
          microsoftApiKey: "ms-key",
          microsoftRegion: "global"
        }
      }
    ]
  );
});
