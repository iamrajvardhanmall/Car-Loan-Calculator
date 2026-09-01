# car_loan/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import math

class LoanCalculation(models.Model):
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='loan_calculations'
    )
    vehicle_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    down_payment = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    loan_term = models.IntegerField(
        help_text="Loan term in months",
        validators=[MinValueValidator(1)]
    )
    interest_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    monthly_payment = models.DecimalField(max_digits=10, decimal_places=2)
    total_interest = models.DecimalField(max_digits=10, decimal_places=2)
    total_payment = models.DecimalField(max_digits=10, decimal_places=2)
    calculation_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-calculation_date']
        verbose_name = "Loan Calculation"
        verbose_name_plural = "Loan Calculations"

class LoanComparison(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    vehicle_price = models.DecimalField(max_digits=12, decimal_places=2)
    down_payment = models.DecimalField(max_digits=12, decimal_places=2)
    loan_term = models.IntegerField()
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    monthly_payment = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class EarlyPayoff(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    loan_calculation = models.ForeignKey(LoanCalculation, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    extra_payment = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('yearly', 'Yearly'),
            ('one_time', 'One Time')
        ],
        default='monthly'
    )
    start_month = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Month to start extra payments (1-based)"
    )
    months_saved = models.IntegerField(default=0)
    interest_saved = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Early Payoff"
        verbose_name_plural = "Early Payoffs"

class MonthlyBudget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    monthly_income = models.DecimalField(max_digits=10, decimal_places=2)
    existing_debts = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    monthly_expenses = models.DecimalField(max_digits=10, decimal_places=2)
    max_recommended_payment = models.DecimalField(max_digits=10, decimal_places=2)
    debt_to_income_ratio = models.DecimalField(max_digits=5, decimal_places=2)
    budget_status = models.CharField(
        max_length=20,
        choices=[
            ('good', 'Good'),
            ('warning', 'Warning'),
            ('critical', 'Critical')
        ],
        default='good'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Monthly Budget"
        verbose_name_plural = "Monthly Budgets"
    
    def __str__(self):
        return f"Budget for {self.user.username} - {self.budget_status} (DTI: {self.debt_to_income_ratio}%)"

class SavedCalculation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Vehicle Information
    vehicle_price = models.DecimalField(max_digits=12, decimal_places=2)
    down_payment = models.DecimalField(max_digits=12, decimal_places=2)
    trade_in = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sales_tax = models.DecimalField(max_digits=5, decimal_places=2)
    doc_fee = models.DecimalField(max_digits=8, decimal_places=2)
    registration_fee = models.DecimalField(max_digits=8, decimal_places=2)
    
    # Loan Terms
    loan_term = models.IntegerField()  # in months
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    loan_fee = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    monthly_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Additional Costs
    credit_score = models.IntegerField(null=True, blank=True)
    insurance_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    maintenance_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    fuel_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    extended_warranty = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    def calculate_monthly_payment(self):
        """Calculate the monthly payment based on loan terms"""
        loan_amount = self.vehicle_price - self.down_payment - self.trade_in
        monthly_rate = self.interest_rate / 100 / 12
        
        if monthly_rate == 0:
            return loan_amount / self.loan_term
        
        return (loan_amount * monthly_rate) / (1 - (1 + monthly_rate) ** -self.loan_term)
    
    def save(self, *args, **kwargs):
        if not self.monthly_payment:
            self.monthly_payment = self.calculate_monthly_payment()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Calculation for {self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

class ContactQuery(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Contact Query"
        verbose_name_plural = "Contact Queries"

    def __str__(self):
        return f"Query from {self.name} ({self.email}) - {self.created_at.strftime('%Y-%m-%d %H:%M')}"