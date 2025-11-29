import os
from twilio.rest import Client

account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
from_number = os.environ.get("TWILIO_FROM_NUMBER")

client = Client(account_sid, auth_token)

def send_sms(to_number, message):
    try:
        client.messages.create(
            body=message,
            from_=from_number,
            to=to_number
        )
        print("SMS sent to", to_number)
    except Exception as e:
        print("SMS FAILED:", e)

def make_call(to_number, message_url):
    try:
        client.calls.create(
            url=message_url,
            from_=from_number,
            to=to_number
        )
        print("CALL started to", to_number)
    except Exception as e:
        print("CALL FAILED:", e)
