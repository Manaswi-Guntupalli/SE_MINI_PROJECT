"""Check relative file links in tracked Markdown without network requests."""

from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z", "--", "*.md"], cwd=root
    ).decode().split("\0")
    errors = []
    checked = 0
    for name in filter(None, tracked):
        source = root / name
        content = source.read_text(encoding="utf-8")
        # Code examples are not navigation links.
        content = re.sub(r"```[^\n]*\n.*?(?:```|\Z)", "", content, flags=re.S)
        inline = re.findall(r"!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)", content)
        references = re.findall(r"^\s*\[[^\]]+\]:\s*(\S+)", content, flags=re.M)
        for destination in inline + references:
            parts = urlsplit(destination.strip("<>"))
            if parts.scheme or parts.netloc or not parts.path:
                continue
            checked += 1
            target = (source.parent / unquote(parts.path)).resolve()
            if not target.exists():
                errors.append(f"{name}: missing local destination {destination}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Verified {checked} relative file links in tracked Markdown.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
