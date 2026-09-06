"""Link this project's selected local skills without changing installed sources."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def link(destination, source, check=False):
    if destination.is_symlink() and destination.resolve() == source.resolve():
        return
    if destination.is_symlink() or destination.exists():
        raise RuntimeError(f"Refusing to replace existing path: {destination}")
    if check:
        raise RuntimeError(f"Missing link: {destination}; run just setup")
    destination.parent.mkdir(parents=True, exist_ok=True)
    target = os.path.relpath(source, destination.parent) if source.is_relative_to(ROOT) else source
    destination.symlink_to(target, target_is_directory=True)


def self_test():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        source = root / "source"
        source.mkdir()
        destination = root / "link"
        link(destination, source)
        link(destination, source, check=True)
        for protected in (source, root / "dangling"):
            if protected != source:
                protected.symlink_to(root / "missing")
            try:
                link(protected, source)
            except RuntimeError:
                pass
            else:
                raise AssertionError("Existing paths must be preserved")
        try:
            link(root / "absent", source, check=True)
        except RuntimeError:
            pass
        else:
            raise AssertionError("Check mode must reject a missing link")
        assert not (root / "absent").exists()
    print("PASS: link creation, idempotence, conflict preservation, read-only checks")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    manifest = json.loads((ROOT / "skills.local.json").read_text())
    links = []
    for host, folder in (("codex", ".agents"), ("claude", ".claude")):
        for item in manifest["common"] + manifest[host]:
            source = Path(item["source"]).expanduser()
            entrypoint = source / "SKILL.md"
            if not entrypoint.is_file():
                raise RuntimeError(f"Missing installed skill: {entrypoint}")
            if hashlib.sha256(entrypoint.read_bytes()).hexdigest() != item["skill_sha256"]:
                raise RuntimeError(f"Skill changed since setup: {entrypoint}; review before updating the manifest")
            links.append((ROOT / folder / "skills" / item["name"], source))
    links += [(ROOT / ".codex/skills", ROOT / ".agents/skills"),
              (ROOT / ".cursor/skills", ROOT / ".claude/skills")]
    # Preflight every destination before creating any links.
    for destination, source in links:
        if destination.is_symlink() or destination.exists() or args.check:
            link(destination, source, check=True)
    for destination, source in links:
        link(destination, source, check=args.check)
    print(f"PASS: {len(links) - 2} skill links and 2 agent directory mirrors; entrypoint hashes match")


if __name__ == "__main__":
    main()
