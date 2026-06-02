const test = require("node:test");
const assert = require("node:assert/strict");

const policies = require("../extension/content/policies.js");

test("treats short latin replies as translatable content", () => {
  assert.equal(policies.hasTranslatableText("Thanks"), true);
  assert.equal(policies.isExplicitBodyText("Thanks"), true);
  assert.equal(policies.isCandidateBodyText("Thanks"), true);
});

test("treats Chinese content as translatable content", () => {
  assert.equal(policies.hasTranslatableText("这是中文邮件"), true);
  assert.equal(policies.hasTranslatableText("你好"), true);
});

test("rejects blank and bare URL content", () => {
  assert.equal(policies.hasTranslatableText(""), false);
  assert.equal(policies.hasTranslatableText("   "), false);
  assert.equal(policies.hasTranslatableText("https://example.com"), false);
});
