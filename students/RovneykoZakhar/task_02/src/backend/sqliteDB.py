import sqlite3

DB_PATH = "app.db"

def get_db():
    return sqlite3.connect(DB_PATH)

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        
        tables = [
            """CREATE TABLE IF NOT EXISTS User (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS Deck (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                UserId INTEGER,
                rating_avg REAL DEFAULT 0.0,
                rating_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(UserId) REFERENCES User(id)
            )""",
            """CREATE TABLE IF NOT EXISTS Card (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                TranslitWord TEXT,
                examples TEXT,
                tags TEXT,
                UserId INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(UserId) REFERENCES User(id)
            )""",
            """CREATE TABLE IF NOT EXISTS DeckCard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deck_id INTEGER NOT NULL,
                card_id INTEGER NOT NULL,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(deck_id) REFERENCES Deck(id) ON DELETE CASCADE,
                FOREIGN KEY(card_id) REFERENCES Card(id) ON DELETE CASCADE,
                UNIQUE(deck_id, card_id)
            )""",
            """CREATE TABLE IF NOT EXISTS UserDeck (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                deck_id INTEGER NOT NULL,
                is_favorite BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES User(id),
                FOREIGN KEY(deck_id) REFERENCES Deck(id),
                UNIQUE(user_id, deck_id)
            )""",
            """CREATE TABLE IF NOT EXISTS Review (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deck_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(deck_id) REFERENCES Deck(id),
                FOREIGN KEY(user_id) REFERENCES User(id),
                UNIQUE(user_id, deck_id)
            )""",
            """CREATE TABLE IF NOT EXISTS Test (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId INTEGER,
                DeckId INTEGER,
                score REAL NOT NULL,
                total INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(UserId) REFERENCES User(id),
                FOREIGN KEY(DeckId) REFERENCES Deck(id)
            )"""
        ]
        
        for table in tables:
            cur.execute(table)
        
        conn.commit()