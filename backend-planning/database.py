import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# 1. On charge le fichier .env pour pouvoir lire les secrets
load_dotenv()

# 2. On récupère l'adresse de la base de données
# La variable doit avoir le même nom que dans ton fichier .env
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Petite sécurité : si l'URL est vide, on arrête tout de suite
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("ERREUR : DATABASE_URL est introuvable. Vérifie ton fichier .env !")

# 3. Création du "Moteur" (Engine)
# C'est l'objet qui gère la connexion réelle avec Supabase
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 4. Création de la "Session"
# Une session, c'est comme une "conversation" avec la base de données.
# On l'ouvre, on fait des requêtes, et on la ferme.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. La "Base" des modèles
# Toutes nos futures tables (Users, Shifts) vont hériter de cette classe.
# Ça permet à SQLAlchemy de savoir quelles tables il doit gérer.
Base = declarative_base()

# 6. Fonction utilitaire pour FastAPI (Dependency)
# Cette fonction sera appelée à chaque fois qu'on reçoit une requête (ex: créer un shift).
# Elle ouvre une session, laisse faire le travail, et referme la session proprement (même si ça plante).
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()