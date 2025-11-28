from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    def __str__(self):
        return self.name or (self.user.username if self.user else 'Anonymous')

class EmergencyContact(models.Model):
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    def __str__(self):
        return f"{self.name} ({self.phone})"

class Event(models.Model):
    EVENT_TYPES = [('fall','Fall'),('spike','Spike'),('inactivity','Inactivity')]
    STATUS = [('new','New'),('ack','Acknowledged')]
    user_profile = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    timestamp = models.DateTimeField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default='new')
    is_simulated = models.BooleanField(default=False)
    raw_data = models.JSONField(blank=True, null=True)
    def __str__(self):
        return f"{self.event_type} at {self.timestamp}"
