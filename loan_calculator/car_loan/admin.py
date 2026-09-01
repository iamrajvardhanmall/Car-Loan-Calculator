from django.contrib import admin
from .models import ContactQuery, LoanCalculation, SavedCalculation, LoanComparison, EarlyPayoff, MonthlyBudget

@admin.register(ContactQuery)
class ContactQueryAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'message')
    readonly_fields = ('created_at',)

@admin.register(LoanCalculation)
class LoanCalculationAdmin(admin.ModelAdmin):
    list_display = ('user', 'vehicle_price', 'loan_term', 'interest_rate', 'monthly_payment', 'calculation_date')
    list_filter = ('calculation_date', 'loan_term')
    search_fields = ('user__username',)

@admin.register(SavedCalculation)
class SavedCalculationAdmin(admin.ModelAdmin):
    list_display = ('user', 'vehicle_price', 'loan_term', 'interest_rate', 'monthly_payment', 'created_at')
    list_filter = ('created_at', 'loan_term')
    search_fields = ('user__username',)

@admin.register(LoanComparison)
class LoanComparisonAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'vehicle_price', 'monthly_payment', 'total_cost', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'name')

@admin.register(EarlyPayoff)
class EarlyPayoffAdmin(admin.ModelAdmin):
    list_display = ('user', 'loan_calculation', 'extra_payment', 'payment_frequency', 'months_saved', 'interest_saved')
    list_filter = ('payment_frequency', 'created_at')
    search_fields = ('user__username',)

@admin.register(MonthlyBudget)
class MonthlyBudgetAdmin(admin.ModelAdmin):
    list_display = ('user', 'monthly_income', 'debt_to_income_ratio', 'budget_status', 'created_at')
    list_filter = ('budget_status', 'created_at')
    search_fields = ('user__username',)


