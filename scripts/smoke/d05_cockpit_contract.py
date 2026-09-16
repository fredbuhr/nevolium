#!/usr/bin/env python3
"""Static contract for the D05 cockpit shell, PWA and no-WebGL baseline."""

from __future__ import annotations

import json
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "apps/web"


def png_size(path: Path) -> tuple[int, int]:
    payload = path.read_bytes()
    assert payload[:8] == b"\x89PNG\r\n\x1a\n", path
    assert payload[12:16] == b"IHDR", path
    return struct.unpack(">II", payload[16:24])


def main() -> None:
    isolation_workflow = (ROOT / ".github/workflows/multi-user-isolation.yml").read_text(
        encoding="utf-8"
    )
    authenticated_browser = (
        ROOT / "scripts/smoke/d05_authenticated_browser_qualification.mjs"
    ).read_text(encoding="utf-8")
    manifest = json.loads((WEB / "public/manifest.webmanifest").read_text(encoding="utf-8"))
    assert manifest["display"] == "standalone"
    assert manifest["background_color"] == "#020b13"
    assert manifest["theme_color"] == "#061725"
    icon_sizes = {
        (icon["sizes"], icon["purpose"])
        for icon in manifest["icons"]
        if icon["type"] == "image/png"
    }
    assert {("192x192", "any"), ("512x512", "any"), ("512x512", "maskable")} <= icon_sizes
    assert png_size(WEB / "public/icons/nevolium-192.png") == (192, 192)
    assert png_size(WEB / "public/icons/nevolium-512.png") == (512, 512)
    assert png_size(WEB / "public/icons/nevolium-maskable-512.png") == (512, 512)
    logo = (WEB / "public/icons/nevolium.svg").read_text(encoding="utf-8")
    for identity_token in ("#78f0ad", "#2de7e0", "#5fcaff", "#9782ff"):
        assert identity_token in logo, identity_token

    service_worker = (WEB / "public/sw.js").read_text(encoding="utf-8")
    assert "url.pathname.startsWith('/v1/')" in service_worker
    assert service_worker.index("url.pathname.startsWith('/v1/')") < service_worker.index(
        "caches.match(request)"
    )
    assert "offline.html" in service_worker
    assert "popout.html" in service_worker
    assert "caches.match(request)" in service_worker
    popout = (WEB / "public/popout.html").read_text(encoding="utf-8")
    assert "src/main.tsx" not in popout and "id=\"root\"" not in popout

    cockpit = (WEB / "src/CockpitShell.tsx").read_text(encoding="utf-8")
    home = (WEB / "src/MyceliumHome.tsx").read_text(encoding="utf-8")
    field = (WEB / "src/MyceliumField.tsx").read_text(encoding="utf-8")
    home_styles = (WEB / "src/MyceliumHome/home.css").read_text(encoding="utf-8")
    settings = (WEB / "src/InstanceModelSettings.tsx").read_text(encoding="utf-8")
    device = (WEB / "src/lib/cockpitDevice.ts").read_text(encoding="utf-8")
    styles = (WEB / "src/styles.css").read_text(encoding="utf-8")
    assert "Control+K Meta+K" in cockpit
    assert "Control+K Meta+K" in home
    assert "quiet-atmosphere" in field and "SpatialWorkspace" in home
    assert "defaultView={props.deviceClass === 'phone' ? '2d' : '3d'}" in home
    assert "mycelium.home.${props.deviceClass}.camera." in home
    assert "controlsVisible={props.active && !customizing}" in home
    assert "onViewChange={setSpatialView}" in home and "is-phone-spatial" in home
    assert ".home-browser.is-phone-spatial" in home_styles
    assert "max-height: min(42dvh, 360px)" in home_styles
    assert "compactActions=" in home and "useHomeLayout" in home
    assert 'aria-hidden="true"' in field
    home_messages = (WEB / "src/MyceliumHome/messages.ts").read_text(encoding="utf-8")
    assert "Votre Mycelium" in home_messages
    for delivered_space in (
        "Assistant",
        "Actualités",
        "Recherche",
        "Aujourd’hui",
        "Projets",
        "Documents",
    ):
        assert delivered_space in home_messages, delivered_space
    assert "model-settings" in home and "isAdmin" in home
    assert "role=\"dialog\"" in cockpit and "aria-modal=\"true\"" in cockpit
    assert "handlePaletteDialogKey" in cockpit and "paletteReturnFocusRef" in cockpit
    assert "disableDnd={deviceClass === 'phone'}" in cockpit
    assert "api.addPopoutGroup(activePanel" in cockpit
    assert "deviceClass === 'desktop'" in cockpit and "w('detach')" in cockpit
    assert cockpit.count("deviceClass !== 'desktop'") >= 3
    assert "layoutRetry === 'save'" in cockpit and "queueLayoutSave(api)" in cockpit
    assert "window.sessionStorage" in device
    assert "cockpit.v3.${deviceClass}.${deviceKey}.${windowKey}.${profile}" in device
    assert "cockpit.v2.${deviceClass}.${deviceKey}.${profile}" in device
    assert "WORKSPACE_KEY_PART_MAX_LENGTH = 40" in device
    assert "preferenceKey(PROFILE_STORAGE, subjectRef)" in device
    assert "preferenceKey(AMBIENCE_STORAGE, subjectRef)" in device
    assert "preferenceKey(SURFACE_STORAGE, subjectRef)" in device
    assert "getSavedCockpitSurface" in device and "saveCockpitSurface" in device
    assert "saveTimer = undefined" in cockpit
    assert "legacyWorkspaceKeys" in cockpit and "cockpit.main" in (WEB / "src/App.tsx").read_text(
        encoding="utf-8"
    )
    assert "restoredLegacyLayout" in cockpit
    assert "@media (prefers-reduced-motion: reduce)" in styles
    assert ":focus-visible" in styles
    assert "--accent-violet: #9782ff" in styles
    assert ".app-shell.ambience-minimal" in styles
    assert ".model-settings-form input:focus-visible" in styles
    assert "retry-test" in settings and "Relancer le test" in settings
    assert "test_execution_status" in settings and "api_key: apiKey" in settings
    assert "d05_authenticated_browser_qualification.mjs" in isolation_workflow
    assert "nevolium-web" in isolation_workflow
    assert "nevolium-dev-2" in authenticated_browser and "Réglages API" in authenticated_browser

    catch_block = cockpit.split("} catch {", 1)[1].split("} finally {", 1)[0]
    assert "attachPersistence" not in catch_block
    assert "restoreFailed" in catch_block

    # D09 may load a 3D scene explicitly. The D05 baseline must still have no
    # WebGL dependency in the static import graph starting at the Web entrypoint.
    # Follow relative runtime imports/re-exports; exclude type-only and dynamic imports.
    visited: set[Path] = set()
    pending = [WEB / "src/main.tsx"]
    sources: list[str] = []
    static_import = re.compile(
        r"^\s*(?:import|export)\s+(?!type\b)(?:[^;'\"]+?\s+from\s+)?['\"]([^'\"]+)['\"]",
        re.MULTILINE,
    )
    while pending:
        current = pending.pop().resolve()
        if current in visited:
            continue
        visited.add(current)
        source = current.read_text(encoding="utf-8")
        sources.append(source)
        for specifier in static_import.findall(source):
            assert specifier not in {"three", "@react-three/fiber", "react-force-graph-3d"}, specifier
            if not specifier.startswith("."):
                continue
            base = current.parent / specifier
            candidates = [base, Path(f"{base}.tsx"), Path(f"{base}.ts"), base / "index.tsx", base / "index.ts"]
            for candidate in candidates:
                if candidate.is_file() and candidate.suffix in {".ts", ".tsx"}:
                    pending.append(candidate)
                    break
    assert (WEB / "src/MyceliumHome.tsx").resolve() in visited
    assert (WEB / "src/MindMapWorkspace/index.tsx").resolve() in visited
    assert (WEB / "src/Mycelium3D/Scene.tsx").resolve() not in visited
    reachable_source = "\n".join(sources)
    for forbidden in ("react-force-graph-3d", "@react-three/fiber", "WebGLRenderingContext"):
        assert forbidden not in reachable_source, forbidden

    print(
        "D05 COCKPIT CONTRACT PASS: functional Mycelium home, neural identity, account preferences, "
        "per-window layouts, panel popouts, safe restore, keyboard/touch, installable icons and "
        "no-WebGL baseline are present"
    )


if __name__ == "__main__":
    main()
