#!/usr/bin/env python3
"""Static contract for the D05 cockpit shell, PWA and no-WebGL baseline."""

from __future__ import annotations

import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "apps/web"


def png_size(path: Path) -> tuple[int, int]:
    payload = path.read_bytes()
    assert payload[:8] == b"\x89PNG\r\n\x1a\n", path
    assert payload[12:16] == b"IHDR", path
    return struct.unpack(">II", payload[16:24])


def main() -> None:
    manifest = json.loads((WEB / "public/manifest.webmanifest").read_text(encoding="utf-8"))
    assert manifest["display"] == "standalone"
    icon_sizes = {
        (icon["sizes"], icon["purpose"])
        for icon in manifest["icons"]
        if icon["type"] == "image/png"
    }
    assert {("192x192", "any"), ("512x512", "any"), ("512x512", "maskable")} <= icon_sizes
    assert png_size(WEB / "public/icons/nevolium-192.png") == (192, 192)
    assert png_size(WEB / "public/icons/nevolium-512.png") == (512, 512)
    assert png_size(WEB / "public/icons/nevolium-maskable-512.png") == (512, 512)

    service_worker = (WEB / "public/sw.js").read_text(encoding="utf-8")
    assert "url.pathname.startsWith('/v1/')" in service_worker
    assert service_worker.index("url.pathname.startsWith('/v1/')") < service_worker.index(
        "caches.match(request)"
    )
    assert "offline.html" in service_worker

    cockpit = (WEB / "src/CockpitShell.tsx").read_text(encoding="utf-8")
    settings = (WEB / "src/InstanceModelSettings.tsx").read_text(encoding="utf-8")
    device = (WEB / "src/lib/cockpitDevice.ts").read_text(encoding="utf-8")
    styles = (WEB / "src/styles.css").read_text(encoding="utf-8")
    assert "Control+K Meta+K" in cockpit
    assert "role=\"dialog\"" in cockpit and "aria-modal=\"true\"" in cockpit
    assert "handlePaletteDialogKey" in cockpit and "paletteReturnFocusRef" in cockpit
    assert "disableDnd={deviceClass === 'phone'}" in cockpit
    assert "layoutRetry === 'save'" in cockpit and "queueLayoutSave(api)" in cockpit
    assert "cockpit.v2.${deviceClass}.${deviceKey}.${profile}" in device
    assert "@media (prefers-reduced-motion: reduce)" in styles
    assert ":focus-visible" in styles
    assert "retry-test" in settings and "Relancer le test" in settings
    assert "test_execution_status" in settings and "api_key: apiKey" in settings

    catch_block = cockpit.split("} catch (error) {", 1)[1].split("} finally {", 1)[0]
    assert "attachPersistence" not in catch_block
    assert "synchronisation suspendue" in catch_block

    reachable_source = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted((WEB / "src").rglob("*"))
        if path.suffix in {".ts", ".tsx"}
    )
    for forbidden in ("react-force-graph-3d", "@react-three/fiber", "WebGLRenderingContext"):
        assert forbidden not in reachable_source, forbidden

    print(
        "D05 COCKPIT CONTRACT PASS: device/profile layouts, keyboard navigation, safe restore, "
        "reduced motion, installable icons, API-free shell cache and no-WebGL baseline are present"
    )


if __name__ == "__main__":
    main()
