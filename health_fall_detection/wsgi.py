import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_fall_detection.settings')
application = get_wsgi_application()
