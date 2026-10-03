"""Unnamed controls in a uiautomator dump (used by a11y-audit.sh).

Prints "NOT-ZENO" when Zeno isn't on screen, else "<clickable> <unnamed> <bounds...>".
A clickable node is named if it, or anything inside it, has text or a content
description (TalkBack reads a button's children as its name).
"""
import sys
import xml.etree.ElementTree as ET


def check(path: str) -> str:
    # The input is uiautomator's dump of our own app on our own test emulator,
    # never untrusted XML; Python's parser doesn't resolve external entities.
    nodes = list(ET.parse(path).getroot().iter('node'))  # nosemgrep: python.lang.security.use-defused-xml-parse.use-defused-xml-parse -- our own device's dump, not untrusted input
    zeno = [n for n in nodes if n.get('package') == 'app.zeno.mobile']
    if not zeno:
        return 'NOT-ZENO'

    def named(n):
        return any((c.get('text') or '').strip() or (c.get('content-desc') or '').strip() for c in n.iter('node'))

    clickable = [n for n in zeno if n.get('clickable') == 'true']
    bad = [n.get('bounds') for n in clickable if not named(n)]
    return ' '.join([str(len(clickable)), str(len(bad))] + bad)


if __name__ == '__main__':
    print(check(sys.argv[1]))
