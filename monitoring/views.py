import json
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from .models import Event, EmergencyContact, UserProfile


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
@require_http_methods(['GET', 'POST'])
def api_events(request):
    # Return event list
    if request.method == 'GET':
        qs = Event.objects.all().order_by('-timestamp')
        events = [{
            'id': e.id,
            'event_type': e.event_type,
            'timestamp': e.timestamp.isoformat(),
            'lat': e.latitude,
            'lng': e.longitude,
            'status': e.status,
            'is_simulated': e.is_simulated,
            'user_profile': e.user_profile.id if e.user_profile else None,
        } for e in qs[:1000]]
        
        return JsonResponse({'events': events})

    # Create new event (POST)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')

    event_type = data.get('eventType')
    timestamp = parse_datetime(data.get('timestamp')) or timezone.now()
    location = data.get('location', {})
    user_profile = UserProfile.objects.filter(id=data.get('userId')).first()

    if event_type not in dict(Event.EVENT_TYPES):
        return HttpResponseBadRequest('Invalid eventType')

    ev = Event.objects.create(
        user_profile=user_profile,
        event_type=event_type,
        timestamp=timestamp,
        latitude=location.get('lat'),
        longitude=location.get('lng'),
        is_simulated=bool(data.get('simulated', False)),
        raw_data=data.get('raw', {})
    )

    print(f"[ALERT] New event created: {ev.event_type} at {ev.timestamp}")

    return JsonResponse({'status': 'ok', 'id': ev.id}, status=201)


@csrf_exempt
@require_http_methods(['GET'])
def api_event_detail(request, event_id):
    e = get_object_or_404(Event, id=event_id)
    return JsonResponse({
        'id': e.id,
        'event_type': e.event_type,
        'timestamp': e.timestamp.isoformat(),
        'lat': e.latitude,
        'lng': e.longitude,
        'status': e.status,
        'is_simulated': e.is_simulated,
        'raw': e.raw_data
    })


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def api_contacts(request):
    # Get contacts list
    if request.method == 'GET':
        contacts = [{
            'id': c.id,
            'name': c.name,
            'phone': c.phone,
            'email': c.email,
            'user_profile': c.user_profile.id if c.user_profile else None
        } for c in EmergencyContact.objects.all()]

        return JsonResponse({'contacts': contacts})

    # Create a new contact
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')

    if not data.get('name'):
        return HttpResponseBadRequest('Missing name')

    user_profile = UserProfile.objects.filter(id=data.get('user_profile')).first()

    c = EmergencyContact.objects.create(
        name=data.get('name'),
        phone=data.get('phone', ''),
        email=data.get('email', ''),
        user_profile=user_profile
    )

    return JsonResponse({'status': 'ok', 'id': c.id}, status=201)
