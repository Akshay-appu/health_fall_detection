import json
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from .models import Event, EmergencyContact, UserProfile
import os
from .twilio_client import send_sms, make_call

def send_alerts_for_event(event):
    """
    Send SMS (and optional call) with GPS location to ALL emergency contacts
    that have a phone number.
    """
    contacts = EmergencyContact.objects.exclude(phone__isnull=True).exclude(phone__exact='')
    if not contacts.exists():
        print("No emergency contacts with phone numbers; skipping alerts.")
        return

    # Build location text
    if event.latitude is not None and event.longitude is not None:
        maps_url = f"https://www.google.com/maps?q={event.latitude},{event.longitude}"
        location_text = f"Location: {maps_url}"
    else:
        location_text = "Location not available."

    # SMS body
    body = (
        f"EMERGENCY ALERT: Possible {event.event_type} detected.\n"
        f"Time: {event.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"{location_text}"
    )

    # Optional voice URL (only if you later add TWILIO_VOICE_URL env var)
    voice_url = os.environ.get("TWILIO_VOICE_URL")

    for c in contacts:
        try:
            send_sms(c.phone, body)
        except Exception as e:
            print(f"Failed to send SMS to {c.phone}: {e}")

        if voice_url:
            try:
                make_call(c.phone, voice_url)
            except Exception as e:
                print(f"Failed to start call to {c.phone}: {e}")

# ---------- UI Pages ----------

def mobile_home(request):
    return render(request, 'monitoring/mobile_home.html')

def contacts_page(request):
    return render(request, 'monitoring/contacts.html')

def settings_page(request):
    return render(request, 'monitoring/settings.html')

def history_page(request):
    return render(request, 'monitoring/history.html')

def dashboard_page(request):
    return render(request, 'monitoring/dashboard.html')


# ---------- API Endpoints ----------

@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_events(request):
    if request.method == "GET":
        # existing history list
        qs = Event.objects.order_by("-timestamp")
        events = [
            {
                "id": e.id,
                "event_type": e.event_type,
                "timestamp": e.timestamp.isoformat(),
                "latitude": e.latitude,
                "longitude": e.longitude,
                "status": e.status,
                "is_simulated": e.is_simulated,
            }
            for e in qs[:1000]
        ]
        return JsonResponse({"events": events})

    # POST: called from anomaly.js when countdown finishes
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("Invalid JSON")

    # parse timestamp
    ts_str = data.get("timestamp")
    if ts_str:
        ts = parse_datetime(ts_str)
        if ts is None:
            ts = timezone.now()
    else:
        ts = timezone.now()

    # parse location from payload
    loc = data.get("location") or {}
    lat = loc.get("lat")
    lng = loc.get("lng")

    event_type = data.get("eventType", "fall")
    simulated = data.get("simulated", False)
    raw = data.get("raw", {})

    # create Event record (user_profile left as None)
    event = Event.objects.create(
        user_profile=None,
        event_type=event_type,
        timestamp=ts,
        latitude=lat,
        longitude=lng,
        is_simulated=simulated,
        raw_data=raw,
    )

    # 🔔 send SMS / calls to all contacts
    send_alerts_for_event(event)

    return JsonResponse({"status": "ok"})
@csrf_exempt
@require_http_methods(["GET", "DELETE"])
def api_event_detail(request, event_id):
    """
    Simple detail endpoint for a single Event.
    Used by /api/events/<event_id>/ in monitoring/urls.py
    """
    event = get_object_or_404(Event, id=event_id)

    if request.method == "GET":
        return JsonResponse({
            "id": event.id,
            "event_type": event.event_type,
            "timestamp": event.timestamp.isoformat(),
            "latitude": event.latitude,
            "longitude": event.longitude,
            "status": event.status,
            "is_simulated": event.is_simulated,
        })

    # DELETE
    event.delete()
    return JsonResponse({"status": "deleted"})
