from social_core.backends.google import GoogleOAuth2


class FixedGoogleOAuth2(GoogleOAuth2):
    """Always use SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI when set."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        forced = self.setting("REDIRECT_URI")
        if forced:
            self.redirect_uri = forced
