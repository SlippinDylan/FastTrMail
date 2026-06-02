const test = require("node:test");
const assert = require("node:assert/strict");

const entities = require("../extension/shared/entities.js");

test("decodes common named HTML entities", () => {
  assert.equal(entities.decodeHtmlEntities("Tom &amp; Jerry &lt;3"), "Tom & Jerry <3");
  assert.equal(entities.decodeHtmlEntities("&quot;hello&quot; &#39;world&#39;"), "\"hello\" 'world'");
});

test("decodes decimal and hexadecimal numeric entities", () => {
  assert.equal(entities.decodeHtmlEntities("&#20320;&#22909;"), "你好");
  assert.equal(entities.decodeHtmlEntities("&#x4F60;&#x597D;"), "你好");
});
