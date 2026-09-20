-- Compatible with the existing Python service's database; never reset its total.
CREATE TABLE IF NOT EXISTS counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    views INTEGER NOT NULL
);
INSERT OR IGNORE INTO counter (id, views) VALUES (1, 0);
