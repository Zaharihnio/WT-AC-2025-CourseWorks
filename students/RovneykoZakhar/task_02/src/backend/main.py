from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from typing import List, Optional
import sqlite3
import logging

from sqliteDB import get_db, init_db
from models import *
from utilities import hash_password, verify_password, create_access_token, verify_token

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Card Learning API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    if not payload or not (user_id := payload.get("user_id")):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, email, name, role, created_at FROM User WHERE id = ?", 
            (user_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="User not found")
        return UserResponse(**{
            "id": row[0], "email": row[1], "name": row[2], 
            "role": UserRole(row[3]), "created_at": row[4]
        })
    finally:
        conn.close()

async def get_current_admin(current: UserResponse = Depends(get_current_user)):
    if current.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current

def get_deck_with_cards(conn, deck_id: int) -> dict:
    """Получение колоды с карточками"""
    # Получаем информацию о колоде
    deck_row = conn.execute("""
        SELECT id, name, description, UserId, rating_avg, rating_count, created_at
        FROM Deck WHERE id = ?
    """, (deck_id,)).fetchone()
    
    if not deck_row:
        return None
    
    # Получаем карточки колоды
    card_rows = conn.execute("""
        SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
        FROM Card c 
        JOIN DeckCard dc ON c.id = dc.card_id
        WHERE dc.deck_id = ?
        ORDER BY c.created_at DESC
    """, (deck_id,)).fetchall()
    
    cards = []
    for card_row in card_rows:
        cards.append(CardResponse(**{
            "id": card_row[0], "front": card_row[1], "back": card_row[2], 
            "examples": card_row[3], "tags": card_row[4].split(",") if card_row[4] else [], 
            "user_id": card_row[5], "created_at": card_row[6]
        }))
    
    return {
        "id": deck_row[0],
        "title": deck_row[1],
        "description": deck_row[2],
        "rating_avg": deck_row[4] or 0.0,
        "rating_count": deck_row[5] or 0,
        "created_at": deck_row[6],
        "cards": cards
    }

def check_deck_access(conn, deck_id: int, user: UserResponse) -> tuple:
    """Проверка доступа к колоде и возврат информации о ней"""
    row = conn.execute("""
        SELECT id, name, description, UserId, rating_avg, rating_count, created_at
        FROM Deck WHERE id = ?
    """, (deck_id,)).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    deck_data = {
        "id": row[0], "title": row[1], "description": row[2], "user_id": row[3],
        "rating_avg": row[4] or 0.0, "rating_count": row[5] or 0, "created_at": row[6]
    }
    
    # Проверяем доступ: владелец или админ, или колода в коллекции пользователя
    has_access = (deck_data["user_id"] == user.id or user.role == UserRole.ADMIN)
    
    if not has_access:
        exists = conn.execute(
            "SELECT id FROM UserDeck WHERE user_id = ? AND deck_id = ?",
            (user.id, deck_id)
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return deck_data

def execute_db(query: str, params: tuple = (), fetchone: bool = False, fetchall: bool = False):
    """Универсальная функция для выполнения SQL запросов"""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        if fetchone:
            return cur.fetchone()
        if fetchall:
            return cur.fetchall()
        conn.commit()
        return cur.lastrowid
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}, query: {query}")
        raise
    finally:
        conn.close()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/register", response_model=AuthResponse)
