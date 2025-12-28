from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Enum, DateTime, Float, JSON
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

class Establishment(Base):
    __tablename__ = "establishments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String, nullable=True)
    
    users = relationship("User", back_populates="establishment")
    shift_templates = relationship("ShiftTemplate", back_populates="establishment")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE)
    hourly_rate = Column(Float, default=11.5)
    establishment_id = Column(Integer, ForeignKey("establishments.id"), nullable=True)
    manager_id = Column(Integer, nullable=True)
    
    establishment = relationship("Establishment", back_populates="users")
    
    # ICI C'EST IMPORTANT : back_populates doit viser "user" (pas owner)
    shifts = relationship("Shift", back_populates="user") 

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True, index=True)
    
    # On garde tes noms précis
    planned_start = Column(String, nullable=True)
    planned_end = Column(String, nullable=True)
    position = Column(String)
    type = Column(String, default="work")
    quantity = Column(Float, nullable=True)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # ICI C'EST IMPORTANT : La variable s'appelle "user"
    user = relationship("User", back_populates="shifts")

class ShiftTemplate(Base):
    __tablename__ = "shift_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    start_time = Column(String)
    end_time = Column(String)
    position = Column(String)
    applicable_days = Column(JSON, default=[0, 1, 2, 3, 4, 5, 6])
    
    establishment_id = Column(Integer, ForeignKey("establishments.id"))
    establishment = relationship("Establishment", back_populates="shift_templates")