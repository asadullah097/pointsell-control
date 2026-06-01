License Signing Keys
====================

This directory holds the Ed25519 private key used to sign license files.

SETUP (one time):
  node ../../tools/keygen/generate-keypair.js

  Then copy the generated private.pem here:
    cp ../../tools/keygen/private.pem ./private.pem

  Paste the printed public key into:
    ../../nestjs-pos/src/modules/license/license.constants.ts

SECURITY RULES:
  - private.pem must NEVER be committed to git (.gitignore covers it)
  - private.pem must NEVER leave the control panel server
  - Back up private.pem to a secure password manager (e.g. 1Password, Bitwarden)
  - Rotating keys invalidates ALL existing license files — clients must re-activate
  - If you suspect the key is compromised: rotate immediately + re-issue all licenses

FILES:
  private.pem   — Ed25519 private key (PKCS#8 PEM) — NEVER COMMIT
  README.txt    — this file
