#!/usr/bin/env python3
"""Validate the actual Shopify directories, references and protected source."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "8ff750c037e6f376efb739415c44190db2c1ac6d"
DIRECTORIES = ("assets", "config", "layout", "locales", "sections", "snippets", "templates")
errors = []
for name in DIRECTORIES:
    if not (ROOT / name).is_dir():
        errors.append(f"Missing Shopify directory: {name}")
for p in ROOT.iterdir():
    if p.suffix in (".liquid", ".css", ".js"):
        errors.append(f"Flattened theme file remains: {p.name}")
for folder in DIRECTORIES:
    for p in (ROOT / folder).rglob("*.json"):
        try:
            data = json.loads(p.read_text())
            if folder in ("templates", "sections") and isinstance(data, dict):
                for section in data.get("sections", {}).values():
                    if "type" not in section and ".context." in p.name:
                        parent = p.with_name(p.name.split(".context.")[0] + ".json")
                        if not parent.is_file():
                            errors.append(f"{p.relative_to(ROOT)}: missing base context template")
                        continue
                    target = ROOT / "sections" / (section["type"] + ".liquid")
                    if not target.is_file():
                        errors.append(f"{p.relative_to(ROOT)}: missing section {target.name}")
        except (ValueError, KeyError) as e:
            errors.append(f"{p.relative_to(ROOT)}: {e}")

graph = {}
for folder in ("layout", "sections", "snippets", "templates"):
    for p in (ROOT / folder).rglob("*.liquid"):
        text = p.read_text()
        renders = []
        for kind, name in re.findall(r"\b(render|section|sections)\s+['\"]([^'\"]+)['\"]", text):
            destination = "snippets" if kind == "render" else "sections"
            suffix = ".json" if kind == "sections" else ".liquid"
            target = ROOT / destination / (name + suffix)
            if not target.is_file():
                errors.append(f"{p.relative_to(ROOT)}: missing {kind} {name}")
            if kind == "render":
                renders.append(name)
        if folder == "snippets":
            graph[p.stem] = renders
        for name in re.findall(r"['\"]([^'\"]+)['\"]\s*\|\s*asset_url", text):
            if not (ROOT / "assets" / name).is_file():
                errors.append(f"{p.relative_to(ROOT)}: missing asset {name}")
        for schema in re.findall(r"{%[- ]*schema[- ]*%}(.*?){%[- ]*endschema[- ]*%}", text, re.S):
            try:
                value = json.loads(schema)
                if not isinstance(value.get("name"), str):
                    errors.append(f"{p.relative_to(ROOT)}: invalid section name")
            except ValueError as e:
                errors.append(f"{p.relative_to(ROOT)}: invalid schema {e}")

def visit(name, stack):
    if name in stack:
        errors.append("Recursive render: " + " -> ".join(stack + [name]))
        return
    for child in graph.get(name, []):
        visit(child, stack + [name])
for name in graph:
    visit(name, [])

for old, current in {
    "theme.liquid": "layout/theme.liquid",
    "settings_data.json": "config/settings_data.json",
    "testimonials.liquid": "sections/testimonials.liquid",
    "product-rating.liquid": "snippets/product-rating.liquid",
    "index.json": "templates/index.json",
}.items():
    baseline = subprocess.check_output(["git", "show", f"{SOURCE}:{old}"], cwd=ROOT)
    actual = (ROOT / current).read_bytes()
    if current == 'layout/theme.liquid':
        # Only the explicitly requested removal of the forced no-decimals format is permitted.
        actual = actual.replace(b"shop.money_format | replace: 'EUR', '\xe2\x82\xac' | escape", b"shop.money_format | replace: 'EUR', '\xe2\x82\xac' | replace: 'amount', 'amount_no_decimals' | escape")
    if actual != baseline:
        errors.append(f"Protected source differs: {current}")
    else:
        print(f"Exact preservation: {current} ({hashlib.sha256(actual).hexdigest()})")

for p in (ROOT / "assets").glob("*.js"):
    result = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
    if result.returncode:
        errors.append(f"{p.relative_to(ROOT)}: {result.stderr}")
if errors:
    raise SystemExit("\n".join(sorted(set(errors))))
print("Shopify structure, JSON, schemas, references, render graph and JS syntax passed.")
