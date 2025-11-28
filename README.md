# Real-Time Emergency Health — Fall Detection (Django + JS)

Overview and setup instructions are included in the earlier assistant message. Run migrations and 'python manage.py runserver' to start.


# Deploy notes
During deployment make sure the build command runs:

```
pip install -r requirements.txt && python manage.py collectstatic --noinput
```

Set environment variable `DJANGO_SECRET_KEY` on the host (Render).
