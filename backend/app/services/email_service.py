"""
email_service.py
Async SMTP email service for CCID contact form notifications.
Credentials are loaded server-side from environment variables only.
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_html_body(data: dict) -> str:
    """Build a rich HTML email body for the contact notification."""
    submitted_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    ip = data.get("ip_address", "unknown")
    user_agent = data.get("user_agent", "unknown")

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Submission — CCID</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#1a1d2e;border-radius:12px;overflow:hidden;border:1px solid #2a2d3e;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;letter-spacing:3px;
                                color:rgba(255,255,255,0.7);text-transform:uppercase;
                                margin-bottom:6px;">CCID Platform</div>
                    <div style="font-size:22px;font-weight:700;color:#fff;">
                      📬 New Contact Submission
                    </div>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.15);border-radius:50%;
                                width:52px;height:52px;display:inline-flex;
                                align-items:center;justify-content:center;
                                font-size:24px;line-height:52px;text-align:center;">
                      ✉️
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <!-- Fields -->
              <table width="100%" cellpadding="0" cellspacing="0">

                <tr>
                  <td style="padding-bottom:20px;">
                    <div style="font-size:11px;font-weight:600;letter-spacing:2px;
                                color:#6366f1;text-transform:uppercase;margin-bottom:6px;">
                      From
                    </div>
                    <div style="font-size:16px;font-weight:600;color:#e2e8f0;">
                      {data['name']}
                    </div>
                    <div style="font-size:14px;color:#94a3b8;margin-top:2px;">
                      <a href="mailto:{data['email']}"
                         style="color:#818cf8;text-decoration:none;">{data['email']}</a>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:20px;border-top:1px solid #2a2d3e;padding-top:20px;">
                    <div style="font-size:11px;font-weight:600;letter-spacing:2px;
                                color:#6366f1;text-transform:uppercase;margin-bottom:6px;">
                      Subject
                    </div>
                    <div style="font-size:15px;font-weight:500;color:#e2e8f0;">
                      {data['subject']}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:24px;border-top:1px solid #2a2d3e;padding-top:20px;">
                    <div style="font-size:11px;font-weight:600;letter-spacing:2px;
                                color:#6366f1;text-transform:uppercase;margin-bottom:10px;">
                      Message
                    </div>
                    <div style="background:#0f1117;border-radius:8px;padding:20px;
                                border-left:3px solid #6366f1;
                                font-size:14px;line-height:1.7;color:#cbd5e1;
                                white-space:pre-wrap;">
{data['message']}
                    </div>
                  </td>
                </tr>

              </table>

              <!-- Meta info -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#0f1117;border-radius:8px;padding:16px;
                       border:1px solid #2a2d3e;margin-top:4px;">
                <tr>
                  <td style="font-size:11px;color:#64748b;line-height:1.8;">
                    <strong style="color:#475569;">Submitted at:</strong>&nbsp;{submitted_at}<br/>
                    <strong style="color:#475569;">IP Address:</strong>&nbsp;{ip}<br/>
                    <strong style="color:#475569;">User Agent:</strong>&nbsp;{user_agent}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#12151f;padding:20px 32px;border-top:1px solid #2a2d3e;
                       text-align:center;">
              <div style="font-size:11px;color:#475569;">
                This email was generated automatically by the
                <strong style="color:#6366f1;">CCID Investigation Platform</strong>.
                Do not reply directly to this message.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _build_plain_text(data: dict) -> str:
    """Fallback plain-text version of the notification email."""
    submitted_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    return (
        f"New Contact Form Submission — CCID Platform\n"
        f"{'=' * 50}\n\n"
        f"From   : {data['name']} <{data['email']}>\n"
        f"Subject: {data['subject']}\n\n"
        f"Message:\n{data['message']}\n\n"
        f"{'─' * 50}\n"
        f"Submitted at : {submitted_at}\n"
        f"IP Address   : {data.get('ip_address', 'unknown')}\n"
        f"User Agent   : {data.get('user_agent', 'unknown')}\n"
    )


async def send_contact_notification(submission_data: dict) -> bool:
    """
    Send an HTML notification email to the configured NOTIFY_EMAIL address.

    Args:
        submission_data: dict with keys name, email, subject, message,
                         ip_address (optional), user_agent (optional).

    Returns:
        True on success, False on failure (non-fatal — submission is still saved).
    """
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning(
            "Email notification skipped: SMTP_USER / SMTP_PASSWORD not configured. "
            "Set these in backend/.env to enable email alerts."
        )
        return False

    notify_to = settings.notify_email or settings.smtp_user
    subject = (
        f"[CCID] New submission from {submission_data['name']} "
        f"— {submission_data['subject']}"
    )

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = notify_to
    msg["Reply-To"] = submission_data["email"]

    msg.attach(MIMEText(_build_plain_text(submission_data), "plain", "utf-8"))
    msg.attach(MIMEText(_build_html_body(submission_data), "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info(
            f"Contact notification email sent to {notify_to} "
            f"for submission from {submission_data['email']}"
        )
        return True
    except Exception as exc:
        logger.error(f"Failed to send contact notification email: {exc}")
        return False
