#!/usr/bin/env python3
"""Install local opponent engines, or expose the official Maia2 model through UCI.

Usage: python3 scripts/install_engines.py [stockfish18 stockfish18-lite stockfish16 lc0 maia]
       python3 scripts/install_engines.py --verify
Runtime files, upstream licenses, hashes and smoke receipts stay in ignored data/engines.
Requires Python 3.11+, Apple Silicon macOS, uv, Homebrew and Xcode command-line tools.
"""
import contextlib
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ.get("CHESSLAB_ENGINES_DIR", ROOT / "data" / "engines")).resolve()
PYTHON = DATA / "python" / "bin" / "python"
MAIA3_COMMIT = "1e13597c42d4858b7cfd7cfdae01e297263364b2"
MAIA2_COMMIT = "67bee6ce7e2f264344fe6d2026a2e18c76a82efa"
LC0_NET = "https://storage.lczero.org/files/networks-contrib/t1-256x10-distilled-swa-2432500.pb.gz"
DOWNLOAD_HASHES = {
    "stockfish-18-lite.js": "f79e667c9d56ee768aca35e8343f91548ceef6a732f67cd82f267cf9eab7f665",
    "stockfish-18-lite.wasm": "d50136919dcd90e75eb8df78b255d47d618962b670028b38961343f6eb409174",
    "stockfish18.tar": "4d77c4aa3ad9bd1ea8111f2ac5a4620fe7ebf998d6893bf828d49ccd579c8cb0",
    "stockfish16-source.tar.gz": "a1600ebdaf4e324ba3e10cec2e0c9a810dc64c6f0db5cc955b2fd5e1eefa1cc6",
    "weights.pb.gz": "bc27a6cae8ad36f2b9a80a6ad9dabb0d6fda25b1e7f481a79bc359e14f563406",
}


def run(*command, **kwargs):
    return subprocess.run([str(x) for x in command], check=True, **kwargs)


def sha256(path):
    with open(path, "rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def download(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        print(f"Downloading {url}", flush=True)
        temporary = path.with_suffix(path.suffix + ".part")
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ChessLab engine installer"})
        with urllib.request.urlopen(request, timeout=60) as response, open(temporary, "wb") as out:
            shutil.copyfileobj(response, out)
        temporary.replace(path)
    if path.name in DOWNLOAD_HASHES and sha256(path) != DOWNLOAD_HASHES[path.name]:
        raise RuntimeError(f"Checksum mismatch for {path.name}; refusing to install.")
    return path


def extract(archive, target):
    target.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as tar:
        # No links/devices or archive paths outside this engine's directory.
        members = [item for item in tar.getmembers() if item.isfile() or item.isdir()]
        for item in members:
            if not (target / item.name).resolve().is_relative_to(target.resolve()):
                raise ValueError("Unsafe archive path")
        tar.extractall(target, members=members, filter="data")


def record(engine_id, version, sources, files, **extra):
    path = DATA / "manifest.json"
    manifest = json.loads(path.read_text()) if path.exists() else {"engines": {}}
    manifest["engines"][engine_id] = {
        "version": version, "sources": sources,
        "files": [{"path": str(file.relative_to(ROOT) if file.is_relative_to(ROOT) else file), "sha256": sha256(file), "bytes": file.stat().st_size} for file in files],
        "installedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **extra,
    }
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(manifest, indent=2) + "\n")
    temporary.replace(path)


def stockfish(version):
    dest = DATA / f"stockfish{version}"
    if version == 18:
        url = "https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-macos-m1-apple-silicon.tar"
        archive = download(url, DATA / "downloads" / "stockfish18.tar")
        extract(archive, dest / "upstream")
        binary = next((dest / "upstream").rglob("stockfish-macos-m1-apple-silicon"))
    else:
        url = "https://github.com/official-stockfish/Stockfish/archive/refs/tags/sf_16.tar.gz"
        archive = download(url, DATA / "downloads" / "stockfish16-source.tar.gz")
        extract(archive, dest / "upstream")
        source = dest / "upstream" / "Stockfish-sf_16" / "src"
        run("make", "-j4", "build", "ARCH=apple-silicon", "COMP=clang", cwd=source)
        binary = source / "stockfish"
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2(binary, dest / "stockfish")
    (dest / "stockfish").chmod(0o755)
    record(f"stockfish{version}", str(version), [url], [archive, dest / "stockfish"], license="GPL-3.0")


