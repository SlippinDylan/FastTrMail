#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/dist"
PACKAGE_DIR="$BUILD_DIR/fasttrmail"
VERSION="$(node -p "require(process.argv[1]).version" "$ROOT_DIR/extension/manifest.json")"
PEM_PATH="${CHROME_EXTENSION_PEM_PATH:-${1:-}}"
UNVERSIONED_CRX_PATH="$BUILD_DIR/fasttrmail.crx"
VERSIONED_CRX_PATH="$BUILD_DIR/fasttrmail-$VERSION.crx"

find_chrome_bin() {
  local candidate

  for candidate in \
    "${CHROME_BIN:-}" \
    chrome \
    google-chrome \
    google-chrome-stable \
    chromium \
    chromium-browser \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/usr/bin/google-chrome" \
    "/usr/bin/chromium" \
    "/usr/bin/chromium-browser"
  do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi

    if [[ -n "$candidate" ]] && command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done

  return 1
}

if [[ -z "$PEM_PATH" ]]; then
  echo "CHROME_EXTENSION_PEM_PATH or a pem file path argument is required." >&2
  exit 1
fi

if [[ ! -d "$PACKAGE_DIR" ]]; then
  echo "Packaged extension directory not found at $PACKAGE_DIR. Run scripts/package.sh first." >&2
  exit 1
fi

if [[ ! -f "$PEM_PATH" ]]; then
  echo "PEM file not found at $PEM_PATH." >&2
  exit 1
fi

CHROME_CMD="$(find_chrome_bin)" || {
  echo "Unable to find a Chrome or Chromium binary for CRX packaging." >&2
  exit 1
}

rm -f "$UNVERSIONED_CRX_PATH" "$VERSIONED_CRX_PATH"

"$CHROME_CMD" \
  --no-message-box \
  --pack-extension="$PACKAGE_DIR" \
  --pack-extension-key="$PEM_PATH"

if [[ ! -f "$UNVERSIONED_CRX_PATH" ]]; then
  echo "Expected CRX output was not generated at $UNVERSIONED_CRX_PATH." >&2
  exit 1
fi

mv "$UNVERSIONED_CRX_PATH" "$VERSIONED_CRX_PATH"

echo "Packaged signed extension $VERSION at $VERSIONED_CRX_PATH"
