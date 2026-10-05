#!/usr/bin/env python3
"""Package only supported theme directories, directly at the archive root."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
directories = ("assets", "config", "layout", "locales", "sections", "snippets", "templates")
output = root / "artifacts"
output.mkdir(exist_ok=True)
archive = output / "nouvelthelabel-update-shopify.zip"
manifest = {}
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for folder in directories:
        for p in sorted((root / folder).rglob("*")):
            if p.is_file():
                name = p.relative_to(root).as_posix()
                z.write(p, name)
                manifest[name] = hashlib.sha256(p.read_bytes()).hexdigest()
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert all(n.split('/')[0] in directories for n in z.namelist())
    assert 'layout/theme.liquid' in z.namelist()
    assert 'layout/password.liquid' in z.namelist()
    assert 'templates/customers/login.json' in z.namelist()
    assert not any(n.endswith('.zip') for n in z.namelist())
(output / "upload-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Created {archive}: {len(manifest)} theme files, SHA256 {hashlib.sha256(archive.read_bytes()).hexdigest()}")
