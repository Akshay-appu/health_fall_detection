from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'monitoring'

    def ready(self):
        # Auto-run migrations on startup (quick fix for Render)
        from django.core.management import call_command
        try:
            call_command('migrate', interactive=False)
        except Exception:
            # If migrate fails for some reason, don't crash the app
            pass
