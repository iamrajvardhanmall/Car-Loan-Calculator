from django.conf import settings
from social_core.backends.google import GoogleOAuth2
import os


class FixedGoogleOAuth2(GoogleOAuth2):
    """Always use SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI and ensure client_id is loaded."""

    def get_key_and_secret(self):
        key = getattr(settings, 'SOCIAL_AUTH_GOOGLE_OAUTH2_KEY', None) or os.getenv('SOCIAL_AUTH_GOOGLE_OAUTH2_KEY', '')
        secret = getattr(settings, 'SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET', None) or os.getenv('SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET', '')
        if key and secret:
            return key, secret
        return super().get_key_and_secret()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        forced = self.setting("REDIRECT_URI")
        if forced:
            self.redirect_uri = forced

