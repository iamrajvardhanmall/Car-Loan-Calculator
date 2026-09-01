# car_loan/forms.py
from django import forms
from django.core.validators import MinValueValidator

class LoanCalculatorForm(forms.Form):
    vehicle_price = forms.DecimalField(
        label='Vehicle Price (₹)',
        min_value=0,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': 'e.g. 25000.00'
        })
    )
    down_payment = forms.DecimalField(
        label='Down Payment (₹)',
        min_value=0,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': 'e.g. 5000.00'
        })
    )
    loan_term = forms.IntegerField(
        label='Loan Term (months)',
        min_value=1,
        max_value=96,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': 'e.g. 60'
        })
    )
    interest_rate = forms.DecimalField(
        label='Interest Rate (%)',
        min_value=0,
        max_value=100,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': 'e.g. 3.5'
        })
    )
    credit_score = forms.IntegerField(
        label='Credit Score',
        min_value=300,
        max_value=850,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': 'e.g. 720'
        })
    )
    insurance_cost = forms.DecimalField(
        label='Monthly Insurance Cost (₹)',
        min_value=0,
        max_digits=10,
        decimal_places=2,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': 'e.g. 150.00'
        })
    )
    maintenance_cost = forms.DecimalField(
        label='Monthly Maintenance Estimate (₹)',
        min_value=0,
        max_digits=10,
        decimal_places=2,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': 'e.g. 50.00'
        })
    )
    fuel_cost = forms.DecimalField(
        label='Monthly Fuel Cost (₹)',
        min_value=0,
        max_digits=10,
        decimal_places=2,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': 'e.g. 200.00'
        })
    )
    extended_warranty = forms.DecimalField(
        label='Extended Warranty Cost (₹)',
        min_value=0,
        max_digits=10,
        decimal_places=2,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'step': '0.01',
            'placeholder': 'e.g. 2000.00'
        })
    )
    
    def clean(self):
        cleaned_data = super().clean()
        vehicle_price = cleaned_data.get('vehicle_price')
        down_payment = cleaned_data.get('down_payment')
        
        if vehicle_price and down_payment and down_payment >= vehicle_price:
            raise forms.ValidationError(
                "Down payment cannot be greater than or equal to vehicle price"
            )
        
        return cleaned_data