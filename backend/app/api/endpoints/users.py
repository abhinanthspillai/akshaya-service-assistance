import io
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.api.deps import CurrentUser, SessionDep
from app.core.config import get_settings

router = APIRouter()

def crop_center(pil_img: Image.Image, crop_width: int, crop_height: int) -> Image.Image:
    img_width, img_height = pil_img.size
    return pil_img.crop(((img_width - crop_width) // 2,
                         (img_height - crop_height) // 2,
                         (img_width + crop_width) // 2,
                         (img_height + crop_height) // 2))

@router.post("/me/photo")
async def upload_photo(
    current_user: CurrentUser,
    session: SessionDep,
    file: UploadFile = File(...)
):
    if file.size and file.size > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum 2 MB allowed.")
        
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum 2 MB allowed.")
        
    try:
        with Image.open(io.BytesIO(contents)) as img:
            if img.format not in ("JPEG", "PNG", "WEBP"):
                raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP are allowed.")
            
            min_dim = min(img.width, img.height)
            img_cropped = crop_center(img, min_dim, min_dim)
            img_resized = img_cropped.resize((256, 256), Image.Resampling.LANCZOS)
            
            out_io = io.BytesIO()
            if img_resized.mode in ("RGBA", "P") and img.format == "JPEG":
                img_resized = img_resized.convert("RGB")
            
            save_format = img.format if img.format else "PNG"
            ext = save_format.lower()
            if ext == "jpeg":
                ext = "jpg"
                
            img_resized.save(out_io, format=save_format)
            processed_bytes = out_io.getvalue()
            
    except UnidentifiedImageError:
        raise HTTPException(status_code=415, detail="Invalid image content.")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error processing image.")

    settings = get_settings()
    filename = f"{uuid4().hex}.{ext}"
    avatars_dir = Path(settings.file_storage_path) / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)
    file_path = avatars_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(processed_bytes)
        
    if current_user.profile_photo:
        old_path = avatars_dir / current_user.profile_photo
        if old_path.exists():
            old_path.unlink()

    current_user.profile_photo = filename
    session.add(current_user)
    session.commit()
    
    return {"photo_url": f"/api/v1/avatars/{filename}"}

@router.delete("/me/photo", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    current_user: CurrentUser,
    session: SessionDep,
):
    if not current_user.profile_photo:
        return
        
    settings = get_settings()
    avatars_dir = Path(settings.file_storage_path) / "avatars"
    old_path = avatars_dir / current_user.profile_photo
    
    if old_path.exists():
        old_path.unlink()
        
    current_user.profile_photo = None
    session.add(current_user)
    session.commit()

from app.schemas.user import UserUpdate, UserAuthMe
from app.models.profile import CitizenProfile, EmployeeProfile
from sqlalchemy import select

@router.patch("/me", response_model=UserAuthMe)
def update_profile(
    user_in: UserUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    if current_user.role == "citizen":
        profile = session.scalar(select(CitizenProfile).where(CitizenProfile.user_id == current_user.id))
        if profile:
            if user_in.full_name is not None:
                profile.full_name = user_in.full_name
            if user_in.phone is not None:
                profile.phone = user_in.phone
            if user_in.address_text is not None:
                profile.address_text = user_in.address_text
            session.add(profile)
    elif current_user.role == "centre_employee":
        profile = session.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id))
        if profile:
            if user_in.full_name is not None:
                profile.full_name = user_in.full_name
            session.add(profile)
            
    session.commit()
    
    # Reload and return UserAuthMe structure by just querying auth/me basically
    from app.api.endpoints.auth import get_auth_me
    return get_auth_me(current_user, session)
