import os
import datetime
import random
import jwt
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, Parent, OTP, Child, Character

SQLALCHEMY_DATABASE_URL = "sqlite:///./rami.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

app = FastAPI()

SECRET_KEY = os.environ.get("RAMI_SECRET_KEY", "DEFAULT_SECRET_KEY_FOR_TESTING")
ALGORITHM = "HS256"

from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError

# Pydantic Schemas
class EmailRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class ChildCreate(BaseModel):
    name: str

class CharacterCreate(BaseModel):
    name: str
    type: str

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login/admin")

def get_current_parent(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        parent_id: str = payload.get("sub")
        if parent_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    parent = db.query(Parent).filter(Parent.id == int(parent_id)).first()
    if parent is None:
        raise credentials_exception
    return parent

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/register")
def register(request: EmailRequest, db: Session = Depends(get_db)):
    parent = db.query(Parent).filter(Parent.email == request.email).first()
    if not parent:
        parent = Parent(email=request.email)
        db.add(parent)
        db.commit()
    return {"message": "User registered. You can now request an OTP."}

@app.post("/login/request-otp")
def request_otp(request: EmailRequest, db: Session = Depends(get_db)):
    parent = db.query(Parent).filter(Parent.email == request.email).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Email not registered")

    # Generate 6-digit OTP
    otp_code = f"{random.randint(0, 999999):06d}"

    # Store OTP
    expiration = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)
    otp_entry = OTP(email=request.email, code=otp_code, expires_at=expiration)
    db.add(otp_entry)
    db.commit()

    # In a real app, send an email here
    print(f"OTP for {request.email}: {otp_code}")

    return {"message": "OTP sent"}

@app.post("/login/verify-otp", response_model=TokenResponse)
def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    parent = db.query(Parent).filter(Parent.email == request.email).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Email not registered")

    now = datetime.datetime.now(datetime.timezone.utc)

    # We strip timezone for sqlite comparison since datetime doesn't have it in sqlite by default
    otp_entry = db.query(OTP).filter(
        OTP.email == request.email,
        OTP.code == request.otp,
    ).order_by(OTP.id.desc()).first()

    if not otp_entry:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if otp_entry.expires_at.replace(tzinfo=datetime.timezone.utc) < now:
         raise HTTPException(status_code=400, detail="Expired OTP")

    # Mark OTP as used (or delete it)
    db.delete(otp_entry)
    db.commit()

    access_token = create_access_token(data={"sub": str(parent.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/profiles")
def get_profiles(current_parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    children = db.query(Child).filter(Child.parent_id == current_parent.id).all()
    profiles = []
    for child in children:
        characters = db.query(Character).filter(Character.child_id == child.id).all()
        profiles.append({
            "id": child.id,
            "name": child.name,
            "characters": [{"id": c.id, "name": c.name, "type": c.type} for c in characters]
        })
    return profiles

@app.post("/profiles")
def create_profile(request: ChildCreate, current_parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = Child(parent_id=current_parent.id, name=request.name)
    db.add(child)
    db.commit()
    db.refresh(child)
    return {"id": child.id, "name": child.name, "message": "Profile created"}

@app.post("/profiles/{child_id}/character")
def create_character(child_id: int, request: CharacterCreate, current_parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    # Verify child belongs to parent
    child = db.query(Child).filter(Child.id == child_id, Child.parent_id == current_parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")

    character = Character(child_id=child.id, name=request.name, type=request.type)
    db.add(character)
    db.commit()
    db.refresh(character)
    return {"id": character.id, "name": character.name, "type": character.type, "message": "Character created"}

from fastapi.security import OAuth2PasswordRequestForm

@app.post("/login/admin", response_model=TokenResponse)
def login_admin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    if form_data.username == "admin" and form_data.password == "admin":
        parent = db.query(Parent).filter(Parent.email == "admin@rami.com").first()
        if not parent:
            parent = Parent(email="admin@rami.com", is_admin=True)
            db.add(parent)
            db.commit()
            db.refresh(parent)
        access_token = create_access_token(data={"sub": str(parent.id)})
        return {"access_token": access_token, "token_type": "bearer"}

    raise HTTPException(status_code=400, detail="Invalid admin credentials")

@app.post("/login/google", response_model=TokenResponse)
def login_google(request: EmailRequest, db: Session = Depends(get_db)):
    # Mock Google login
    parent = db.query(Parent).filter(Parent.email == request.email).first()
    if not parent:
        parent = Parent(email=request.email)
        db.add(parent)
        db.commit()
        db.refresh(parent)

    access_token = create_access_token(data={"sub": str(parent.id)})
    return {"access_token": access_token, "token_type": "bearer"}
