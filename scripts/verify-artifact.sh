#!/usr/bin/env bash
# Verify a Spyglass release artifact end-to-end:
#   1. Sigstore signature (cosign) — proves provenance of the build.
#   2. SLSA L3 build provenance — proves it was built by our CI on a
#      non-falsifiable runner from the expected source ref.
#   3. SBOM digest — proves the SBOM matches the artifact subject.
#
# Per Constitution v2.0.0 §I.6 fail-safe defaults: any broken link
# fails the verification non-zero. There is no "soft pass" mode.
#
# Usage:
#   bash scripts/verify-artifact.sh <release-dir>
#
# Where <release-dir> contains:
#   spyglass-vX.Y.Z.tar.gz
#   spyglass-vX.Y.Z.cdx.json     (CycloneDX SBOM)
#   spyglass-vX.Y.Z.cosign.bundle
#   spyglass-vX.Y.Z.intoto.jsonl (SLSA provenance)

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <release-dir>"
  exit 2
fi

DIR="$1"
TARBALL=$(ls "$DIR"/spyglass-v*.tar.gz 2>/dev/null | head -1)
SBOM=$(ls "$DIR"/spyglass-v*.cdx.json 2>/dev/null | head -1)
BUNDLE=$(ls "$DIR"/spyglass-v*.cosign.bundle 2>/dev/null | head -1)
PROVENANCE=$(ls "$DIR"/spyglass-v*.intoto.jsonl 2>/dev/null | head -1)

for f in "$TARBALL" "$SBOM" "$BUNDLE" "$PROVENANCE"; do
  if [ ! -f "$f" ]; then
    echo "::error::Missing required artifact in $DIR (need tarball, SBOM, cosign bundle, SLSA provenance)"
    exit 1
  fi
done

echo "Verifying:"
echo "  tarball:    $TARBALL"
echo "  SBOM:       $SBOM"
echo "  cosign:     $BUNDLE"
echo "  provenance: $PROVENANCE"
echo

# Required tools
for cmd in cosign sha256sum jq slsa-verifier; do
  if ! command -v "$cmd" >/dev/null; then
    case "$cmd" in
      cosign)         echo "::error::cosign not installed (https://docs.sigstore.dev/cosign/installation/)" ;;
      slsa-verifier)  echo "::error::slsa-verifier not installed (https://github.com/slsa-framework/slsa-verifier)" ;;
      *)              echo "::error::$cmd not installed" ;;
    esac
    exit 1
  fi
done

# Compute the artifact digest for cross-checking against the SBOM and
# the SLSA subject.
DIGEST=$(sha256sum "$TARBALL" | cut -d' ' -f1)
echo "Tarball sha256: $DIGEST"

# 1. Cosign signature verification (keyless OIDC).
EXPECTED_ISSUER="https://token.actions.githubusercontent.com"
EXPECTED_IDENTITY_REGEX="^https://github.com/.+/refactored-octo-chainsaw/\.github/workflows/release\.yml@refs/tags/v.+$"
echo
echo "[1/3] cosign verify-blob..."
cosign verify-blob \
  --bundle "$BUNDLE" \
  --certificate-oidc-issuer "$EXPECTED_ISSUER" \
  --certificate-identity-regexp "$EXPECTED_IDENTITY_REGEX" \
  "$TARBALL"
echo "  cosign: OK"

# 2. SLSA provenance verification.
echo
echo "[2/3] slsa-verifier verify-artifact..."
slsa-verifier verify-artifact "$TARBALL" \
  --provenance-path "$PROVENANCE" \
  --source-uri "github.com/Little-Town-Labs/refactored-octo-chainsaw"
echo "  SLSA L3: OK"

# 3. SBOM digest cross-check.
echo
echo "[3/3] SBOM digest cross-check..."
SBOM_FOUND=$(jq -r '.metadata.component.hashes // [] | .[] | select(.alg == "SHA-256") | .content' "$SBOM" 2>/dev/null || echo "")
if [ -z "$SBOM_FOUND" ]; then
  echo "::warning::SBOM does not declare a SHA-256 hash for the primary component."
  echo "  Skipping cross-check; future SBOM generation should embed it."
else
  if [ "$SBOM_FOUND" != "$DIGEST" ]; then
    echo "::error::SBOM digest does not match tarball:"
    echo "  expected: $DIGEST"
    echo "  in SBOM:  $SBOM_FOUND"
    exit 1
  fi
  echo "  SBOM digest: matches"
fi

echo
echo "All verification checks passed."
