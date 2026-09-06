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
