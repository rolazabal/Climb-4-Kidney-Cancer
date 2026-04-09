import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
SES_FROM_EMAIL = os.getenv("SES_FROM_EMAIL")

ses = boto3.client("sesv2", region_name=AWS_REGION)

def send_verification_email(to_email: str, code: str) -> None:
    ses.send_email(
        FromEmailAddress=SES_FROM_EMAIL,
        Destination={
            "ToAddresses": [to_email]
        },
        Content={
            "Simple": {
                "Subject": {
                    "Data": "Your verification code",
                    "Charset": "UTF-8"
                },
                "Body": {
                    "Text": {
                        "Data": f"Your verification code is {code}. It expires in 10 minutes.",
                        "Charset": "UTF-8"
                    },
                    "Html": {
                        "Data": f"""
                        <html>
                          <body>
                            <h2>Email Verification</h2>
                            <p>Your verification code is:</p>
                            <p style="font-size:24px; font-weight:bold;">{code}</p>
                            <p>This code expires in 10 minutes.</p>
                          </body>
                        </html>
                        """,
                        "Charset": "UTF-8"
                    }
                }
            }
        }
    )