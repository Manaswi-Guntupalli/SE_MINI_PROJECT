"""Check relative file links in tracked Markdown without network requests."""

from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit


def markdown_destinations(content: str) -> list[str]:
    """Scan once; repeated unmatched brackets cannot trigger regex backtracking."""
    destinations = []
    position = 0
    while True:
        start = content.find("](", position)
        if start == -1:
            break
        end = content.find(")", start + 2)
        if end == -1:
            break
        value = content[start + 2:end].strip()
        if value.startswith("<") and ">" in value:
            destinations.append(value[1:value.index(">")])
        elif value:
            destinations.append(value.split(maxsplit=1)[0])
        position = end + 1
    for line in content.splitlines():
        value = line.lstrip()
        separator = value.find("]:")
        if value.startswith("[") and separator > 1:
            target = value[separator + 2:].strip()
            if target:
                destinations.append(target.split(maxsplit=1)[0].strip("<>"))
    return destinations


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
        for destination in markdown_destinations(content):
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
