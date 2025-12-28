from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from enum import Enum

# On reprend les mêmes rôles que dans models.py pour que Pydantic comprenne
class UserRole(str, Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"

# --- 1. SCHEMAS POUR L'ÉTABLISSEMENT ---
class EstablishmentBase(BaseModel):
    name: str
    address: Optional[str] = None

class EstablishmentCreate(EstablishmentBase):
    pass

class EstablishmentResponse(EstablishmentBase):
    id: int
    
    class Config:
        from_attributes = True

# --- 2. SCHEMAS POUR LES UTILISATEURS ---
# schemas.py (Mise à jour UserBase)

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.EMPLOYEE
    hourly_rate: float = 12.0
    establishment_id: int
    
    # On ajoute ça :
    manager_id: Optional[int] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None # Ou Optional[UserRole] si tu as l'enum importé
    hourly_rate: Optional[float] = None

class UserSetup(BaseModel):
    token: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(UserBase):
    id: int
    # Pas de mot de passe ici ! On ne le renvoie jamais
    
    class Config:
        from_attributes = True

# 1. Les champs communs (Base)
class ShiftBase(BaseModel):
    planned_start: str  # On garde le même nom que dans models.py !
    planned_end: str
    position: str
    type: str = "work"
    quantity: float

# 2. Ce qu'on utilise pour CRÉER (POST)
# C'est lui qui est crucial : il ajoute user_id aux champs de base
class ShiftCreate(ShiftBase):
    user_id: int

# 3. Ce qu'on utilise pour MODIFIER (PUT)
class ShiftUpdate(BaseModel):
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    position: Optional[str] = None
    type: Optional[str] = None

# 4. Ce qu'on renvoie au frontend (Lecture)
class ShiftResponse(ShiftBase):
    id: int
    user_id: int
    class Config:
        orm_mode = True

class ShiftTemplateBase(BaseModel):
    name: str
    start_time: str
    end_time: str
    position: str
    establishment_id: int
    applicable_days: List[int] = [0, 1, 2, 3, 4, 5, 6]

class ShiftTemplateCreate(ShiftTemplateBase):
    pass

class ShiftTemplateResponse(ShiftTemplateBase):
    id: int
    class Config:
        orm_mode = True