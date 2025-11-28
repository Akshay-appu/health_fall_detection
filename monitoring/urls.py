from django.urls import path
from . import views
app_name = 'monitoring'
urlpatterns = [
    path('', views.mobile_home, name='mobile_home'),
    path('contacts/', views.contacts_page, name='contacts'),
    path('settings/', views.settings_page, name='settings'),
    path('history/', views.history_page, name='history'),
    path('dashboard/', views.dashboard_page, name='dashboard'),
    path('api/events/', views.api_events, name='api_events'),
    path('api/events/<int:event_id>/', views.api_event_detail, name='api_event_detail'),
    path('api/contacts/', views.api_contacts, name='api_contacts'),
]
