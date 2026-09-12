#!/usr/bin/env python3
"""Create a consistent, non-overwriting local copy of a ChessLab database."""
import argparse
from contextlib import closing
import os
from pathlib import Path
import sqlite3
import tempfile


def snapshot(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if not source.is_file():
        raise ValueError(f'Source database does not exist: {source}')
    if destination.exists():
        raise ValueError(f'Destination already exists; choose a new path: {destination}')
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.chesslab-snapshot-', dir=destination.parent)
    os.close(fd)
    try:
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as original:
            with closing(sqlite3.connect(temporary)) as copy:
                original.backup(copy)
                if copy.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise ValueError('The copied database failed its integrity check.')
                counts = {table: copy.execute(f'SELECT count(*) FROM {table}').fetchone()[0]
                          for table in ('users', 'games', 'progress')}
        os.link(temporary, destination)
        return counts
    finally:
        os.unlink(temporary)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    print(snapshot(args.source, args.destination))
