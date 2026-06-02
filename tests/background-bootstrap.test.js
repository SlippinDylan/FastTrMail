const test = require("node:test");
const assert = require("node:assert/strict");

const bootstrap = require("../extension/background/bootstrap.js");

test("logs background startup failures instead of swallowing them", () => {
  const errors = [];

  const result = bootstrap.start({
    importScriptsFn() {
      throw new Error("boom");
    },
    runtimeScope: {},
    logger: {
      error(...args) {
        errors.push(args);
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(errors.length, 1);
  assert.match(String(errors[0][0]), /Background startup failed/);
  assert.match(String(errors[0][1]), /boom/);
});

test("initializes the background application when modules load correctly", () => {
  let initialized = 0;

  const result = bootstrap.start({
    importScriptsFn() {},
    runtimeScope: {
      FastTrMailBackground: {
        initialize() {
          initialized += 1;
        }
      }
    },
    logger: console
  });

  assert.equal(result.ok, true);
  assert.equal(initialized, 1);
});
