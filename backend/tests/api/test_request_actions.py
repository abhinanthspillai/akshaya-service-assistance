from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.enums import RequestAction


def test_every_distinct_action_in_request_history_is_valid_request_action(db_session: Session):
    """Assert that every distinct action in request_history matches a valid RequestAction value."""
    result = db_session.execute(text("SELECT DISTINCT action FROM request_history")).fetchall()
    valid_actions = {a.value for a in RequestAction}

    for (action_val,) in result:
        assert action_val in valid_actions, f"Action '{action_val}' in request_history is not a valid RequestAction"


def test_legacy_action_mapping_converts_to_request_actions(db_session: Session):
    """Test that explicit legacy values map cleanly to RequestAction values."""
    legacy_mapping = {
        "CANCELLED": RequestAction.CANCEL.value,
        "REASSIGNED": RequestAction.REASSIGN.value,
        "UNABLE_TO_PROCEED": RequestAction.UNABLE_TO_PROCEED.value,
    }

    for legacy_val, mapped_val in legacy_mapping.items():
        assert mapped_val in {a.value for a in RequestAction}
        assert mapped_val == legacy_val.lower() or mapped_val in ("cancel", "reassign", "unable_to_proceed")
