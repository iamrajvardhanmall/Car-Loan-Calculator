from django.contrib import admin
from .models import ContactQuery, LoanCalculation, SavedCalculation, LoanComparison, EarlyPayoff, MonthlyBudget

@admin.register(ContactQuery)
class ContactQueryAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'message')
    readonly_fields = ('created_at',)

admin.site.register(LoanCalculation)
admin.site.register(SavedCalculation)
admin.site.register(LoanComparison)
admin.site.register(EarlyPayoff)
admin.site.register(MonthlyBudget)

