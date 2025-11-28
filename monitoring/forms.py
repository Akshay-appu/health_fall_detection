from django import forms
from .models import EmergencyContact
class EmergencyContactForm(forms.ModelForm):
    class Meta:
        model = EmergencyContact
        fields = ['name', 'phone', 'email', 'user_profile']
