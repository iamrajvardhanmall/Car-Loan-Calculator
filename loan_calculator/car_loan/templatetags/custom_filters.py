from django import template

register = template.Library()
# print("Custom file is running")
@register.filter
def div(value, arg):
    try:
        return float(value) / float(arg)
    except (ValueError, ZeroDivisionError):
        return None

@register.filter
def mul(value, arg):
    try:
        # Handle None values by treating them as 0
        value = float(value) if value is not None else 0
        arg = float(arg) if arg is not None else 0
        return value * arg
    except (ValueError, TypeError):
        # Return 0 if conversion fails
        return 0
