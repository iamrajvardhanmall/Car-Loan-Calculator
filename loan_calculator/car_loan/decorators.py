# car_loan/decorators.py
from functools import wraps
from django.http import HttpResponseRedirect
from django.urls import reverse

def login_optional(view_func):
    """
    Custom decorator that allows both authenticated and anonymous access
    but provides additional functionality for authenticated users
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if request.user.is_authenticated:
            # Add any authenticated-user-specific logic here
            pass
        return view_func(request, *args, **kwargs)
    return _wrapped_view