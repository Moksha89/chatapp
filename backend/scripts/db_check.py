from app.db import engine, Base

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("db ok")
