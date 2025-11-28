from django.contrib import admin
from .models import UserProfile, EmergencyContact, Event
admin.site.register(UserProfile)
admin.site.register(EmergencyContact)
admin.site.register(Event)
