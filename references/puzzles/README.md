# Local puzzle source

The complete [Lichess open database puzzle export](https://database.lichess.org/#puzzles) is retained at `data/puzzles/lichess_db_puzzle.csv.zst`. The source download was 304,429,328 bytes; its SHA-256, actual imported count and theme inventory are in provenance.json. The export is CC0; the local [CC0 legal text](../openings/COPYING.txt) is also retained.

The indexed catalogue is `data/puzzles/catalogue.sqlite`, 2,764,046,336 bytes. It contains all 6,100,952 source records and 73 themes. Both large data files are ignored by Git. test-lines.json retains three small source records for reproducible isolated tests.

Import validates every row's structural format and builds indexed theme/rating selection with a bounded buffer. It checks SQLite integrity and refuses to replace any existing destination. The server legally replays the first source move and the full solution before a selected puzzle is served. This is not an engine re-evaluation of every puzzle. Source ratings and tags retain their original provenance.
