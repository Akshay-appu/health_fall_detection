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

def make_call(to_number, voice_url="http://demo.twilio.com/docs/voice.xml"):
    call = client.calls.create(
        url=voice_url,
        to=to_number,
        from_=FROM,
    )
    return call.sid

from twilio.rest import Client
import os

ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
FROM = os.environ.get("TWILIO_FROM_NUMBER")

client = Client(ACCOUNT_SID, AUTH_TOKEN)


def send_sms(to_number, message):
    """
    Send an SMS using Twilio.
    """
    msg = client.messages.create(
        body=message,
        from_=FROM,
        to=to_number,
    )
    return msg.sid


def make_call(to_number, voice_url="http://demo.twilio.com/docs/voice.xml"):
    """
    Start a voice call using Twilio.
    `voice_url` is a URL that returns TwiML describing what to say.
    """
    call = client.calls.create(
        url=voice_url,
        to=to_number,
        from_=FROM,
    )
    return call.sid
