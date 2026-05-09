#!/usr/bin/env python3
"""
notify_failure.py — Email alert when an automated workflow fails or times out.

Required environment variables:
  BREVO_SMTP_KEY   Brevo SMTP key
  WORKFLOW_NAME    GitHub Actions workflow name (${{ github.workflow }})
  RUN_URL          Full URL to the failed run
  NOTIFY_EMAIL_TO  Recipient address (default: ravenshroud@gmail.com)
"""

import html
import os
import smtplib
import sys
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


SMTP_HOST  = "smtp-relay.brevo.com"
SMTP_PORT  = 587
SMTP_USER  = "a78a3c001@smtp-brevo.com"
FROM_NAME  = "AESOP AI Academy"
FROM_ADDR  = "noreply@aesopacademy.org"


def _h(value: str) -> str:
    return html.escape(str(value or ""), quote=True)


def build_html(workflow: str, run_url: str, timestamp: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
             background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background:#fff;
              border-radius:12px;overflow:hidden;
              box-shadow:0 1px 3px rgba(0,0,0,.1);">

    <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);
                padding:28px 36px;color:#fff;">
      <div style="font-size:28px;margin-bottom:4px;">⚠️</div>
      <h1 style="margin:0;font-size:20px;font-weight:700;">
        Workflow Failed: {_h(workflow)}
      </h1>
      <p style="margin:8px 0 0;opacity:.85;font-size:13px;">{_h(timestamp)}</p>
    </div>

    <div style="padding:28px 36px;">
      <p style="margin:0 0 16px;color:#334155;font-size:14px;">
        The automated workflow <strong>{_h(workflow)}</strong> failed or timed out
        without producing a result. This usually means an API call hung or the
        job exceeded the 15-minute limit.
      </p>
      <a href="{_h(run_url)}"
         style="display:inline-block;background:#6366f1;color:#fff;
                padding:10px 20px;border-radius:8px;text-decoration:none;
                font-size:14px;font-weight:600;">
        View Run Logs →
      </a>
    </div>

    <div style="background:#fef2f2;border-left:4px solid #dc2626;
                margin:0 36px 28px;padding:14px 16px;border-radius:4px;
                font-size:13px;color:#7f1d1d;">
      <strong>Action required:</strong> Check the run logs for the failed step.
      If an Anthropic API call timed out, the job will auto-retry on its next
      scheduled run. For urgent issues, trigger the workflow manually after
      the API recovers.
    </div>

    <div style="background:#f1f5f9;padding:16px 36px;
                font-size:12px;color:#94a3b8;text-align:center;">
      AESOP AI Academy · Automation monitor · aesopacademy.org
    </div>
  </div>
</body>
</html>"""


def send_email(workflow: str, run_url: str) -> None:
    smtp_key = os.environ.get("BREVO_SMTP_KEY")
    to_addr  = os.environ.get("NOTIFY_EMAIL_TO", "ravenshroud@gmail.com")

    if not smtp_key:
        print("BREVO_SMTP_KEY not set — skipping failure notification.")
        sys.exit(0)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    subject   = f"[AESOP] Workflow failed: {workflow}"
    html_body = build_html(workflow, run_url, timestamp)
    text_body = (
        f"AESOP AI Academy — Workflow failure alert\n\n"
        f"Workflow:  {workflow}\n"
        f"Time:      {timestamp}\n"
        f"Run logs:  {run_url}\n\n"
        "An automated workflow failed or timed out. Check the run logs above.\n"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{FROM_ADDR}>"
    msg["To"]      = to_addr
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, smtp_key)
        server.sendmail(FROM_ADDR, to_addr, msg.as_string())

    print(f"  Failure notification sent to {to_addr}")


def main() -> None:
    workflow = os.environ.get("WORKFLOW_NAME", "Unknown workflow")
    run_url  = os.environ.get("RUN_URL", "https://github.com")
    send_email(workflow, run_url)


if __name__ == "__main__":
    main()
