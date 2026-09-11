import uuid
from app.models.user import User
from app.models.profile import CitizenProfile, EmployeeProfile, CentreAdministrator
from app.models.centre import AkshayaCentre

def test_user_model_instantiation() -> None:
    user = User(
        email="test@example.com",
        password_hash="hash",
        role="citizen",
        is_active=True
    )
    assert user.email == "test@example.com"
    assert user.role == "citizen"

def test_centre_model_instantiation() -> None:
    centre = AkshayaCentre(
        name="Test Centre",
        code="C001",
        address_text="Test Address",
        district="Test District"
    )
    assert centre.code == "C001"

def test_profile_model_instantiation() -> None:
    uid = uuid.uuid4()
    profile = CitizenProfile(
        user_id=uid,
        full_name="Test User"
    )
    assert profile.full_name == "Test User"
    assert profile.user_id == uid
