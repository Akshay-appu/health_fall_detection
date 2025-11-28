import json
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils.dateparse import parse_datetime
from .models import Event, EmergencyContact, UserProfile
from django.views.decorators.http import require_http_methods
from django.utils import timezone

def mobile_home(request):
    return render(request, 'monitoring/mobile_home.html')

def contacts_page(request):
    return render(request, 'monitoring/contacts.html')

def settings_page(request):
    return render(request, 'monitoring/settings.html')

def history_page(request):
    return render(request, 'monitoring/history.html')

@login_required
def dashboard_page(request):
    return render(request, 'monitoring/dashboard.html')

@csrf_exempt
@require_http_methods(['GET','POST'])
def api_events(request):
    if request.method == 'GET':
        qs = Event.objects.all().order_by('-timestamp')
        events = []
        for e in qs[:1000]:
            events.append({
                'id': e.id,
                'event_type': e.event_type,
                'timestamp': e.timestamp.isoformat(),
                'lat': e.latitude,
                'lng': e.longitude,
                'status': e.status,
                'is_simulated': e.is_simulated,
                'user_profile': e.user_profile.id if e.user_profile else None,
            })
        return JsonResponse({'events': events})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('Invalid JSON')

    userId = data.get('userId')
    eventType = data.get('eventType')
    timestamp = data.get('timestamp')
    location = data.get('location', {})
    simulated = data.get('simulated', False)
    raw = data.get('raw', {})

    if eventType not in dict(Event.EVENT_TYPES):
        return HttpResponseBadRequest('Invalid eventType')

    dt = parse_datetime(timestamp) if timestamp else None
    if dt is None:
        dt = timezone.now()

    lat = location.get('lat')
    lng = location.get('lng')

    user_profile = None
    if userId:
        user_profile = UserProfile.objects.filter(id=userId).first()

    ev = Event.objects.create(
        user_profile=user_profile,
        event_type=eventType,
        timestamp=dt,
        latitude=lat,
        longitude=lng,
        is_simulated=bool(simulated),
        raw_data=raw
    )

    print(f"[ALERT] New event {ev.event_type} at {ev.timestamp} (simulated={ev.is_simulated}) - send SMS/email here")

    return JsonResponse({'status': 'ok', 'id': ev.id}, status=201)

@csrf_exempt
@require_http_methods(['GET'])
def api_event_detail(request, event_id):
    e = get_object_or_404(Event, id=event_id)
    resp = {
        'id': e.id,
        'event_type': e.event_type,
        'timestamp': e.timestamp.isoformat(),
        'lat': e.latitude,
        'lng': e.longitude,
        'status': e.status,
        'is_simulated': e.is_simulated,
        'raw': e.raw_data
    }
    return JsonResponse(resp)

@csrf_exempt
@require_http_methods(['GET','POST'])
def api_contacts(request):
    if request.method == 'GET':
        contacts = []
        for c in EmergencyContact.objects.all():
            contacts.append({
                'id': c.id,
                'name': c.name,
                'phone': c.phone,
                'email': c.email,
                'user_profile': c.user_profile.id if c.user_profile else None
            })
        return JsonResponse({'contacts': contacts})

    try:
        data = json.loads(request.body)
    except:
        return HttpResponseBadRequest('Invalid JSON')

    name = data.get('name')
    phone = data.get('phone', '')
    email = data.get('email', '')
    user_profile_id = data.get('user_profile')

    if not name:
        return HttpResponseBadRequest('Missing name')

    user_profile = None
    if user_profile_id:
        user_profile = UserProfile.objects.filter(id=user_profile_id).first()

    c = EmergencyContact.objects.create(
        name=name,
        phone=phone,
        email=email,
        user_profile=user_profile
    )
    return JsonResponse({'status': 'ok', 'id': c.id}, status=201)
