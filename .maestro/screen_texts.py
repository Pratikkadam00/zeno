"""Print what was on screen when a Maestro flow failed: the visible texts and
accessibility labels of the last saved screen, in reading order, one line.

  python3 screen_texts.py <maestro debug folder>

run.sh calls it on a failure so the CI summary (an annotation, readable without
a login) says what the emulator actually showed, not only which step failed.
"""
import glob
import json
import os
import sys

LIMIT = 900  # characters; the annotation carries every failed flow's line


def texts(node, out):
    attrs = node.get("attributes") or {}
    for key in ("text", "accessibilityText"):
        value = (attrs.get(key) or "").strip().replace("\n", " ")
        if value and value not in out:
            out.append(value)
    for child in node.get("children") or []:
        texts(child, out)


def main(folder):
    files = sorted(glob.glob(os.path.join(folder, "**", "screen-hierarchy", "*.json"), recursive=True))
    if not files:
        return "no screen saved"
    with open(files[-1], encoding="utf-8") as handle:
        tree = json.load(handle)
    found = []
    texts(tree, found)
    line = " · ".join(found) or "(no text on screen)"
    return line if len(line) <= LIMIT else line[:LIMIT] + " …"


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # screens carry e.g. U+202F; a Windows console is cp1252
    print(main(sys.argv[1]) if len(sys.argv) > 1 else "usage: screen_texts.py <folder>")
