from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from database import engine, get_db
import models, schemas, auth
from typing import Optional
from fastapi.security import OAuth2PasswordRequestForm


# Création des tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Planning SaaS API")

# Configuration CORS (Pour que le Front puisse parler au Back)
origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ==========================
# 🔐 AUTHENTIFICATION (LOGIN)
# ==========================
@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. On cherche l'user par son email (username dans le form = email)
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. On vérifie le mot de passe
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Si c'est bon, on crée le token
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- ROUTE DE TEST (La racine /) ---
@app.get("/")
def read_root():
    return {"message": "API Connectée et Prête !"}

# --- ÉTABLISSEMENTS ---
@app.post("/establishments", response_model=schemas.EstablishmentResponse) # PAS DE SLASH A LA FIN
def create_establishment(establishment: schemas.EstablishmentCreate, db: Session = Depends(get_db)):
    db_est = models.Establishment(**establishment.dict())
    db.add(db_est)
    db.commit()
    db.refresh(db_est)
    return db_est

# --- UTILISATEURS ---
# ==========================
# 📩 INVITATION (Par le Manager)
# ==========================
@app.post("/users", response_model=schemas.UserResponse)
def invite_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Vérif email
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email déjà pris")
    
    # 2. On crée l'user SANS mot de passe pour l'instant
    # (Assure-toi que hashed_password est nullable dans ta DB, sinon mets une chaine vide "")
    new_user = models.User(**user.dict(), hashed_password=None)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 3. GÉNÉRATION DU LIEN D'INVITATION
    # On crée un token spécial qui contient l'email de l'invité
    invite_token = auth.create_access_token(data={"sub": new_user.email, "type": "invite"})
    
    invite_link = f"http://localhost:5173/setup-password?token={invite_token}"
    
    # 4. SIMULATION EMAIL (C'est ici qu'on branchera SendGrid/Gmail plus tard)
    print("\n" + "="*60)
    print(f"📧 [EMAIL SIMULÉ] Envoyé à {new_user.email}")
    print(f"👋 Bonjour {new_user.full_name}, bienvenue dans l'équipe !")
    print(f"🔗 Cliquez ici pour créer votre mot de passe :")
    print(f"{invite_link}")
    print("="*60 + "\n")
    
    return new_user


# ==========================
# 🔑 DÉFINITION DU MOT DE PASSE (Par l'Employé)
# ==========================
@app.post("/setup-password")
def setup_password(setup_data: schemas.UserSetup, db: Session = Depends(get_db)):
    # 1. On décode le token pour retrouver l'email
    try:
        payload = auth.jwt.decode(setup_data.token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Token invalide")
    except Exception:
        raise HTTPException(status_code=400, detail="Lien expiré ou invalide")
        
    # 2. On récupère l'user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
    # 3. On définit ENFIN le mot de passe
    hashed_pwd = auth.get_password_hash(setup_data.password)
    user.hashed_password = hashed_pwd
    
    db.commit()
    
    return {"message": "Mot de passe défini avec succès ! Vous pouvez vous connecter."}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/users", response_model=List[schemas.UserResponse])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    establishment_id: Optional[int] = None, # <--- LE FILTRE EST ICI
    db: Session = Depends(get_db)
):
    query = db.query(models.User)
    
    # Si on fournit un ID, on filtre. Sinon, on renvoie tout.
    if establishment_id:
        query = query.filter(models.User.establishment_id == establishment_id)
        
    return query.offset(skip).limit(limit).all()

# main.py

# ... (Assure-toi que auth est importé)

