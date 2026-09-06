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

e2e:
    @echo "No application exists yet; there is no product end-to-end test."
    @exit 1

report:
    python3 scripts/build_report.py

report-check:
    python3 scripts/build_report.py --check

report-test:
    node scripts/check_report_browser.cjs

report-zip:
    python3 scripts/build_report.py --zip
