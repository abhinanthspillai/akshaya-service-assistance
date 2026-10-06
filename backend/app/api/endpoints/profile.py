import os
import uuid
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image

from app.api.deps import CurrentUser, SessionDep
from app.models.profile import EmployeeProfile

router = APIRouter()

UPLOAD_DIR = "uploads/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/employee/photo", status_code=status.HTTP_200_OK)
def upload_employee_photo(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...)
) -> Any:
    if current_user.role != "centre_employee":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only employees can upload profile photos")
    
    profile = session.get(EmployeeProfile, current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    try:
        # We must make sure file is closed. UploadFile has its own file descriptor but PIL might open it too.
        with Image.open(file.file) as img:
            img.verify() # verify it is an image
            
        file.file.seek(0)
        with Image.open(file.file) as img:
            # Resize
            img = img.resize((256, 256))
            filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.png"
            filepath = os.path.join(UPLOAD_DIR, filename)
            img.save(filepath, format="PNG")
            
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file")

    profile.photo_url = f"/api/v1/profile/employee/photo?ts={uuid.uuid4().hex[:8]}"
    
    # Store the actual path in the DB or we can just derive it. 
    # Let's save the filename in the photo_url actually, so we can fetch it later.
    profile.photo_url = filename
    session.add(profile)
    session.commit()
    
    return {"photo_url": f"/api/v1/profile/employee/photo?filename={filename}"}

@router.get("/employee/photo")
def get_employee_photo(
    filename: str,
) -> Any:
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    
    return FileResponse(filepath)
