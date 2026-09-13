set shell := ["bash", "-euc"]
export OPENSPEC_TELEMETRY := "0"

default:
    @just --list

setup:
    python3 scripts/setup_skills.py

check:
    python3 scripts/setup_skills.py --check
    openspec validate --all --strict --no-interactive
    git diff --check

test:
    python3 scripts/setup_skills.py --self-test
    npm test
    python3 scripts/local_snapshot_test.py
    python3 scripts/import_puzzles_test.py

app:
    npm run dev

app-check:
    npm test
    npm run build

e2e:
    npm run build
    node scripts/check_app_browser.cjs

report:
    python3 scripts/build_report.py

report-check:
    python3 scripts/build_report.py --check

report-test:
    node scripts/check_report_browser.cjs

report-zip:
    python3 scripts/build_report.py --zip

proof:
    npm run build
    CHESSLAB_EVIDENCE_DIR="data/proof-$(date +%Y%m%d-%H%M%S)" node scripts/check_app_browser.cjs

local-check:
    npm run build
    node scripts/check_local_server.mjs
