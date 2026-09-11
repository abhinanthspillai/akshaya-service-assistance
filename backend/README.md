# Backend

FastAPI service for the Akshaya MCA project.

## Local commands

```bash
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
ruff format --check .
ruff check .
mypy app tests
pytest
alembic upgrade head
```

`alembic upgrade head` expects `DATABASE_URL` to point at a PostgreSQL database.
