const test = require("node:test");
const assert = require("node:assert/strict");

const { createBackgroundApp } = require("./helpers/background-harness.js");

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

function flushMicrotasks() {
  return new Promise((resolve) => queueMicrotask(resolve));
}

test("initialize registers install and message listeners", () => {
  const { background, listeners } = createBackgroundApp();

  background.initialize();

  assert.equal(listeners.installed.length, 1);
  assert.equal(listeners.message.length, 1);
  assert.equal(listeners.installed[0], background.installDefaultSettings);
  assert.equal(listeners.message[0], background.handleMessage);
});

test("handleMessage resolves translate-email requests asynchronously", async () => {
  const { background } = createBackgroundApp();
  const result = {
    translatedSegments: ["你好"]
  };

  background.handleTranslateRequest = async (message) => {
    assert.equal(message.type, "translate-email");
    return result;
  };

  let payload = null;
  const keepChannelOpen = background.handleMessage(
    { type: "translate-email", segments: ["hello"] },
    {},
    (response) => {
      payload = response;
    }
  );

  await flushMicrotasks();

  assert.equal(keepChannelOpen, true);
  assert.deepEqual(toPlainData(payload), { ok: true, result });
});

test("handleMessage maps aborted translations to a cancelled response", async () => {
  const { background } = createBackgroundApp();

  background.handleTranslateRequest = async () => {
    const error = new Error("stop");
    error.name = "AbortError";
    throw error;
  };

  let payload = null;
  background.handleMessage(
    { type: "translate-email", segments: ["hello"] },
    {},
    (response) => {
      payload = response;
    }
  );

  await flushMicrotasks();

  assert.deepEqual(toPlainData(payload), {
    ok: false,
    cancelled: true,
    errorCode: "translation_cancelled"
  });
});

test("handleMessage falls back to stable error messages for non-Error failures", async () => {
  const { background } = createBackgroundApp();

  background.handleTranslateRequest = async () => {
    throw "boom";
  };
  background.getSettings = async () => {
    throw "boom";
  };

  let translatePayload = null;
  background.handleMessage(
    { type: "translate-email", segments: ["hello"] },
    {},
    (response) => {
      translatePayload = response;
    }
  );

  let settingsPayload = null;
  background.handleMessage(
    { type: "get-settings" },
    {},
    (response) => {
      settingsPayload = response;
    }
  );

  await flushMicrotasks();

  assert.deepEqual(toPlainData(translatePayload), {
    ok: false,
    errorCode: "translation_request_failed"
  });
  assert.deepEqual(toPlainData(settingsPayload), {
    ok: false,
    errorCode: "settings_read_failed"
  });
});

test("handleMessage serves get-settings and cancel-translation requests", async () => {
  const { background } = createBackgroundApp();

  background.getSettings = async () => ({ provider: "google-web" });
  background.cancelTranslateRequest = (requestId) => requestId === "request-1";

  let settingsPayload = null;
  const settingsAsync = background.handleMessage(
    { type: "get-settings" },
    {},
    (response) => {
      settingsPayload = response;
    }
  );

  let cancelPayload = null;
  const cancelAsync = background.handleMessage(
    { type: "cancel-translation", requestId: "request-1" },
    {},
    (response) => {
      cancelPayload = response;
    }
  );

  await flushMicrotasks();

  assert.equal(settingsAsync, true);
  assert.deepEqual(toPlainData(settingsPayload), {
    ok: true,
    settings: { provider: "google-web" }
  });
  assert.equal(cancelAsync, false);
  assert.deepEqual(toPlainData(cancelPayload), {
    ok: true,
    cancelled: true
  });
});

test("handleMessage ignores unknown and malformed messages", () => {
  const { background } = createBackgroundApp();

  assert.equal(background.handleMessage(null, {}, () => {}), false);
  assert.equal(background.handleMessage({ type: "unknown" }, {}, () => {}), false);
});
