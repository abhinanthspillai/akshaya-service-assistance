import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.assignment import RequestAssignment
from sqlalchemy import update

def main():
    session = SessionLocal()
    try:
        session.execute(update(RequestAssignment).values(is_active=False))
        session.commit()
        print("Successfully cleared all active request assignments.")
    except Exception as e:
        print(f"Error clearing assignments: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main()
