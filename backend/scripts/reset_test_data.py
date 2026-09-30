import os
import sys
import argparse
import subprocess
from pathlib import Path
from sqlalchemy import create_engine, text

def confirm_local_db(db_url: str):
    local_hosts = ["localhost", "127.0.0.1", "host.docker.internal"]
    is_local = False
    for lh in local_hosts:
        if f"@{lh}" in db_url or f"@{lh}:" in db_url:
            is_local = True
            break
    if "sqlite" in db_url:
        is_local = True

    if not is_local:
        print("ABORT: DATABASE_URL does not appear to point to a local dev database.")
        print(f"DATABASE_URL={db_url}")
        sys.exit(1)

def backup_db(db_url: str):
    backup_file = "backup_before_reset.sql"
    print(f"Creating database backup at {backup_file}...")
    try:
        subprocess.run(["pg_dump", db_url, "-f", backup_file], check=True)
        print("Backup successful.")
    except FileNotFoundError:
        print("WARNING: pg_dump not found in PATH. Skipping backup.")
    except subprocess.CalledProcessError as e:
        print(f"WARNING: pg_dump failed. Please check your connection. Error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Reset test data for local development.")
    parser.add_argument("--yes", action="store_true", help="Confirm deletion (otherwise runs in dry-run mode)")
    args = parser.parse_args()

    # Need to load env to get DATABASE_URL if it's not set
    # Usually in backend/.env
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent.parent / ".env")
        db_url = os.environ.get("DATABASE_URL")
    
    if not db_url:
        print("Error: DATABASE_URL not found in environment or .env file.")
        sys.exit(1)

    confirm_local_db(db_url)

    if args.yes:
        backup_db(db_url)

    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        print(f"\n--- {'EXECUTING' if args.yes else 'DRY RUN'} DATA WIPE ---")
        
        def count(table: str, where: str = "1=1") -> int:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table} WHERE {where}"))
            return result.scalar() or 0

        # Citizens and their data
        citizen_count = count("users", "role = 'citizen'")
        print(f"Users (Citizens): {citizen_count} to delete")
        
        # Support tickets
        ticket_count = count("support_tickets")
        print(f"Support Tickets: {ticket_count} to delete")
        
        # Requests
        request_count = count("service_requests")
        print(f"Service Requests: {request_count} to delete")
        
        # Request documents
        document_count = count("request_documents")
        print(f"Request Documents: {document_count} to delete")
        
        # Request history / assignments
        history_count = count("request_history")
        assignment_count = count("request_assignments")
        print(f"Request History: {history_count} to delete")
        print(f"Request Assignments: {assignment_count} to delete")
        
        # Notifications
        notification_count = count("notifications")
        print(f"Notifications: {notification_count} to delete")
        
        
        
        if args.yes:
            print("\nExecuting deletions...")
            # We must delete in the correct order to respect foreign keys
            # Or temporarily disable triggers (Postgres)
            
            # Disable triggers to avoid FK constraints issues during wipe
            conn.execute(text("SET session_replication_role = 'replica';"))
            
            try:
                # Clear all transactional data completely
                conn.execute(text("TRUNCATE TABLE support_ticket_messages CASCADE;"))
                conn.execute(text("TRUNCATE TABLE support_tickets CASCADE;"))
                conn.execute(text("TRUNCATE TABLE document_reviews CASCADE;"))
                conn.execute(text("TRUNCATE TABLE request_documents CASCADE;"))
                conn.execute(text("TRUNCATE TABLE request_history CASCADE;"))
                conn.execute(text("TRUNCATE TABLE request_assignments CASCADE;"))
                conn.execute(text("TRUNCATE TABLE service_requests CASCADE;"))
                conn.execute(text("TRUNCATE TABLE notifications CASCADE;"))
                
                
                # Delete citizens specifically (and their profiles)
                conn.execute(text("DELETE FROM citizen_profiles;"))
                conn.execute(text("DELETE FROM users WHERE role = 'citizen';"))
                
                # Reset sequences if any exist
                # ...
                
                # Re-enable triggers
                conn.execute(text("SET session_replication_role = 'origin';"))
                conn.commit()
                print("Data wipe successful.")
                
            except Exception as e:
                conn.execute(text("SET session_replication_role = 'origin';"))
                print(f"Error during deletion: {e}")
                sys.exit(1)
            
            # Print remaining accounts
            print("\nRemaining Employee & Admin accounts:")
            remaining = conn.execute(text("SELECT email, role FROM users WHERE role != 'citizen'")).fetchall()
            for r in remaining:
                print(f" - {r[0]} ({r[1]})")

        else:
            print("\nThis was a dry run. No data was deleted. Run with --yes to execute.")

if __name__ == "__main__":
    main()
