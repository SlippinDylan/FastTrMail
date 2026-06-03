const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..", "..");

const DEFAULT_MODULE_PATHS = [
  "shared/catalog.js",
  "shared/i18n.js",
  "shared/entities.js",
  "background/request-registry.js",
  "background/shared.js",
  "background/settings.js",
  "background/providers.js",
  "background/handlers.js"
];

function createChromeStub() {
  const listeners = {
    installed: [],
    message: []
  };
  const accessLevelCalls = {
    local: [],
    session: []
  };

  const chrome = {
    runtime: {
      onInstalled: {
        addListener(listener) {
          listeners.installed.push(listener);
        }
      },
      onMessage: {
        addListener(listener) {
          listeners.message.push(listener);
        }
      }
    },
    storage: {
      local: {
        async get() {
          return {};
        },
        async set() {
        },
        async remove() {
        },
        async setAccessLevel(options) {
          accessLevelCalls.local.push(options);
        }
      },
      session: {
        async get() {
          return {};
        },
        async set() {
        },
        async remove() {
        },
        async setAccessLevel(options) {
          accessLevelCalls.session.push(options);
        }
      }
    }
  };

  return { chrome, listeners, accessLevelCalls };
}

function createBackgroundSandbox(overrides = {}) {
  const { chrome, listeners, accessLevelCalls } = createChromeStub();
  const sandbox = {
    AbortController,
    URL,
    atob(value) {
      return Buffer.from(value, "base64").toString("binary");
    },
    chrome,
    console,
    fetch: async () => {
      throw new Error("fetch was not stubbed for this test");
    },
    clearTimeout,
    setTimeout,
    ...overrides
  };

  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.__listeners__ = listeners;
  sandbox.__accessLevelCalls__ = accessLevelCalls;
  return sandbox;
}

function loadExtensionScript(relativePath, sandbox) {
  const absolutePath = path.join(repoRoot, "extension", relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInNewContext(source, sandbox, { filename: absolutePath });
}

function loadBackgroundModules(sandbox, modulePaths = DEFAULT_MODULE_PATHS) {
  for (const modulePath of modulePaths) {
    loadExtensionScript(modulePath, sandbox);
  }

  return sandbox;
}

function createBackgroundApp(options = {}) {
  const sandbox = createBackgroundSandbox(options);
  loadBackgroundModules(sandbox, options.modulePaths);

  return {
    sandbox,
    background: sandbox.FastTrMailBackground,
    catalog: sandbox.FastTrMailCatalog,
    listeners: sandbox.__listeners__,
    accessLevelCalls: sandbox.__accessLevelCalls__
  };
}

module.exports = {
  DEFAULT_MODULE_PATHS,
  createBackgroundSandbox,
  loadBackgroundModules,
  createBackgroundApp
};
