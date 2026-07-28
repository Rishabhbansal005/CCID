"""
contact_submissions.py
Handles the public contact/support form:
  POST /api/v1/contact  — validate, store in Supabase, send email notification.

Security:
  - Rate limited to 5 requests/minute per IP (slowapi)
  - All validation is server-side (Pydantic)
  - No auth required (public endpoint)
  - Email credentials never exposed to the client
"""

import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.config import settings
from app.core.supabase_client import get_supabase_admin
from app.services.email_service import send_contact_notification
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

# Per-router limiter (shares state with the app-level limiter via same key func)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/contact", tags=["Contact"])


# ─── Pydantic schemas ───────────────────────────────────────────────────────

class ContactSubmissionRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80, description="Full name")
    email: EmailStr = Field(..., description="Sender's email address")
    subject: str = Field(..., min_length=2, max_length=120, description="Subject line")
    message: str = Field(..., min_length=10, max_length=2000, description="Message body")

    @field_validator("name", "subject", "message", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("name")
    @classmethod
    def no_script_tags(cls, v: str) -> str:
        """Basic XSS guard — reject angle brackets in the name field."""
        if "<" in v or ">" in v:
            raise ValueError("Name must not contain HTML tags")
        return v


class ContactSubmissionResponse(BaseModel):
    success: bool
    message: str
    submission_id: Optional[str] = None


# ─── Endpoint ───────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ContactSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact/support form",
    description=(
        "Public endpoint — no authentication required. "
        "Validates all fields, persists the submission to the database, "
        "and sends an instant email notification to the site owner. "
        "Rate limited to 5 requests per minute per IP address."
    ),
)
@limiter.limit(settings.rate_limit_contact)
async def submit_contact_form(
    request: Request,
    body: ContactSubmissionRequest,
) -> ContactSubmissionResponse:
    """
    1. Validate input (Pydantic).
    2. Insert into Supabase `contact_submissions` table.
    3. Fire async email notification to the configured NOTIFY_EMAIL.
    4. Return success response to the user.
    """
    # Collect request metadata for the email notification
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")[:500]

    submission_data = {
        "name": body.name,
        "email": str(body.email),
        "subject": body.subject,
        "message": body.message,
        "ip_address": client_ip,
        "user_agent": user_agent,
    }

    # ── 1. Save to Supabase ─────────────────────────────────────────────────
    submission_id: Optional[str] = None
    try:
        db = get_supabase_admin()
        result = (
            db.table("contact_submissions")
            .insert(submission_data)
            .execute()
        )
        if result.data:
            submission_id = result.data[0].get("id")
            logger.info(
                f"Contact submission saved [id={submission_id}] "
                f"from {body.email} / IP={client_ip}"
            )
        else:
            logger.warning("Contact submission insert returned no data.")
    except Exception as exc:
        logger.error(f"Database error saving contact submission: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save your submission. Please try again later.",
        )

    # ── 2. Send email notification (non-blocking — failure doesn't fail the request) ──
    try:
        await send_contact_notification(submission_data)
    except Exception as exc:
        # Email failure is logged but never surfaces to the user
        logger.error(f"Email notification error (non-fatal): {exc}")

    # ── 3. Respond ─────────────────────────────────────────────────────────
    return ContactSubmissionResponse(
        success=True,
        message=(
            "Thank you for reaching out! Your message has been received "
            "and we'll get back to you as soon as possible."
        ),
        submission_id=submission_id,
    )
