from PIL import Image
import io
from fastapi import HTTPException, status
from app.core.config import settings

ARTWORK_SPECS = {
    "poster": {
        "aspect": "2:3",
        "aspect_ratio": 2 / 3,  # 0.6667
        "target_px": (600, 900),
        "max_kb": 200
    },
    "banner": {
        "aspect": "16:9",
        "aspect_ratio": 16 / 9,  # 1.7778
        "target_px": (1280, 720),
        "max_kb": 200
    },
    "thumbnail": {
        "aspect": "16:9",
        "aspect_ratio": 16 / 9,  # 1.7778
        "target_px": (640, 360),
        "max_kb": 200
    }
}

def validate_artwork(art_type: str, file_bytes: bytes, filename: str) -> dict:
    """
    Validates uploaded artwork against reference specs.
    Throws HTTPException with non-technical, human-readable error messages for editors.
    """
    clean_art_type = art_type.lower().strip()
    if clean_art_type not in ARTWORK_SPECS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid artwork type '{art_type}'. Allowed types are: poster, banner, thumbnail."
        )

    spec = ARTWORK_SPECS[clean_art_type]
    size_kb = len(file_bytes) / 1024.0

    # 1. Check file size ceiling (200 KB)
    if size_kb > spec["max_kb"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded {clean_art_type} is too large ({size_kb:.1f} KB). Maximum allowed size for {clean_art_type}s is {spec['max_kb']} KB. Please compress your image."
        )

    # 2. Inspect image using Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        width, height = image.size
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file could not be read as an image. Please ensure you upload a valid JPEG, PNG, or WebP file."
        )

    # 3. Check Aspect Ratio with reasonable tolerance (±5%)
    actual_ratio = width / height
    expected_ratio = spec["aspect_ratio"]
    tolerance = 0.05

    if abs(actual_ratio - expected_ratio) > tolerance:
        target_w, target_h = spec["target_px"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded {clean_art_type} dimensions are {width}x{height} px (ratio {actual_ratio:.2f}:1). "
                   f"{clean_art_type.capitalize()}s must have a {spec['aspect']} aspect ratio (~{target_w}x{target_h} px)."
        )

    return {
        "art_type": clean_art_type,
        "width": width,
        "height": height,
        "size_bytes": len(file_bytes),
        "size_kb": round(size_kb, 1),
        "format": image.format
    }
