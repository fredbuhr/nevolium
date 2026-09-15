#!/usr/bin/env python3
"""Static contract for the D06 multilingual Web foundation."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "apps/web"


def main() -> None:
    i18n = (WEB / "src/i18n.tsx").read_text(encoding="utf-8")
    entrypoint = (WEB / "src/main.tsx").read_text(encoding="utf-8")
    app = (WEB / "src/App.tsx").read_text(encoding="utf-8")
    offline = (WEB / "public/offline.html").read_text(encoding="utf-8")
    index = (WEB / "index.html").read_text(encoding="utf-8")
    manifest = json.loads((WEB / "public/manifest.webmanifest").read_text(encoding="utf-8"))

    assert "export type AppLanguage = 'fr' | 'en'" in i18n
    assert "locale: 'fr-FR'" in i18n
    assert "locale: 'en-GB'" in i18n
    assert "newsLanguage: 'fr'" in i18n
    assert "newsLanguage: 'en'" in i18n
    assert "nevolium.language.v1" in i18n
    assert "document.documentElement.lang = language" in i18n
    assert "window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)" in i18n

    assert "<LocaleProvider>" in entrypoint
    assert "<LanguageSwitcher />" in entrypoint
    assert "const { language, locale, newsLanguage } = useI18n()" in app
    assert "locale," in app
    assert "language: newsLanguage" in app
    assert "locale: 'fr-FR'" not in app
    assert "language: 'fr'" not in app

    assert manifest.get("lang") is None
    assert manifest["description"] == "Nevolium · Mycelium workspace"
    assert 'content="Nevolium · Mycelium workspace"' in index
    assert "nevolium.language.v1" in offline
    assert "document.documentElement.lang = 'en'" in offline
    assert "The cockpit is waiting for the server" in offline

    print(
        "D06 LOCALE CONTRACT PASS: FR/EN preference, dynamic document language, Assistant/News "
        "locale propagation and locale-neutral PWA metadata are wired without a new i18n dependency"
    )


if __name__ == "__main__":
    main()