@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def read_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user) # <--- ON VÉRIFIE L'IDENTITÉ
):
    # 1. On cherche l'utilisateur cible (celui qu'on veut voir)
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if target_user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # 2. LOGIQUE DE SÉCURITÉ (Le Videur)
    
    # Si c'est un Admin : OK, il passe
    if current_user.role == models.UserRole.ADMIN:
        return target_user

    # Si c'est l'utilisateur lui-même (il regarde son propre profil) : OK
    if current_user.id == target_user.id:
        return target_user

    # Si c'est un Manager : On vérifie s'ils sont dans le MEME établissement
    if current_user.role == models.UserRole.MANAGER:
        if current_user.establishment_id == target_user.establishment_id:
            return target_user
    
    # 3. Si aucune condition n'est remplie -> DEHORS !
    raise HTTPException(status_code=403, detail="Accès interdit : Vous n'avez pas les droits sur cet employé.")

@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int, 
    user_update: schemas.UserUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user) # <--- SÉCURITÉ
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # --- SÉCURITÉ ---
    
    # 1. Un employé simple ne peut JAMAIS modifier un profil (même le sien via cette route admin)
    # (Pour modifier son propre profil, on fera une route spécifique /me/profile plus tard)
    if current_user.role == models.UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Interdit aux employés")

    # 2. Un Manager ne peut modifier que SES employés
    if current_user.role == models.UserRole.MANAGER:
        if db_user.establishment_id != current_user.establishment_id:
            raise HTTPException(status_code=403, detail="Ce n'est pas votre employé")
        
        # BONUS : Un manager ne peut pas modifier un autre manager ou un admin !
        if db_user.role in [models.UserRole.MANAGER, models.UserRole.ADMIN] and db_user.id != current_user.id:
             raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier un supérieur")

    # (L'Admin passe toutes ces vérifs implicitement)

    # --- FIN SÉCURITÉ ---

    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

# --- ROUTES POUR LES SHIFTS ---


@app.post("/shifts", response_model=schemas.ShiftResponse)
def create_shift(shift: schemas.ShiftCreate, db: Session = Depends(get_db)):
    # 1. Vérif optionnelle (est-ce que l'user existe ?)
    user = db.query(models.User).filter(models.User.id == shift.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # 2. Création
    # L'étoile **shift.dict() va déballer : user_id, planned_start, planned_end...
    # Comme les noms sont IDENTIQUES dans models et schemas, ça marche direct.
    db_shift = models.Shift(**shift.dict())
    
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    
    return db_shift

# 2. MODIFIER (PUT)
@app.put("/shifts/{shift_id}", response_model=schemas.ShiftResponse)
def update_shift(shift_id: int, shift_update: schemas.ShiftUpdate, db: Session = Depends(get_db)):
    db_shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift introuvable")
    
    update_data = shift_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_shift, key, value)
    
    db.commit()
    db.refresh(db_shift)
    return db_shift

# 3. SUPPRIMER (DELETE)
@app.delete("/shifts/{shift_id}")
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    db_shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift introuvable")
    
    db.delete(db_shift)
    db.commit()
    return {"message": "Shift supprimé"}

# 4. LIRE (GET) - Pour afficher le planning
@app.get("/shifts", response_model=List[schemas.ShiftResponse])
def read_shifts(establishment_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Shift)
    if establishment_id:
        # On fait une jointure pour filtrer par l'établissement de l'user
        query = query.join(models.User).filter(models.User.establishment_id == establishment_id)
    return query.all()

@app.post("/shift-templates", response_model=schemas.ShiftTemplateResponse)
def create_shift_template(template: schemas.ShiftTemplateCreate, db: Session = Depends(get_db)):
    db_template = models.ShiftTemplate(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@app.get("/shift-templates", response_model=List[schemas.ShiftTemplateResponse])
def read_shift_templates(establishment_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.ShiftTemplate)
    if establishment_id:
        query = query.filter(models.ShiftTemplate.establishment_id == establishment_id)
    return query.all()

@app.delete("/shift-templates/{template_id}")
def delete_shift_template(template_id: int, db: Session = Depends(get_db)):
    db_template = db.query(models.ShiftTemplate).filter(models.ShiftTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    db.delete(db_template)
    db.commit()
    return {"message": "Supprimé"}

@app.get("/establishments", response_model=List[schemas.EstablishmentResponse])
def read_establishments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Establishment).offset(skip).limit(limit).all()