def register(user: UserCreate):
    try:
        if execute_db("SELECT id FROM User WHERE email = ?", (user.email,), fetchone=True):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user_id = execute_db(
            "INSERT INTO User (email, name, password, role) VALUES (?, ?, ?, ?)",
            (user.email, user.name, hash_password(user.password), user.role.value)
        )
        
        row = execute_db(
            "SELECT id, email, name, role, created_at FROM User WHERE id = ?",
            (user_id,), fetchone=True
        )
        
        user_response = UserResponse(**{
            "id": row[0], "email": row[1], "name": row[2],
            "role": UserRole(row[3]), "created_at": row[4]
        })
        
        token = create_access_token(
            {"sub": user.email, "user_id": user_id, "role": user.role.value}
        )
        
        return AuthResponse(token=token, user_data=user_response)
    except Exception as e:
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login", response_model=AuthResponse)
def login(data: LoginRequest):
    row = execute_db(
        "SELECT id, email, password, role FROM User WHERE email = ?",
        (data.email,), fetchone=True
    )
    if not row:
        raise HTTPException(status_code=400, detail="User not found")
    
    user_id, email, hashed, role = row
    if not verify_password(data.password, hashed):
        raise HTTPException(status_code=400, detail="Invalid password")
    
    user_row = execute_db(
        "SELECT id, email, name, role, created_at FROM User WHERE id = ?",
        (user_id,), fetchone=True
    )
    
    user_response = UserResponse(**{
        "id": user_row[0], "email": user_row[1], "name": user_row[2],
        "role": UserRole(user_row[3]), "created_at": user_row[4]
    })
    
    token = create_access_token(
        {"sub": email, "user_id": user_id, "role": role}
    )
    
    return AuthResponse(token=token, user_data=user_response)

@app.get("/profile", response_model=UserResponse)
def profile(current: UserResponse = Depends(get_current_user)):
    return current

@app.post("/cards", response_model=CardResponse)
def create_card(data: CardCreate, current=Depends(get_current_user)):
    tags_str = ",".join(data.tags) if data.tags else None
    card_id = execute_db(
        "INSERT INTO Card (word, TranslitWord, examples, tags, UserId) VALUES (?, ?, ?, ?, ?)",
        (data.front, data.back, data.examples, tags_str, current.id)
    )
    
    row = execute_db("""
        SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
        FROM Card c WHERE c.id = ?
    """, (card_id,), fetchone=True)
    
    return CardResponse(**{
        "id": row[0], "front": row[1], "back": row[2], "examples": row[3],
        "tags": row[4].split(",") if row[4] else [], "user_id": row[5],
        "created_at": row[6]
    })

