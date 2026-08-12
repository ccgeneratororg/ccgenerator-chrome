#!/usr/bin/env python3
"""Build the Chrome Web Store upload.

    python3 scripts/package.py            # → ../ccgenerator-chrome-<version>.zip
    python3 scripts/package.py --out /tmp/x.zip

Built from an explicit allowlist rather than by zipping the directory and
excluding things. Two reasons:

  - A blocklist silently ships whatever it has not heard of yet. A reviewer
    reading store listing copy, a stray preview harness, or an editor backup
    inside the package is at best noise and at worst a rejection.
  - macOS `zip` adds a __MACOSX/ directory and ._AppleDouble members for any
    file carrying extended attributes, and Finder's "Compress" always does.
    Writing the archive with zipfile from a known list cannot produce either.

Every entry is stored with a fixed timestamp and normalised permissions, so the
same source tree always produces a byte-identical archive.
"""

import argparse
import json
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Exactly what the extension runs on, plus LICENSE. Development material —
# store/, scripts/, README.md, .gitignore — is deliberately absent.
#
# LICENSE is the one thing here that nothing loads. It ships anyway: the
# listing and the popup both call the extension open source, and the terms
# under which that is true belong inside the package a user can unpack, not
# only in a repository they have to be told about.
FILES = [
    "manifest.json",
    "LICENSE",
    "background.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "options.html",
    "options.css",
    "options.js",
    "src/cards.js",
    "src/testcards.js",
    "src/i18n.js",
    "content/autofill.js",
    "_locales/en/messages.json",
    "_locales/tr/messages.json",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

# Fixed date for every member (1980-01-01, the ZIP epoch).
TIMESTAMP = (1980, 1, 1, 0, 0, 0)


def check_referenced_files():
    """Every path the manifest points at has to be in FILES."""
    manifest = json.load(open(os.path.join(ROOT, "manifest.json")))
    referenced = set()

    referenced.update(manifest.get("icons", {}).values())
    referenced.update(manifest.get("action", {}).get("default_icon", {}).values())
    if "default_popup" in manifest.get("action", {}):
        referenced.add(manifest["action"]["default_popup"])
    if "service_worker" in manifest.get("background", {}):
        referenced.add(manifest["background"]["service_worker"])
    if "page" in manifest.get("options_ui", {}):
        referenced.add(manifest["options_ui"]["page"])

    missing = sorted(referenced - set(FILES))
    if missing:
        sys.exit("manifest references files not in the package list: %s" % ", ".join(missing))


def build(out_path):
    check_referenced_files()

    missing = [name for name in FILES if not os.path.isfile(os.path.join(ROOT, name))]
    if missing:
        sys.exit("missing from the working tree: %s" % ", ".join(missing))

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in FILES:
            info = zipfile.ZipInfo(name, date_time=TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with open(os.path.join(ROOT, name), "rb") as handle:
                archive.writestr(info, handle.read())

    return out_path


def main():
    version = json.load(open(os.path.join(ROOT, "manifest.json")))["version"]
    default = os.path.join(os.path.dirname(ROOT), "ccgenerator-chrome-%s.zip" % version)

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=default, help="output path (default: %s)" % default)
    args = parser.parse_args()

    path = build(args.out)
    size = os.path.getsize(path)

    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        bad = archive.testzip()

    if bad:
        sys.exit("corrupt member in archive: %s" % bad)

    junk = [n for n in names if "__MACOSX" in n or os.path.basename(n).startswith("._")
            or os.path.basename(n) == ".DS_Store"]
    if junk:
        sys.exit("macOS metadata leaked into the archive: %s" % ", ".join(junk))

    if "manifest.json" not in names:
        sys.exit("manifest.json is not at the archive root")

    print("%s\n%d files, %.1f KB" % (path, len(names), size / 1024))
    for name in names:
        print("  ", name)


if __name__ == "__main__":
    main()