def stockfish_lite():
    dest = DATA / "stockfish18-lite"
    base = "https://github.com/nmrugg/stockfish.js/releases/download/v18.0.0/"
    names = ["stockfish-18-lite.js", "stockfish-18-lite.wasm"]
    files = [download(base + name, dest / name) for name in names]
    # The release is CommonJS even inside this application's ESM package.
    (dest / "package.json").write_text('{"type":"commonjs"}\n')
    license_url = "https://raw.githubusercontent.com/nmrugg/stockfish.js/31a98753a5d932511693f44775da908377c24513/Copying.txt"
    files.append(download(license_url, dest / "Copying.txt"))
    record("stockfish18-lite", "18.0.0 / Lite WASM Multithreaded", [base + name for name in names] + [license_url], files, license="GPL-3.0", sourceCommit="31a98753a5d932511693f44775da908377c24513")


def lc0():
    info = json.loads(subprocess.check_output(["brew", "info", "--json=v2", "lc0"]))["formulae"][0]
    if info["versions"]["stable"] != "0.32.1":
        raise RuntimeError("Review the changed Homebrew Lc0 version before updating this installer.")
    run("brew", "fetch", "--force-bottle", "lc0")
    archive = Path(subprocess.check_output(["brew", "--cache", "lc0"], text=True).strip())
    expected = {item["sha256"] for item in info["bottle"]["stable"]["files"].values()}
    if sha256(archive) not in expected:
        raise RuntimeError("Lc0 bottle checksum differs from Homebrew's published checksum.")
    dest = DATA / "lc0"
    extract(archive, dest / "upstream")
    binary = next((dest / "upstream").glob("lc0/*/libexec/lc0"))
    shutil.copy2(binary, dest / "lc0")
    (dest / "lc0").chmod(0o755)
    weights = download(LC0_NET, dest / "weights.pb.gz")
    record("lc0", "0.32.1 / T1-256x10-distilled-swa-2432500", ["https://github.com/LeelaChessZero/lc0/tree/v0.32.1", "https://formulae.brew.sh/formula/lc0", LC0_NET], [dest / "lc0", weights], license="GPL-3.0-or-later", bottleSha256=sha256(archive))


def maia():
    sources = [f"git+https://github.com/CSSLab/maia3.git@{MAIA3_COMMIT}", f"git+https://github.com/CSSLab/maia2.git@{MAIA2_COMMIT}"]
    if not PYTHON.exists():
        run("uv", "venv", "--python", "3.12", DATA / "python")
    run("uv", "pip", "install", "--python", PYTHON, *sources)
    run(PYTHON, __file__, "--cache-maia")
    packages = subprocess.check_output(["uv", "pip", "freeze", "--python", str(PYTHON)], text=True)
    (DATA / "python-packages.txt").write_text(packages)


def cache_maia():
    from huggingface_hub import hf_hub_download
    from maia2 import model
    for size in [5, 23, 79]:
        repo = f"UofTCSSLab/Maia3-{size}M"
        metadata = json.load(urllib.request.urlopen(f"https://huggingface.co/api/models/{repo}"))
        names = [x["rfilename"] for x in metadata["siblings"] if x["rfilename"].endswith(".pt")]
        if len(names) != 1:
            raise RuntimeError(f"Expected one checkpoint in {repo}, found {names}")
        file = Path(hf_hub_download(repo, names[0], revision=metadata["sha"], local_dir=DATA / "maia3"))
        target = DATA / "maia3" / f"maia3-{size}m.pt"
        if file != target:
            shutil.copy2(file, target)
        record("maia3" if size == 79 else f"maia3-{size}m", f"0.1.0 / {size}M", [f"https://github.com/CSSLab/maia3/tree/{MAIA3_COMMIT}", f"https://huggingface.co/{repo}/tree/{metadata['sha']}"], [target], license="AGPL-3.0", sourceCommit=MAIA3_COMMIT, modelRevision=metadata["sha"])
    for kind in ["rapid", "blitz"]:
        model.from_pretrained(kind, device="cpu", save_root=str(DATA / "maia2"))
        record("maia2" if kind == "rapid" else "maia2-blitz", f"0.11.0 / {kind}", [f"https://github.com/CSSLab/maia2/tree/{MAIA2_COMMIT}", model._MODEL_ASSETS[kind]["url"]], [DATA / "maia2" / f"{kind}_model.pt"], license="MIT", sourceCommit=MAIA2_COMMIT)