@app.put("/cards/{card_id}", response_model=CardResponse)
def update_card(card_id: int, data: CardUpdate, current=Depends(get_current_user)):
    # Проверка владения карточкой
    owner = execute_db("SELECT UserId FROM Card WHERE id = ?", (card_id,), fetchone=True)
    if not owner or (owner[0] != current.id and current.role != UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not your card")
    
    updates = []
    params = []
    fields = {
        "front": ("word", data.front),
        "back": ("TranslitWord", data.back),
        "examples": ("examples", data.examples),
        "tags": ("tags", ",".join(data.tags) if data.tags else None)
    }
    
    for field, (db_field, value) in fields.items():
        if value is not None and hasattr(data, field) and getattr(data, field) is not None:
            updates.append(f"{db_field} = ?")
            params.append(value)
    
    if updates:
        params.append(card_id)
        execute_db(f"UPDATE Card SET {', '.join(updates)} WHERE id = ?", tuple(params))
    
    # Получение обновленной карточки
    row = execute_db("""
        SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
        FROM Card c WHERE c.id = ?
    """, (card_id,), fetchone=True)
    
    return CardResponse(**{
        "id": row[0], "front": row[1], "back": row[2], "examples": row[3],
        "tags": row[4].split(",") if row[4] else [], "user_id": row[5],
        "created_at": row[6]
    })

@app.delete("/cards/{card_id}")
def delete_card(card_id: int, current=Depends(get_current_user)):
    owner = execute_db("SELECT UserId FROM Card WHERE id = ?", (card_id,), fetchone=True)
    if not owner:
        raise HTTPException(status_code=404, detail="Card not found")
    
    if owner[0] != current.id and current.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your card")
    
    execute_db("DELETE FROM Card WHERE id = ?", (card_id,))
    
    return {"message": f"Card {card_id} deleted successfully"}

@app.get("/cards", response_model=List[CardResponse])
def get_all_cards(current=Depends(get_current_user)):
    # Пользователи видят только свои карточки, админы - все
    if current.role == UserRole.ADMIN:
        rows = execute_db("""
            SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
            FROM Card c ORDER BY c.created_at DESC
        """, fetchall=True)
    else:
        rows = execute_db("""
            SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
            FROM Card c WHERE c.UserId = ? ORDER BY c.created_at DESC
        """, (current.id,), fetchall=True)
    
    return [CardResponse(**{
        "id": r[0], "front": r[1], "back": r[2], "examples": r[3],
        "tags": r[4].split(",") if r[4] else [], "user_id": r[5],
        "created_at": r[6]
    }) for r in rows]

@app.post("/decks", response_model=DeckWithCardsResponse)
def create_deck(data: DeckCreate, current=Depends(get_current_user)):
    deck_id = execute_db(
        "INSERT INTO Deck (name, description, UserId) VALUES (?, ?, ?)", 
        (data.title, data.description, current.id)
    )
    
    cards = []
    if data.card_ids:
        for card_id in data.card_ids:
            card = execute_db("SELECT UserId FROM Card WHERE id = ?", (card_id,), fetchone=True)
            if not card or (card[0] != current.id and current.role != UserRole.ADMIN):
                continue  # Пропускаем чужие карточки (кроме админа)
            execute_db(
                "INSERT OR IGNORE INTO DeckCard (deck_id, card_id) VALUES (?, ?)",
                (deck_id, card_id)
            )
            # Получаем добавленную карточку
            card_row = execute_db("""
                SELECT id, word, TranslitWord, examples, tags, UserId, created_at
                FROM Card WHERE id = ?
            """, (card_id,), fetchone=True)
            if card_row:
                cards.append(CardResponse(**{
                    "id": card_row[0], "front": card_row[1], "back": card_row[2],
                    "examples": card_row[3], "tags": card_row[4].split(",") if card_row[4] else [],
                    "user_id": card_row[5], "created_at": card_row[6]
                }))
    
    row = execute_db("""
        SELECT d.id, d.name, d.description, d.UserId, 
               d.rating_avg, d.rating_count, d.created_at
        FROM Deck d WHERE d.id = ?
    """, (deck_id,), fetchone=True)
    
    return DeckWithCardsResponse(**{
        "id": row[0], "title": row[1], "description": row[2],
        "rating_avg": row[4] or 0.0, "rating_count": row[5] or 0, 
        "created_at": row[6], "cards": cards
    })

@app.delete("/decks/{deck_id}")
def delete_deck(deck_id: int, current=Depends(get_current_user)):
    deck = execute_db("SELECT UserId FROM Deck WHERE id = ?", (deck_id,), fetchone=True)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    if deck[0] != current.id and current.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your deck")
    
    execute_db("DELETE FROM Deck WHERE id = ?", (deck_id,))
    
    return {"message": f"Deck {deck_id} deleted successfully"}

@app.post("/decks/{deck_id}/cards")
def add_cards_to_deck(deck_id: int, data: AddCardsToDeck, current=Depends(get_current_user)):
    deck = execute_db("SELECT UserId FROM Deck WHERE id = ?", (deck_id,), fetchone=True)
    if not deck or (deck[0] != current.id and current.role != UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not your deck")
    
    added = 0
    for card_id in data.card_ids:
        card = execute_db("SELECT UserId FROM Card WHERE id = ?", (card_id,), fetchone=True)
        if not card or (card[0] != current.id and current.role != UserRole.ADMIN):
            continue
        try:
            execute_db(
                "INSERT INTO DeckCard (deck_id, card_id) VALUES (?, ?)",
                (deck_id, card_id)
            )
            added += 1
        except sqlite3.IntegrityError:
            continue 
    
    return {"deck_id": deck_id, "cards_added": added}

@app.delete("/decks/{deck_id}/cards/{card_id}")
def remove_card_from_deck(deck_id: int, card_id: int, current=Depends(get_current_user)):
    deck = execute_db("SELECT UserId FROM Deck WHERE id = ?", (deck_id,), fetchone=True)
    if not deck or (deck[0] != current.id and current.role != UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not your deck")
    
    execute_db(
        "DELETE FROM DeckCard WHERE deck_id = ? AND card_id = ?",
        (deck_id, card_id)
    )
    return {"message": "Card removed from deck"}

@app.get("/decks", response_model=List[DeckWithCardsResponse])
def get_decks(
    search: Optional[str] = None,
    current=Depends(get_current_user)
):
    query = """
        SELECT d.id, d.name, d.description, d.UserId, 
               d.rating_avg, d.rating_count, d.created_at
        FROM Deck d WHERE 1=1
    """
    params = []
    
    if search:
        query += " AND (d.name LIKE ? OR d.description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    
    query += " ORDER BY d.created_at DESC"
    
    rows = execute_db(query, tuple(params), fetchall=True)
    
    decks_with_cards = []
    conn = get_db()
    try:
        for row in rows:
            deck_id = row[0]
            card_rows = conn.execute("""
                SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
                FROM Card c 
                JOIN DeckCard dc ON c.id = dc.card_id
                WHERE dc.deck_id = ?
                ORDER BY c.created_at DESC
            """, (deck_id,)).fetchall()
            
            cards = []
            for card_row in card_rows:
                cards.append(CardResponse(**{
                    "id": card_row[0], "front": card_row[1], "back": card_row[2],
                    "examples": card_row[3], "tags": card_row[4].split(",") if card_row[4] else [],
                    "user_id": card_row[5], "created_at": card_row[6]
                }))
            
            decks_with_cards.append(DeckWithCardsResponse(**{
                "id": row[0], "title": row[1], "description": row[2],
                "rating_avg": row[4] or 0.0, "rating_count": row[5] or 0,
                "created_at": row[6], "cards": cards
            }))
    finally:
        conn.close()
    
    return decks_with_cards

@app.get("/decks/{deck_id}", response_model=DeckWithCardsResponse)
def get_deck_detail(deck_id: int, current=Depends(get_current_user)):
    conn = get_db()
    try:
        deck_row = conn.execute("""
            SELECT id, name, description, UserId, rating_avg, rating_count, created_at
            FROM Deck WHERE id = ?
        """, (deck_id,)).fetchone()
        
        if not deck_row:
            raise HTTPException(status_code=404, detail="Deck not found")
        
        deck_user_id = deck_row[3]
        
        # Проверяем доступ: владелец или админ
        has_access = (deck_user_id == current.id or current.role == UserRole.ADMIN)
        
        # Если не владелец/админ, проверяем наличие в коллекции
        if not has_access:
            exists = conn.execute(
                "SELECT id FROM UserDeck WHERE user_id = ? AND deck_id = ?",
                (current.id, deck_id)
            ).fetchone()
            if not exists:
                raise HTTPException(status_code=403, detail="Access denied")
        
        card_rows = conn.execute("""
            SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
            FROM Card c 
            JOIN DeckCard dc ON c.id = dc.card_id
            WHERE dc.deck_id = ?
            ORDER BY c.created_at DESC
        """, (deck_id,)).fetchall()
        
        cards = []
        for card_row in card_rows:
            cards.append(CardResponse(**{
                "id": card_row[0], "front": card_row[1], "back": card_row[2], 
                "examples": card_row[3], "tags": card_row[4].split(",") if card_row[4] else [], 
                "user_id": card_row[5], "created_at": card_row[6]
            }))
        
        return DeckWithCardsResponse(**{
            "id": deck_row[0],
            "title": deck_row[1],
            "description": deck_row[2],
            "rating_avg": deck_row[4] or 0.0,
            "rating_count": deck_row[5] or 0,
            "created_at": deck_row[6],
            "cards": cards
        })
    finally:
        conn.close()

@app.post("/user-decks", response_model=UserDeckResponse)
def add_deck_to_user(data: UserDeckCreate, current=Depends(get_current_user)):
    deck = execute_db("SELECT UserId FROM Deck WHERE id = ?", (data.deck_id,), fetchone=True)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    if execute_db("SELECT id FROM UserDeck WHERE user_id = ? AND deck_id = ?", 
                  (current.id, data.deck_id), fetchone=True):
        raise HTTPException(status_code=400, detail="Deck already added")
    
    user_deck_id = execute_db(
        "INSERT INTO UserDeck (user_id, deck_id, is_favorite) VALUES (?, ?, ?)",
        (current.id, data.deck_id, data.is_favorite)
    )
    
    row = execute_db(
        "SELECT id, user_id, deck_id, is_favorite, created_at FROM UserDeck WHERE id = ?",
        (user_deck_id,), fetchone=True
    )
    
    return UserDeckResponse(**{
        "id": row[0], "user_id": row[1], "deck_id": row[2],
        "is_favorite": bool(row[3]), "created_at": row[4]
    })

@app.delete("/user-decks/{deck_id}")
def remove_deck_from_user(deck_id: int, current=Depends(get_current_user)):
    deck = execute_db("SELECT id FROM Deck WHERE id = ?", (deck_id,), fetchone=True)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    user_deck = execute_db(
        "SELECT id FROM UserDeck WHERE user_id = ? AND deck_id = ?", 
        (current.id, deck_id), fetchone=True
    )
    
    if not user_deck:
        raise HTTPException(status_code=404, detail="Deck not found in your collection")
    execute_db(
        "DELETE FROM UserDeck WHERE user_id = ? AND deck_id = ?",
        (current.id, deck_id)
    )
    
    return {"message": f"Deck {deck_id} removed from your collection"}

@app.get("/user-decks", response_model=List[DeckWithCardsResponse])
def get_user_decks(current=Depends(get_current_user)):
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT d.id, d.name, d.description, d.UserId, 
                   d.rating_avg, d.rating_count, d.created_at
            FROM Deck d JOIN UserDeck ud ON d.id = ud.deck_id
            WHERE ud.user_id = ? ORDER BY ud.created_at DESC
        """, (current.id,)).fetchall()
        
        decks_with_cards = []
        for row in rows:
            deck_id = row[0]
            card_rows = conn.execute("""
                SELECT c.id, c.word, c.TranslitWord, c.examples, c.tags, c.UserId, c.created_at
                FROM Card c 
                JOIN DeckCard dc ON c.id = dc.card_id
                WHERE dc.deck_id = ?
                ORDER BY c.created_at DESC
            """, (deck_id,)).fetchall()
            
            cards = []
            for card_row in card_rows:
                cards.append(CardResponse(**{
                    "id": card_row[0], "front": card_row[1], "back": card_row[2],
                    "examples": card_row[3], "tags": card_row[4].split(",") if card_row[4] else [],
                    "user_id": card_row[5], "created_at": card_row[6]
                }))
            
            decks_with_cards.append(DeckWithCardsResponse(**{
                "id": row[0], "title": row[1], "description": row[2],
                "rating_avg": row[4] or 0.0, "rating_count": row[5] or 0,
                "created_at": row[6], "cards": cards
            }))
        
        return decks_with_cards
    finally:
        conn.close()

@app.post("/tests", response_model=TestResponse)
def create_test(test: TestCreate, current=Depends(get_current_user)):
    if not execute_db("""
        SELECT 1 FROM Deck d JOIN UserDeck ud ON d.id = ud.deck_id
        WHERE d.id = ? AND ud.user_id = ?
    """, (test.deck_id, current.id), fetchone=True):
        raise HTTPException(status_code=403, detail="Add deck to your collection first")
    
    test_id = execute_db(
        "INSERT INTO Test (UserId, DeckId, score, total) VALUES (?, ?, ?, ?)",
        (current.id, test.deck_id, test.score, test.total)
    )
    
    percentage = (test.score / test.total * 100) if test.total > 0 else 0

    total_cards = execute_db(
        "SELECT COUNT(DISTINCT dc.card_id) FROM DeckCard dc WHERE dc.deck_id = ?",
        (test.deck_id,), fetchone=True
    )[0] or 0
    
    cards_learned = int((percentage / 100) * total_cards)
    
    row = execute_db(
        "SELECT id, UserId, DeckId, score, total, created_at FROM Test WHERE id = ?",
        (test_id,), fetchone=True
    )
    
    return TestResponse(**{
        "id": row[0], "user_id": row[1], "deck_id": row[2], "score": row[3],
        "total": row[4], "percentage": percentage, "created_at": row[5]
    })

@app.get("/tests/history", response_model=List[TestResponse])
def get_test_history(
    deck_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current=Depends(get_current_user)
):
    query = """
        SELECT t.id, t.UserId, t.DeckId, t.score, t.total, t.created_at
        FROM Test t WHERE t.UserId = ?
    """
    params = [current.id]
    
    if deck_id:
        query += " AND t.DeckId = ?"
        params.append(deck_id)
    
    query += " ORDER BY t.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    rows = execute_db(query, tuple(params), fetchall=True)
    
    return [TestResponse(**{
        "id": r[0], "user_id": r[1], "deck_id": r[2], "score": r[3],
        "total": r[4], "percentage": (r[3] / r[4] * 100) if r[4] > 0 else 0,
        "created_at": r[5]
    }) for r in rows]

@app.post("/reviews", response_model=ReviewResponse)
def create_review(data: ReviewCreate, current=Depends(get_current_user)):

    if not execute_db("SELECT 1 FROM UserDeck WHERE user_id = ? AND deck_id = ?", 
                     (current.id, data.deck_id), fetchone=True):
        raise HTTPException(status_code=403, detail="Add deck to your collection first")
    
    if not execute_db("SELECT 1 FROM Test WHERE UserId = ? AND DeckId = ? LIMIT 1", 
                     (current.id, data.deck_id), fetchone=True):
        raise HTTPException(status_code=400, detail="Complete a test first")
    
    existing = execute_db("SELECT id FROM Review WHERE user_id = ? AND deck_id = ?", 
                         (current.id, data.deck_id), fetchone=True)
    
    if existing:
        execute_db(
            "UPDATE Review SET rating = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (data.rating, existing[0])
        )
        review_id = existing[0]
    else:
        review_id = execute_db(
            "INSERT INTO Review (deck_id, user_id, rating) VALUES (?, ?, ?)",
            (data.deck_id, current.id, data.rating)
        )

    execute_db("""
        UPDATE Deck SET rating_avg = (
            SELECT AVG(rating) FROM Review WHERE deck_id = ?
        ), rating_count = (
            SELECT COUNT(*) FROM Review WHERE deck_id = ?
        ) WHERE id = ?
    """, (data.deck_id, data.deck_id, data.deck_id))
    
    row = execute_db("""
        SELECT r.id, r.deck_id, r.user_id, r.rating, r.reviewed_at
        FROM Review r WHERE r.id = ?
    """, (review_id,), fetchone=True)
    
    return ReviewResponse(**{
        "id": row[0], "deck_id": row[1], "user_id": row[2],
        "rating": row[3], "reviewed_at": row[4]
    })

@app.get("/reviews/deck/{deck_id}")
def get_deck_reviews(deck_id: int, current=Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("SELECT UserId FROM Deck WHERE id = ?", (deck_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deck not found")
        
        deck_user_id = row[0]
        has_access = (deck_user_id == current.id or current.role == UserRole.ADMIN)
        
        if not has_access:
            exists = conn.execute(
                "SELECT id FROM UserDeck WHERE user_id = ? AND deck_id = ?",
                (current.id, deck_id)
            ).fetchone()
            if not exists:
                raise HTTPException(status_code=403, detail="Access denied")
        
        row = conn.execute("""
            SELECT d.rating_avg, d.rating_count,
                   (SELECT rating FROM Review WHERE deck_id = ? AND user_id = ?) as user_rating
            FROM Deck d WHERE d.id = ?
        """, (deck_id, current.id, deck_id)).fetchone()
        
        return {
            "deck_id": deck_id,
            "rating_avg": float(row[0]) if row[0] else 0.0,
            "rating_count": row[1] or 0,
            "user_rating": row[2]
        }
    finally:
        conn.close()

@app.get("/stats")
def get_user_stats(current=Depends(get_current_user)):
    """Получение ОБЩЕЙ статистики пользователя по всем колодам за все время"""
    conn = get_db()
    try:
        row = conn.execute("""
            SELECT 
                SUM(score) as total_correct,
                SUM(total) as total_questions
            FROM Test 
            WHERE UserId = ?
        """, (current.id,)).fetchone()
        
        total_correct = row[0] or 0
        total_questions = row[1] or 0
        total_incorrect = total_questions - total_correct
        overall_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0

        decks_in_collection = conn.execute(
            "SELECT COUNT(*) FROM UserDeck WHERE user_id = ?", 
            (current.id,)
        ).fetchone()[0] or 0
        
        return {
            "correct_answers": total_correct,
            "incorrect_answers": total_incorrect,
            "total_questions": total_questions,
            "overall_accuracy": round(overall_accuracy, 2),
            "decks_in_collection": decks_in_collection
        }
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)