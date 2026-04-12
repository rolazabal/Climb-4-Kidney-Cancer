import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@summitstepsapp.com")

def send_verification_email(to_email: str, code: str) -> None:
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": "Your verification code",
        "text": f"Your verification code is {code}. It expires in 10 minutes.",
        "html": f"""
        <html>
          <body>
            <h2>Email Verification</h2>
            <p>Your verification code is:</p>
            <p style="font-size:24px; font-weight:bold;">{code}</p>
            <p>This code expires in 10 minutes.</p>
          </body>
        </html>
        """
    })