#!/usr/bin/env bash
# Copy a published release from the source repo to the public downloads repo.
# CI's GITHUB_TOKEN cannot write to another repo, so this runs from a maintainer's machine.
# Usage: GH_TOKEN=... scripts/mirror-release.sh v1.2.3
set -euo pipefail

TAG="${1:?usage: mirror-release.sh <tag>}"
SOURCE_REPO="TheLogsAreScreaming/mesh-client"
TARGET_REPO="TheLogsAreScreaming/mesh-client-releases"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

gh release download "$TAG" -R "$SOURCE_REPO" -D "$WORK_DIR/assets"
gh release view "$TAG" -R "$SOURCE_REPO" --json body --jq .body > "$WORK_DIR/notes.md"
gh release create "$TAG" "$WORK_DIR"/assets/* -R "$TARGET_REPO" --title "Mesh Hub $TAG" --notes-file "$WORK_DIR/notes.md"
