from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
import re
from enum import Enum

EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: UserRole = UserRole.USER

    @validator("email")
    def validate_email(cls, v):
        if not re.match(EMAIL_REGEX, v):
            raise ValueError("Invalid email format")
        return v

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    created_at: Optional[datetime] = None

class AuthResponse(BaseModel):
    token: str
    user_data: UserResponse

class DeckCreate(BaseModel):
    title: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    card_ids: Optional[List[int]] = None

class DeckResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    rating_avg: float = 0.0
    rating_count: int = 0
    created_at: Optional[datetime] = None

class DeckWithCardsResponse(DeckResponse):
    cards: List["CardResponse"] = []

class UserDeckCreate(BaseModel):
    deck_id: int
    is_favorite: bool = False

class UserDeckResponse(BaseModel):
    id: int
    user_id: int
    deck_id: int
    is_favorite: bool = False
    created_at: Optional[datetime] = None

class CardCreate(BaseModel):
    front: str
    back: str
    examples: Optional[str] = None
    tags: Optional[List[str]] = None

class CardResponse(BaseModel):
    id: int
    front: str
    back: str
    examples: Optional[str] = None
    tags: List[str] = []
    user_id: int
    created_at: Optional[datetime] = None

class CardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    examples: Optional[str] = None
    tags: Optional[List[str]] = None

class ReviewCreate(BaseModel):
    deck_id: int
    rating: int = Field(..., ge=1, le=5)

class ReviewResponse(BaseModel):
    id: int
    deck_id: int
    user_id: int
    rating: int
    reviewed_at: Optional[datetime] = None

class TestCreate(BaseModel):
    deck_id: int
    total: int
    score: float

    @validator("score")
    def validate_score(cls, v, values):
        if "total" in values and v > values["total"]:
            raise ValueError("Score cannot be greater than total")
        return v

class TestResponse(BaseModel):
    id: int
    user_id: int
    deck_id: int
    score: float
    total: int
    percentage: float = 0.0
    created_at: Optional[datetime] = None

class LoginRequest(BaseModel):
    email: str
    password: str

    @validator("email")
    def validate_email(cls, v):
        if not re.match(EMAIL_REGEX, v):
            raise ValueError("Invalid email format")
        return v

class TokenResponse(BaseModel):
    token: str

class AddCardsToDeck(BaseModel):
    card_ids: List[int]

DeckWithCardsResponse.update_forward_refs()