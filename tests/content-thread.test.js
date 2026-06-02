const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function loadExtensionScript(relativePath, sandbox) {
  const absolutePath = path.join(repoRoot, "extension", relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInNewContext(source, sandbox, { filename: absolutePath });
}

class FakeElement {
  constructor(tagName, { className = "", textContent = "" } = {}) {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this.textContent = textContent;
    this.children = [];
    this.parentElement = null;
    this.ownerDocument = null;
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.isConnected = true;
    this._innerHTML = "";
    this.rect = { width: 1, height: 1 };
    this.classList = {
      contains: (token) => this.className.split(/\s+/).filter(Boolean).includes(token),
      toggle: (token, force) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        const shouldHave = typeof force === "boolean" ? force : !current.has(token);
        if (shouldHave) {
          current.add(token);
        } else {
          current.delete(token);
        }
        this.className = Array.from(current).join(" ");
        return shouldHave;
      }
    };
  }

  getBoundingClientRect() {
    return { ...this.rect };
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];

    if (this._innerHTML.includes("<span class=\"label\"></span>")) {
      const label = this.ownerDocument.createElement("span");
      label.className = "label";
      this.appendChild(label);
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    if (child.parentElement) {
      child.parentElement.removeChild(child);
    }
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  insertBefore(child, referenceNode) {
    if (child.parentElement) {
      child.parentElement.removeChild(child);
    }

    const referenceIndex = this.children.indexOf(referenceNode);
    if (referenceIndex < 0) {
      return this.appendChild(child);
    }

    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.splice(referenceIndex, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parentElement = null;
    }
    return child;
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    if (name === "class") {
      return this.className;
    }

    return this.attributes[name] || null;
  }

  matches(selector) {
    if (selector.startsWith(".")) {
      return selector
        .slice(1)
        .split(".")
        .every((token) => this.classList.contains(token));
    }

    return this.tagName === selector.toUpperCase();
  }

  closest(selector) {
    let current = this;

    while (current) {
      if (current.matches(selector)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    if (selector === ":scope > button") {
      return this.children.filter((child) => child.tagName === "BUTTON");
    }

    const selectors = selector.trim().split(/\s+/);
    const results = [];

    for (const descendant of this.getDescendants()) {
      if (matchesSelectorChain(descendant, selectors)) {
        results.push(descendant);
      }
    }

    return results;
  }

  getDescendants() {
    const descendants = [];

    for (const child of this.children) {
      descendants.push(child, ...child.getDescendants());
    }

    return descendants;
  }
}

class FakeDocument extends FakeElement {
  constructor() {
    super("#document");
    this.ownerDocument = this;
    this.documentElement = { lang: "" };
    this.body = this.createElement("body");
    super.appendChild(this.body);
  }

  createElement(tagName) {
    const element = new FakeElement(tagName);
    element.ownerDocument = this;
    return element;
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

function matchesSelectorChain(element, selectors) {
  let current = element;

  for (let index = selectors.length - 1; index >= 0; index -= 1) {
    if (!current || !current.matches(selectors[index])) {
      return false;
    }

    if (index === 0) {
      return true;
    }

    current = current.parentElement;
    while (current && !current.matches(selectors[index - 1])) {
      current = current.parentElement;
    }
  }

  return true;
}

function append(parent, child) {
  parent.appendChild(child);
  return child;
}

function createSandbox(document) {
  const sandbox = {
    chrome: {
      i18n: {
        getUILanguage() {
          return "zh-CN";
        }
      }
    },
    navigator: {
      language: "zh-CN"
    },
    document,
    HTMLElement: FakeElement,
    HTMLButtonElement: FakeElement,
    console,
    window: {
      location: {
        pathname: "/mail",
        search: ""
      }
    }
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function buildConversationDocument() {
  const document = new FakeDocument();
  const conversation = append(document.body, document.createElement("div"));
  conversation.className = "v-Page";

  const toolbar = append(conversation, document.createElement("div"));
  toolbar.className = "v-Toolbar";

  append(toolbar, createLabeledButton(document, "存档"));
  append(toolbar, document.createElement("span")).className = "v-Toolbar-divider";
  append(toolbar, createLabeledButton(document, "删除"));
  append(toolbar, document.createElement("span")).className = "v-Toolbar-divider";
  append(toolbar, createLabeledButton(document, "移至"));
  append(toolbar, document.createElement("span")).className = "v-Toolbar-divider";
  const moreButton = append(toolbar, createLabeledButton(document, "更多"));
  append(toolbar, document.createElement("div")).className = "v-Toolbar-flex";

  const pageContent = append(conversation, document.createElement("div"));
  pageContent.className = "v-Page-content";

  const threadRoot = append(pageContent, document.createElement("div"));
  threadRoot.className = "v-Thread";

  const threadTitle = append(threadRoot, document.createElement("div"));
  threadTitle.className = "v-Thread-title u-flex";
  const titleWrapper = append(threadTitle, document.createElement("div"));
  titleWrapper.className = "u-flex-1";
  append(titleWrapper, document.createElement("h1")).textContent = "Example thread";
  append(threadTitle, createLabeledButton(document, "打印"));

  return {
    document,
    conversation,
    pageContent,
    toolbar,
    moreButton,
    threadRoot,
    threadTitle
  };
}

function buildMultiThreadDocument() {
  const base = buildConversationDocument();
  const secondThreadRoot = append(base.pageContent, base.document.createElement("div"));
  secondThreadRoot.className = "v-Thread";
  const secondThreadTitle = append(secondThreadRoot, base.document.createElement("div"));
  secondThreadTitle.className = "v-Thread-title u-flex";
  const titleWrapper = append(secondThreadTitle, base.document.createElement("div"));
  titleWrapper.className = "u-flex-1";
  append(titleWrapper, base.document.createElement("h1")).textContent = "Second thread";

  return {
    ...base,
    secondThreadRoot,
    secondThreadTitle
  };
}

function createLabeledButton(document, label) {
  const button = document.createElement("button");
  const span = document.createElement("span");
  span.className = "label";
  span.textContent = label;
  button.appendChild(span);
  return button;
}

function loadThreadApp(document) {
  const sandbox = createSandbox(document);
  loadExtensionScript("shared/i18n.js", sandbox);
  loadExtensionScript("content/shared.js", sandbox);
  loadExtensionScript("content/thread.js", sandbox);
  return sandbox.FastTrMailContent;
}

test("injectButtons inserts the translate button into the top toolbar right after 更多", () => {
  const { document, toolbar, moreButton, threadTitle } = buildConversationDocument();
  const app = loadThreadApp(document);

  app.thread.injectButtons(document, () => {});

  const translateButton = toolbar.querySelector(".fmt-translate-button");
  const translateDivider = toolbar.querySelector(".fmt-translate-divider");
  assert.ok(translateButton, "expected translate button inside the top toolbar");
  assert.ok(translateDivider, "expected native divider before translate button");
  assert.equal(toolbar.children[toolbar.children.indexOf(moreButton) + 1], translateDivider);
  assert.equal(toolbar.children[toolbar.children.indexOf(moreButton) + 2], translateButton);
  assert.equal(threadTitle.querySelector(".fmt-translate-button"), null);
});

test("findThreadRoot resolves the active thread for a toolbar translate button", () => {
  const { document, toolbar, threadRoot } = buildConversationDocument();
  const app = loadThreadApp(document);

  app.thread.injectButtons(document, () => {});

  const translateButton = toolbar.querySelector(".fmt-translate-button");
  assert.equal(app.thread.findThreadRoot(translateButton), threadRoot);
});

test("findThreadRoot keeps the toolbar button bound to its original thread even if thread order changes", () => {
  const { document, toolbar, pageContent, threadRoot, secondThreadRoot } = buildMultiThreadDocument();
  const app = loadThreadApp(document);

  threadRoot.rect = { width: 640, height: 480 };
  secondThreadRoot.rect = { width: 0, height: 0 };

  app.thread.injectButtons(document, () => {});

  const translateButton = toolbar.querySelector(".fmt-translate-button");
  assert.equal(app.thread.findThreadRoot(translateButton), threadRoot);

  pageContent.removeChild(threadRoot);
  pageContent.appendChild(threadRoot);

  assert.equal(app.thread.findThreadRoot(translateButton), threadRoot);
  assert.notEqual(app.thread.findThreadRoot(translateButton), secondThreadRoot);
});

test("injectButtons removes a toolbar translate button when the page no longer has a thread title", () => {
  const { document, toolbar, threadRoot, threadTitle } = buildConversationDocument();
  const app = loadThreadApp(document);

  app.thread.injectButtons(document, () => {});
  assert.ok(toolbar.querySelector(".fmt-translate-button"));
  assert.ok(toolbar.querySelector(".fmt-translate-divider"));

  threadRoot.removeChild(threadTitle);
  app.thread.injectButtons(document, () => {});

  assert.equal(toolbar.querySelector(".fmt-translate-button"), null);
  assert.equal(toolbar.querySelector(".fmt-translate-divider"), null);
});

test("injectButtons binds the toolbar button to the visible thread when multiple thread roots exist", () => {
  const { document, toolbar, threadRoot, secondThreadRoot } = buildMultiThreadDocument();
  const app = loadThreadApp(document);

  threadRoot.rect = { width: 0, height: 0 };
  secondThreadRoot.rect = { width: 640, height: 480 };

  app.thread.injectButtons(document, () => {});

  const translateButton = toolbar.querySelector(".fmt-translate-button");
  assert.equal(app.thread.findThreadRoot(translateButton), secondThreadRoot);
  assert.notEqual(app.thread.findThreadRoot(translateButton), threadRoot);
});

test("syncThreadButtons updates the mapped toolbar button state", () => {
  const { document, toolbar, secondThreadRoot } = buildMultiThreadDocument();
  const app = loadThreadApp(document);

  app.thread.injectButtons(document, () => {});

  const translateButton = toolbar.querySelector(".fmt-translate-button");
  assert.equal(translateButton.classList.contains("fmt-translate-button-active"), false);

  app.thread.syncThreadButtons(secondThreadRoot, true);
  assert.equal(translateButton.classList.contains("fmt-translate-button-active"), true);

  app.thread.syncThreadButtons(secondThreadRoot, false);
  assert.equal(translateButton.classList.contains("fmt-translate-button-active"), false);
});
