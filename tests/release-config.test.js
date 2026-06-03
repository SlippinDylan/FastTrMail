const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(repoRoot, "extension", "manifest.json");
const workflowPath = path.join(repoRoot, ".github", "workflows", "package.yml");
const ciWorkflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");
const optionsHtmlPath = path.join(repoRoot, "extension", "options.html");
const popupHtmlPath = path.join(repoRoot, "extension", "popup.html");
const bootstrapPath = path.join(repoRoot, "extension", "background", "bootstrap.js");
const privacyPolicyPath = path.join(repoRoot, "docs", "privacy-policy.html");
const readmeZhPath = path.join(repoRoot, "README.md");
const readmeEnPath = path.join(repoRoot, "README.en.md");

test("manifest grants host permissions for both Google translation endpoints", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.ok(
    manifest.host_permissions.includes("https://translate.googleapis.com/*"),
    "google-web requests need translate.googleapis.com host permission"
  );
  assert.ok(
    manifest.host_permissions.includes("https://translation.googleapis.com/*"),
    "google-api requests need translation.googleapis.com host permission"
  );
});

test("manifest does not keep edge-web review-risk permissions", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.ok(
    !manifest.permissions.includes("declarativeNetRequest"),
    "edge-web transport should not require declarativeNetRequest"
  );
  assert.ok(
    !manifest.host_permissions.includes("https://edge.microsoft.com/*"),
    "edge-web auth host permission should be removed"
  );
});

test("manifest does not request redundant Fastmail host permissions", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.ok(
    !manifest.host_permissions.includes("https://app.fastmail.com/*"),
    "content_scripts matches already scope Fastmail injection; host_permissions should stay minimal"
  );
});

test("workflow reads the package version from extension manifest.json", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /jq -r '\.version' extension\/manifest\.json/);
});

test("workflow publishes versioned releases with zip and crx assets", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /TAG_NAME="\$VERSION"/);
  assert.match(workflow, /RELEASE_TITLE="v\$VERSION"/);
  assert.match(workflow, /gh release create "\$TAG_NAME" .*--title "\$RELEASE_TITLE"/);
  assert.match(workflow, /CURRENT_RELEASE_SHA=/);
  assert.match(workflow, /Version \$VERSION is already published/);
  assert.match(workflow, /fasttrmail-\$\{VERSION\}\.zip/);
  assert.match(workflow, /fasttrmail-\$\{VERSION\}\.crx/);
  assert.match(workflow, /gh release delete-asset "\$TAG_NAME" "\$asset_name"/);
  assert.match(workflow, /dist\/fasttrmail-\$\{VERSION\}\.crx/);
});

test("pull request CI workflow exists and runs tests plus packaging checks", () => {
  const workflow = fs.readFileSync(ciWorkflowPath, "utf8");

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /bash scripts\/package\.sh/);
});

test("release packaging workflow stays focused on main-branch publication", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*-\s*main/);
});

test("release workflow restores the signing key from the repository secret", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /CHROME_EXTENSION_PEM_BASE64/);
  assert.match(workflow, /fasttrmail\.pem/);
  assert.match(workflow, /base64 --decode/);
  assert.match(workflow, /bash scripts\/package-crx\.sh/);
});

test("privacy policy page exists and discloses local storage plus third-party translation transfer", () => {
  const policy = fs.readFileSync(privacyPolicyPath, "utf8");

  assert.match(policy, /Privacy Policy/i);
  assert.match(policy, /does not collect personal data on developer-controlled servers/i);
  assert.match(policy, /only sends email content to the translation service you choose/i);
  assert.match(policy, /API keys are stored locally/i);
  assert.match(policy, /does not sell data/i);
  assert.match(policy, /does not use data for advertising/i);
});

test("packaged zip places manifest.json at the archive root", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const zipPath = path.join(repoRoot, "dist", `fasttrmail-${manifest.version}.zip`);

  childProcess.execFileSync("bash", ["scripts/package.sh"], { cwd: repoRoot });
  const fileList = childProcess.execFileSync("unzip", ["-Z1", zipPath], {
    cwd: repoRoot,
    encoding: "utf8"
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  assert.ok(fileList.includes("manifest.json"), "archive root should include manifest.json");
  assert.ok(!fileList.some((entry) => entry.startsWith("fasttrmail/")), "archive should not wrap files in an extra directory");
});

test("package-crx script signs the unpacked extension with a provided pem key", () => {
  const scriptPath = path.join(repoRoot, "scripts", "package-crx.sh");
  const script = fs.readFileSync(scriptPath, "utf8");

  assert.match(script, /PEM_PATH=/);
  assert.match(script, /\/Applications\/Google Chrome\.app\/Contents\/MacOS\/Google Chrome/);
  assert.match(script, /--pack-extension=/);
  assert.match(script, /--pack-extension-key=/);
  assert.match(script, /fasttrmail-\$VERSION\.crx/);
});

test("options and popup load the shared catalog before their page scripts", () => {
  const optionsHtml = fs.readFileSync(optionsHtmlPath, "utf8");
  const popupHtml = fs.readFileSync(popupHtmlPath, "utf8");

  assert.match(optionsHtml, /<script src="shared\/catalog\.js"><\/script>\s*<script src="shared\/i18n\.js"><\/script>\s*<script src="options\.js"><\/script>/);
  assert.match(popupHtml, /<script src="shared\/catalog\.js"><\/script>\s*<script src="shared\/i18n\.js"><\/script>\s*<script src="popup\.js"><\/script>/);
});

test("README files cross-link languages and document Fastmail-only scope plus license", () => {
  const readmeZh = fs.readFileSync(readmeZhPath, "utf8");
  const readmeEn = fs.readFileSync(readmeEnPath, "utf8");

  assert.match(readmeZh, /\[English\]\(README\.en\.md\)/);
  assert.match(readmeEn, /\[简体中文\]\(README\.md\)/);
  assert.match(readmeZh, /Fastmail/);
  assert.match(readmeZh, /只对 `https:\/\/app\.fastmail\.com\/\*` 生效|仅对 `https:\/\/app\.fastmail\.com\/\*` 生效/);
  assert.match(readmeZh, /## License/);
  assert.match(readmeZh, /\[LICENSE\]\(LICENSE\)/);
});

test("background bootstrap loads shared dependencies before background modules", () => {
  const bootstrapSource = fs.readFileSync(bootstrapPath, "utf8");
  const modulePathsMatch = bootstrapSource.match(/const MODULE_PATHS = \[(.*?)\];/s);

  assert.ok(modulePathsMatch, "background bootstrap should declare module load order");

  const modulePaths = Array.from(modulePathsMatch[1].matchAll(/"([^"]+)"/g)).map((match) => match[1]);
  assert.deepEqual(modulePaths.slice(0, 4), [
    "shared/catalog.js",
    "shared/i18n.js",
    "shared/entities.js",
    "background/request-registry.js"
  ]);
  assert.equal(modulePaths.includes("background/edge-auth.js"), false);
});
