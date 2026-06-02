# FastTrMail

[简体中文](README.md)

FastTrMail is a Chrome Manifest V3 extension built specifically for Fastmail Web. It injects a `Translate` button into Fastmail message views and appends translated content below the original email body.

## Scope

- FastTrMail only works on `https://app.fastmail.com/*`
- It does not add translation features to Gmail, Outlook Web, or other webmail products

## Features

- Injects a `Translate` button into the Fastmail message action area
- Appends translated content below the original message without replacing the source text
- Supports these translation providers:
  - `Google Web (no key, experimental)`
  - `Microsoft Edge (no key)`
  - `Google Cloud API`
  - `Microsoft Translator API`
- Opens a popup from the Chrome toolbar and links directly to the settings page
- Provides a Chinese settings page for provider credentials and target language selection
- Packages automatically through GitHub Actions for `Load unpacked` use and release zip distribution

## Project Structure

- `extension/`: extension source code
- `extension/shared/catalog.js`: shared provider, language, and default settings catalog
- `extension/shared/entities.js`: HTML entity decoder
- `extension/background/bootstrap.js`: background startup entry and observable failure boundary
- `extension/background/request-registry.js`: background request registration and cancellation
- `extension/content/shared.js`: shared constants, global state, and base helpers
- `extension/content/policies.js`: translatable text and message-body detection policies
- `extension/content/retry-policy.js`: render retry budget and backoff policy
- `extension/content/runtime.js`: document lifecycle, generation, cancellation, and state factories
- `extension/content/thread.js`: Fastmail DOM adaptation and thread/message identity logic
- `extension/content/segments.js`: message segmentation strategy
- `extension/content/render.js`: title/body/status rendering
- `extension/content/translation.js`: title and body translation state machine
- `extension/content/controller.js`: events, observers, and refresh scheduling
- `docs/privacy-policy.html`: privacy policy page for store listing
- `scripts/package.sh`: local packaging script
- `.github/workflows/ci.yml`: PR and branch validation workflow
- `.github/workflows/package.yml`: release packaging and publishing workflow for `main`

## Local Installation

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension/` directory for development, or load the unpacked contents from `dist/fasttrmail/` after packaging

## Settings

1. Click the extension icon in the Chrome toolbar
2. Click `打开设置`
3. Select a translation provider and target language
4. If you choose a paid API provider, fill in the required credentials in the settings page

## Provider Credentials

If you use `Google Web (no key)` or `Microsoft Edge (no key)`, you can skip credential setup.

### Google

- Setup guide: https://docs.cloud.google.com/translate/docs/setup
- API key management: https://cloud.google.com/api-keys/docs/create-manage-api-keys
- Google API Console: https://console.cloud.google.com/apis/library/translate.googleapis.com

### Microsoft

- Translator quickstart: https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/quickstart/rest-api
- Azure Portal: https://portal.azure.com/

## Local Packaging

```bash
bash scripts/package.sh
```

## Run Tests

```bash
npm test
```

Packaging outputs:

- `dist/fasttrmail/`
- `dist/fasttrmail.zip`
- `dist/fasttrmail-<version>.zip`

## CI

- `.github/workflows/ci.yml` validates pull requests and `main` branch changes by running tests and a packaging check
- `.github/workflows/package.yml` publishes packaged artifacts and updates the fixed `latest` GitHub Release from `main`
- The extension version is sourced only from `extension/manifest.json`

## License

This project is released under the MIT License. See [LICENSE](LICENSE).

## Notes

- The extension sends email content to the translation provider you select, so it is not an offline translator
- The content script uses DOM observation to adapt to Fastmail's single-page navigation behavior
- If you publish to the Chrome Web Store, you can host `docs/privacy-policy.html` through GitHub Pages as the privacy policy URL
