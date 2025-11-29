from twilio.rest import Client
import os

ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
FROM = os.environ.get("TWILIO_FROM_NUMBER")

client = Client(ACCOUNT_SID, AUTH_TOKEN)

def send_sms(to_number, message):
    message = client.messages.create(
        body=message,
        from_=FROM,
        to=to_number,
    )
    return message.sid

def make_call(to_number, voice_url):
    call = client.calls.create(
        url=voice_url,
        to=to_number,
        from_=FROM,
    )
    return call.sid
