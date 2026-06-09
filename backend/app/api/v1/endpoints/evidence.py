import hashlib
import mimetypes
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from app.core.security import get_current_user, require_investigator, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.core.config import settings
from app.models.schemas import EvidenceResponse, EvidenceUpdate, MessageResponse
import logging

router = APIRouter(prefix="/evidence", tags=["Evidence"])
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024  # Convert to bytes


@router.post("/upload", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: str = Form(...),
    evidence_type: str = Form("digital"),
    source_device: Optional[str] = Form(None),
    source_location: Optional[str] = Form(None),
    acquisition_method: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # comma-separated
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_investigator),
):
    """Upload evidence file to Supabase Storage."""
    try:
        # Validate file size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB"
            )

        db = get_supabase_admin()

        # Verify case exists and user has access
        case_result = db.table("cases").select("id, created_by, assigned_to").eq("id", case_id).single().execute()
        if not case_result.data:
            raise HTTPException(status_code=404, detail="Case not found")

        case = case_result.data
        if current_user.role != "admin" and \
           case.get("created_by") != current_user.id and \
           case.get("assigned_to") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this case")

        # Compute hashes
        md5 = hashlib.md5(content).hexdigest()
        sha256 = hashlib.sha256(content).hexdigest()
        sha512 = hashlib.sha512(content).hexdigest()

        # Determine storage path
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = file.filename.replace(" ", "_")
        storage_path = f"cases/{case_id}/evidence/{timestamp}_{safe_filename}"

        # Upload to Supabase Storage
        mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        storage_result = db.storage.from_(settings.storage_bucket).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": mime_type},
        )

        # Get public URL (signed for private bucket)
        url_result = db.storage.from_(settings.storage_bucket).create_signed_url(
            path=storage_path,
            expires_in=3600  # 1 hour
        )
        public_url = url_result.get("signedURL") if url_result else None

        # Parse tags
        tag_list = [t.strip() for t in tags.split(",")] if tags else []

        # Chain of custody initial entry
        chain_entry = {
            "action": "acquired",
            "user_id": current_user.id,
            "user_name": current_user.full_name or current_user.email,
            "timestamp": datetime.utcnow().isoformat(),
            "notes": "Initial upload",
        }

        # Save evidence record
        evidence_payload = {
            "case_id": case_id,
            "file_name": safe_filename,
            "original_file_name": file.filename,
            "file_type": file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "unknown",
            "mime_type": mime_type,
            "file_size": len(content),
            "storage_path": storage_path,
            "storage_bucket": settings.storage_bucket,
            "public_url": public_url,
            "hash_md5": md5,
            "hash_sha256": sha256,
            "hash_sha512": sha512,
            "evidence_type": evidence_type,
            "source_device": source_device,
            "source_location": source_location,
            "acquisition_method": acquisition_method,
            "chain_of_custody": [chain_entry],
            "tags": tag_list,
            "uploaded_by": current_user.id,
            "processing_status": "pending",
        }

        result = db.table("evidence").insert(evidence_payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save evidence record")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evidence upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/case/{case_id}", response_model=list[EvidenceResponse])
async def list_evidence_for_case(
    case_id: str,
    evidence_type: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all evidence for a case."""
    try:
        db = get_supabase_admin()
        query = db.table("evidence").select("*").eq("case_id", case_id)

        if evidence_type:
            query = query.eq("evidence_type", evidence_type)

        result = query.order("uploaded_at", desc=True).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Error listing evidence for case {case_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(
    evidence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get evidence by ID."""
    try:
        db = get_supabase_admin()
        result = db.table("evidence").select("*").eq("id", evidence_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Evidence not found")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{evidence_id}", response_model=EvidenceResponse)
async def update_evidence(
    evidence_id: str,
    update_data: EvidenceUpdate,
    current_user: CurrentUser = Depends(require_investigator),
):
    """Update evidence metadata."""
    try:
        db = get_supabase_admin()
        payload = update_data.model_dump(exclude_none=True)
        result = db.table("evidence").update(payload).eq("id", evidence_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Evidence not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{evidence_id}/custody", response_model=EvidenceResponse)
async def add_custody_event(
    evidence_id: str,
    action: str = Form(...),
    notes: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    current_user: CurrentUser = Depends(require_investigator),
):
    """Add a chain of custody event to evidence."""
    try:
        db = get_supabase_admin()
        ev = db.table("evidence").select("chain_of_custody").eq("id", evidence_id).single().execute()
        if not ev.data:
            raise HTTPException(status_code=404, detail="Evidence not found")

        custody_chain = ev.data.get("chain_of_custody", [])
        new_event = {
            "action": action,
            "user_id": current_user.id,
            "user_name": current_user.full_name or current_user.email,
            "timestamp": datetime.utcnow().isoformat(),
            "notes": notes,
            "location": location,
        }
        custody_chain.append(new_event)

        result = db.table("evidence").update({"chain_of_custody": custody_chain}).eq("id", evidence_id).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{evidence_id}", response_model=MessageResponse)
async def delete_evidence(
    evidence_id: str,
    current_user: CurrentUser = Depends(require_investigator),
):
    """Delete evidence (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        db = get_supabase_admin()
        ev = db.table("evidence").select("storage_path, storage_bucket").eq("id", evidence_id).single().execute()
        if ev.data:
            # Delete from storage
            db.storage.from_(ev.data["storage_bucket"]).remove([ev.data["storage_path"]])

        db.table("evidence").delete().eq("id", evidence_id).execute()
        return MessageResponse(message="Evidence deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{evidence_id}/signed-url")
async def get_signed_url(
    evidence_id: str,
    expires_in: int = Query(3600, ge=60, le=86400),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a temporary signed URL to download evidence."""
    try:
        db = get_supabase_admin()
        ev = db.table("evidence").select("storage_path, storage_bucket").eq("id", evidence_id).single().execute()
        if not ev.data:
            raise HTTPException(status_code=404, detail="Evidence not found")

        url = db.storage.from_(ev.data["storage_bucket"]).create_signed_url(
            path=ev.data["storage_path"],
            expires_in=expires_in,
        )
        return {"signed_url": url.get("signedURL"), "expires_in": expires_in}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