def maia2_uci(kind="rapid"):
    """Replay complete UCI history; Maia2 itself conditions on the resulting FEN."""
    import chess
    import random
    import torch
    from maia2 import inference, model
    torch.set_num_threads(1)
    board, engine, prepared, rating = chess.Board(), None, None, 1500
    for raw in sys.stdin:
        command = raw.strip()
        if command == "uci":
            print(f"id name Maia2 0.11.0 {kind}\noption name Elo type spin default 1500 min 0 max 5000\nuciok", flush=True)
        elif command == "isready":
            if engine is None:
                checkpoint = DATA / "maia2" / f"{kind}_model.pt"
                if not checkpoint.is_file() or sha256(checkpoint) != model._MODEL_ASSETS[kind]["sha256"]:
                    raise RuntimeError("Install the verified Maia2 checkpoint before starting the server.")
                with contextlib.redirect_stdout(sys.stderr):
                    engine = model.from_pretrained(kind, device="cpu", save_root=str(DATA / "maia2"))
                    engine.eval()
                    prepared = inference.prepare()
            print("readyok", flush=True)
        elif command.startswith("setoption name Elo value "):
            rating = int(command.rsplit(" ", 1)[1])
        elif command == "ucinewgame":
            board = chess.Board()
        elif command.startswith("position "):
            start, _, history = command[9:].partition(" moves ")
            board = chess.Board() if start == "startpos" else chess.Board(start.removeprefix("fen "))
            for move in history.split():
                board.push_uci(move)
        elif command.startswith("go "):
            with contextlib.redirect_stdout(sys.stderr), torch.inference_mode():
                probabilities, _ = inference.inference_each(engine, prepared, board.fen(), rating, rating)
            legal = {move: weight for move, weight in probabilities.items() if chess.Move.from_uci(move) in board.legal_moves}
            move = random.choices(list(legal), weights=list(legal.values()), k=1)[0] if legal else "0000"
            print(f"bestmove {move}", flush=True)
        elif command == "quit":
            break


def verify():
    """Save live readiness, move legality and search-time receipts for installed engines."""
    configured = os.environ.get("STOCKFISH_PATH") or next((str(path) for path in [Path("/opt/homebrew/bin/stockfish"), Path("/usr/local/bin/stockfish"), Path("/usr/games/stockfish")] if path.exists()), "stockfish")
    stockfish_path = Path(shutil.which(configured) or configured).resolve()
    identity = subprocess.run([str(stockfish_path)], input="uci\nquit\n", capture_output=True, text=True, check=True, timeout=8).stdout
    if "id name Stockfish 19\n" not in identity:
        raise RuntimeError("The configured existing Stockfish must identify as version 19 before recording it.")
    record("stockfish19", "19", ["https://github.com/official-stockfish/Stockfish/releases/tag/sf_19"], [stockfish_path], license="GPL-3.0", installation="Existing server installation; version checked by the live adapter below.")
    code = r'''
import { readFile, writeFile } from 'node:fs/promises';
import { listOpponentEngines, chooseOpponentMove, closeOpponentEngines } from './server/opponent-engines.mjs';
import { replay } from './server/engine.mjs';
const path = (process.env.CHESSLAB_ENGINES_DIR || 'data/engines') + '/manifest.json';
const manifest = JSON.parse(await readFile(path, 'utf8'));
const moves = ['e2e4','e7e5','g1f3','b8c6','f1b5','a7a6'];
try {
  for (const entry of await listOpponentEngines()) {
    if (!entry.available) throw new Error(entry.id + ': ' + entry.reason);
    const started = performance.now();
    const result = await chooseOpponentMove({ engineId: entry.id, moves, movetime: 100, rating: 1500 });
    const after = replay([...moves, result.move]);
    const receipt = { ...result, moves, initialFen: null, afterFen: after.fen(), elapsedMs: Math.round(performance.now()-started), verifiedAt: new Date().toISOString() };
    manifest.engines[entry.id] = { ...manifest.engines[entry.id], version: entry.version, smoke: receipt };
    console.log(JSON.stringify(receipt));
  }
  await writeFile(path, JSON.stringify(manifest,null,2)+'\n');
} finally { closeOpponentEngines(); }
'''
    run("node", "--input-type=module", "-e", code, cwd=ROOT)


if __name__ == "__main__":
    DATA.mkdir(parents=True, exist_ok=True)
    if sys.argv[1:2] == ["--maia2-uci"] and sys.argv[2:] in [[], ["rapid"], ["blitz"]]:
        maia2_uci(sys.argv[2] if len(sys.argv) > 2 else "rapid")
    elif sys.argv[1:] == ["--cache-maia"]:
        cache_maia()
    elif sys.argv[1:] == ["--verify"]:
        verify()
    else:
        if platform.system() != "Darwin" or platform.machine() != "arm64":
            raise SystemExit("This pinned installer targets Apple Silicon macOS.")
        actions = {"stockfish18": lambda: stockfish(18), "stockfish18-lite": stockfish_lite, "stockfish16": lambda: stockfish(16), "lc0": lc0, "maia": maia}
        selected = sys.argv[1:] or list(actions)
        if any(name not in actions for name in selected):
            raise SystemExit(f"Choose from: {', '.join(actions)}")
        for name in selected:
            actions[name]()
        if not sys.argv[1:]:
            verify()
