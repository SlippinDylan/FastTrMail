#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/dist"
PACKAGE_DIR="$BUILD_DIR/fasttrmail"
VERSION="$(node -p "require(process.argv[1]).version" "$ROOT_DIR/extension/manifest.json")"
ZIP_PATH="$BUILD_DIR/fasttrmail.zip"
VERSIONED_ZIP_PATH="$BUILD_DIR/fasttrmail-$VERSION.zip"

rm -rf "$PACKAGE_DIR" "$ZIP_PATH" "$VERSIONED_ZIP_PATH"
mkdir -p "$PACKAGE_DIR"

cp -R "$ROOT_DIR/extension/." "$PACKAGE_DIR/"
find "$PACKAGE_DIR" -name .DS_Store -delete

cd "$BUILD_DIR"
zip -rq "$(basename "$ZIP_PATH")" "$(basename "$PACKAGE_DIR")"
cp "$ZIP_PATH" "$VERSIONED_ZIP_PATH"

echo "Packaged extension $VERSION at $ZIP_PATH and $VERSIONED_ZIP_PATH"
