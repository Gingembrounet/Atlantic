from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any
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

class ShiftBase(BaseModel):
    planned_start: str
    planned_end: str
    position: str
    type: str = "work"
    quantity: Optional[float] = None
    
    # Pauses
    break_type: str = "flexible"
    break_duration: int = 0
    break_times: Optional[List[Dict[str, Any]]] = None
    break_paid: bool = False

class ShiftCreate(ShiftBase):
    user_id: int

class ShiftUpdate(BaseModel):
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    position: Optional[str] = None
    type: Optional[str] = None
    quantity: Optional[float] = None
    break_type: Optional[str] = None
    break_duration: Optional[int] = None
    break_times: Optional[List[Dict[str, Any]]] = None
    break_paid: Optional[bool] = None

class ShiftResponse(ShiftBase):
    id: int
    user_id: int
    class Config:
        orm_mode = True

# --- SHIFT TEMPLATES ---
class ShiftTemplateBase(BaseModel):
    name: str
    start_time: str
    end_time: str
    position: str
    applicable_days: List[int] = []
    
    # Pauses
    break_type: str = "flexible"
    break_duration: int = 0
    break_times: Optional[List[Dict[str, Any]]] = None
    break_paid: bool = False

class ShiftTemplateCreate(ShiftTemplateBase):
    establishment_id: int

class ShiftTemplateResponse(ShiftTemplateBase):
    id: int
    establishment_id: int
    class Config:
        orm_mode = True