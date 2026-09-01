from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView
from django.contrib import messages
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.template.loader import render_to_string
from weasyprint import HTML
from django.conf import settings
from .models import LoanCalculation, SavedCalculation, LoanComparison, EarlyPayoff, MonthlyBudget, ContactQuery
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.views.decorators.csrf import csrf_protect
from urllib import error as urllib_error
from urllib import request as urllib_request
from datetime import datetime
import json
import math
import logging

logger = logging.getLogger(__name__)

@csrf_protect
def signup_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            messages.success(request, 'Account created successfully!')
            return redirect('car_loan:calculator')
    else:
        form = UserCreationForm()
    return render(request, 'car_loan/signup.html', {'form': form})

def home_view(request):
    """Redirect to login page"""
    return redirect('login')

@login_required
def calculator_view(request):
    return render(request, 'car_loan/calculator.html')

class SavedCalculationsView(LoginRequiredMixin, ListView):
    model = SavedCalculation
    template_name = 'car_loan/saved_calculations.html'
    context_object_name = 'calculations'
    
    def get_queryset(self):
        return SavedCalculation.objects.filter(user=self.request.user).order_by('-created_at')

@login_required
def delete_calculation(request, pk):
    if request.method == 'POST':
        try:
            logger.info(f"Attempting to delete calculation: pk={pk}, user={request.user}")
            calculation = get_object_or_404(SavedCalculation, pk=pk, user=request.user)
            logger.info(f"Found calculation: {calculation}")
            calculation.delete()
            logger.info(f"Successfully deleted calculation {pk}")
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True, 'message': 'Calculation deleted successfully'})
            messages.success(request, 'Calculation deleted successfully.')
            return redirect('car_loan:saved_calculations')
        except Exception as e:
            logger.error(f"Error deleting calculation {pk}: {str(e)}", exc_info=True)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': str(e)})
            messages.error(request, f'Error deleting calculation: {str(e)}')
            return redirect('car_loan:saved_calculations')
    logger.warning(f"Invalid request method for delete_calculation: {request.method}")
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)

@login_required
def amortization_schedule(request, pk):
    calculation = get_object_or_404(LoanCalculation, pk=pk, user=request.user)
    return render(request, 'car_loan/schedule.html', {'calculation': calculation})

def calculate_credit_score_impact(credit_score):
    """Calculate interest rate adjustment based on credit score"""
    if credit_score >= 780:
        return Decimal('-0.5')
    elif credit_score >= 740:
        return Decimal('-0.25')
    elif credit_score >= 700:
        return Decimal('0')
    elif credit_score >= 660:
        return Decimal('0.5')
    elif credit_score >= 620:
        return Decimal('1.0')
    else:
        return Decimal('2.0')

def calculate_loan_metrics(loan_amount, annual_rate, term_months):
    if loan_amount <= 0 or term_months <= 0:
        return Decimal('0'), Decimal('0'), Decimal('0')

    monthly_rate = (annual_rate / 100) / 12
    
    if monthly_rate == 0:
        monthly_payment = loan_amount / term_months
        total_payment = loan_amount
        total_interest = Decimal('0')
    else:
        factor = (1 + monthly_rate) ** term_months
        monthly_payment = (loan_amount * monthly_rate * factor) / (factor - 1)
        monthly_payment = monthly_payment.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_payment = monthly_payment * term_months
        total_interest = total_payment - loan_amount
    return monthly_payment, total_payment, total_interest

def validate_numeric_input(value, min_value, max_value, default):
    try:
        val = Decimal(str(value)) if value else default
        return max(min_value, min(max_value, val))
    except (ValueError, TypeError, InvalidOperation):
        return default


def estimate_market_value(make, model, year, mileage_km, condition, features=None, city=None):
    features = features or []
    current_year = datetime.now().year
    make_key = (make or 'Unknown').strip() or 'Unknown'
    model_key = (model or 'Unknown').strip() or 'Unknown'
    key = f'{make_key}|{model_key}'

    bases = {
        'BMW|X5': 4500000,
        'BMW|3 Series': 2000000,
        'Toyota|Camry': 1500000,
        'Honda|Civic': 1200000,
        'Ford|F-150': 3000000,
        'Unknown|Unknown': 1500000,
    }
    base_price = bases.get(key, bases.get(make_key, bases['Unknown|Unknown']))

    try:
        vehicle_year = int(year) if year else current_year
    except (TypeError, ValueError):
        vehicle_year = current_year

    age = max(0, current_year - vehicle_year)
    depreciation_factor = Decimal('0.88') ** age

    try:
        mileage_value = Decimal(str(mileage_km or 0))
    except (InvalidOperation, TypeError, ValueError):
        mileage_value = Decimal('0')

    mileage_factor = Decimal('1') - min(mileage_value / Decimal('250000'), Decimal('0.6'))

    condition_multipliers = {
        'excellent': Decimal('1.12'),
        'good': Decimal('1.00'),
        'fair': Decimal('0.90'),
        'poor': Decimal('0.75'),
    }
    condition_multiplier = condition_multipliers.get((condition or '').lower(), Decimal('1.00'))

    features_bonus = Decimal('1') + min(Decimal(len(features)) * Decimal('0.02'), Decimal('0.12'))

    city_multipliers = {
        'Mumbai': Decimal('1.12'),
        'Delhi': Decimal('1.10'),
        'Bengaluru': Decimal('1.08'),
        'Chennai': Decimal('1.05'),
        'Kolkata': Decimal('1.02'),
        'Pune': Decimal('1.03'),
        'Hyderabad': Decimal('1.04'),
        'Other': Decimal('0.95'),
        'Unknown': Decimal('1.00'),
    }
    city_multiplier = city_multipliers.get(city or 'Unknown', Decimal('1.00'))

    estimated_value = (
        Decimal(str(base_price))
        * depreciation_factor
        * mileage_factor
        * condition_multiplier
        * features_bonus
        * city_multiplier
    )
    return int(max(estimated_value, Decimal('20000')).quantize(Decimal('1')))


def build_estimator_text(estimated_value, make, model, year, mileage_km, condition, city, features, image_count=0):
    feature_text = ', '.join(features) if features else 'standard equipment'
    source_note = (
        f'Based on {image_count} uploaded image(s), ' if image_count else 'Based on the provided details, '
    )
    return (
        f'Estimated Value: ₹{estimated_value:,.0f}\n\n'
        f'1. Condition Assessment: The {condition} condition {make} {model} shows typical wear for a {year} model with {mileage_km} km.\n\n'
        f'2. Features Analysis: Selected features ({feature_text}) add value to the vehicle.\n\n'
        f'3. Value Impact Factors: Year, mileage, condition, and {city} market trends are the main pricing factors.\n\n'
        f'4. Market Analysis: {source_note}this estimate reflects similar vehicles in the current market.'
    )


def call_gemini_estimator(payload):
    api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', '')
    api_url = getattr(settings, 'GOOGLE_GEMINI_API_URL', '')
    if not api_key or not api_url:
        return None
    make = payload.get('make') or 'Unknown'
    model = payload.get('model') or 'Unknown'
    year = payload.get('year') or datetime.now().year
    mileage_km = payload.get('mileage_km') or payload.get('mileage') or 0
    condition = payload.get('condition') or 'good'
    city = payload.get('city') or 'Unknown'
    features = payload.get('features') or []
    images = payload.get('images') or []
    mode = payload.get('mode') or 'manual'
    prompt = (
        'You are a professional car appraiser. Please estimate the value of this vehicle:\n'
        f'Make: {make}\n'
        f'Model: {model}\n'
        f'Year: {year}\n'
        f'Mileage: {mileage_km} km\n'
        f'City: {city}\n'
        f'Condition: {condition}\n'
        f'Features: {", ".join(features) if features else "standard equipment"}\n\n'
        'Provide a detailed response that includes:\n'
        '1. Estimated Value in INR (formatted as "Estimated Value: ₹X,XXX")\n'
        '2. Condition Assessment\n'
        '3. Features Analysis\n'
        '4. Value Impact Factors\n'
        '5. Market Analysis\n\n'
        'Format your response clearly with each section on a new line.'
    )
    parts = [{"text": prompt}]
    if mode == 'image':
        for image_data in images:
            parts.append({
                'inline_data': {
                    'mime_type': 'image/jpeg',
                    'data': image_data,
                }
            })

    request_body = {
        'contents': [{
            'parts': parts
        }],
        'generationConfig': {
            'temperature': 0.7,
            'topK': 40,
            'topP': 0.95,
            'maxOutputTokens': 1024,
        },
    }

    request = urllib_request.Request(
        f'{api_url}?key={api_key}',
        data=json.dumps(request_body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urllib_request.urlopen(request, timeout=30) as response:
            response_data = json.loads(response.read().decode('utf-8'))
        return response_data['candidates'][0]['content']['parts'][0]['text']
    except (urllib_error.HTTPError, urllib_error.URLError, KeyError, ValueError, IndexError) as exc:
        logger.warning('Gemini estimator request failed: %s', exc)
        return None


def estimate_vehicle_payload(payload):
    mode = payload.get('mode') or 'manual'
    make = (payload.get('make') or 'Unknown').strip() or 'Unknown'
    model = (payload.get('model') or 'Unknown').strip() or 'Unknown'
    year = payload.get('year') or datetime.now().year
    mileage_km = payload.get('mileage_km') or payload.get('mileage') or 0
    city = payload.get('city') or 'Unknown'
    features = payload.get('features') or []
    images = payload.get('images') or []

    if mode == 'image' and not payload.get('condition'):
        condition = 'good' if len(images) > 1 else 'fair'
    else:
        condition = payload.get('condition') or 'good'

    estimated_value = estimate_market_value(make, model, year, mileage_km, condition, features, city)
    confidence = 80
    if mode == 'image':
        confidence = min(95, 70 + (len(images) * 5) + (10 if payload.get('year') else 0) + (10 if mileage_km else 0))
    else:
        confidence = min(95, 72 + (10 if payload.get('year') else 0) + (8 if mileage_km else 0) + (5 if city else 0))

    ai_text = call_gemini_estimator({
        **payload,
        'condition': condition,
    })
    if not ai_text:
        ai_text = build_estimator_text(
            estimated_value,
            make,
            model,
            year,
            mileage_km,
            condition,
            city,
            features,
            image_count=len(images) if mode == 'image' else 0,
        )

    return {
        'text': ai_text,
        'confidence': confidence,
        'estimated_value': estimated_value,
        'condition': condition,
    }

@login_required 
def result_view(request):
    logger.debug(f"Result view called with method: {request.method}")
    logger.debug(f"GET parameters: {dict(request.GET)}")
    logger.debug(f"Headers: {dict(request.headers)}")
    
    try:
        vehicle_price = validate_numeric_input(
            request.GET.get('vehicle_price'),
            Decimal('0'),
            Decimal('10000000'),  
            Decimal('25000')  
        )
        
        down_payment = validate_numeric_input(
            request.GET.get('down_payment'),
            Decimal('0'),
            vehicle_price,
            Decimal('5000')  
        )
        
        loan_term = int(validate_numeric_input(
            request.GET.get('loan_term'),
            12,  # Minimum 1 year
            96,  # Maximum 8 years
            60   # Default 5 years
        ))
        
        base_interest_rate = validate_numeric_input(
            request.GET.get('interest_rate'),
            Decimal('0'),
            Decimal('100'),  
            Decimal('5.0')
        )
        
        credit_score = int(validate_numeric_input(
            request.GET.get('credit_score'),
            300,
            850,
            0
        ))
        
        insurance_cost = validate_numeric_input(
            request.GET.get('insurance_cost'),
            Decimal('0'),
            Decimal('2000'),  
            Decimal('0')
        )
        
        maintenance_cost = validate_numeric_input(
            request.GET.get('maintenance_cost'),
            Decimal('0'),
            Decimal('1000'),  # ₹1000/month max
            Decimal('0')
        )
        
        fuel_cost = validate_numeric_input(
            request.GET.get('fuel_cost'),
            Decimal('0'),
            Decimal('1000'),  # ₹1000/month max
            Decimal('0')
        )
        
        extended_warranty = validate_numeric_input(
            request.GET.get('extended_warranty'),
            Decimal('0'),
            Decimal('10000'),  # ₹10k max
            Decimal('0')
        )

        # Calculate loan amount
        loan_amount = vehicle_price - down_payment
        
        # Adjust interest rate based on credit score
        credit_score_adjustment = calculate_credit_score_impact(credit_score)
        final_interest_rate = base_interest_rate + credit_score_adjustment
        
        # Calculate loan metrics
        monthly_payment, total_payment, total_interest = calculate_loan_metrics(
            loan_amount, final_interest_rate, loan_term
        )
        
        # Calculate monthly costs
        monthly_insurance = insurance_cost
        monthly_maintenance = maintenance_cost
        monthly_fuel = fuel_cost
        
        # Calculate total costs
        total_insurance = monthly_insurance * loan_term
        total_maintenance = monthly_maintenance * loan_term
        total_fuel = monthly_fuel * loan_term
        
        # Calculate total monthly payment including all costs
        total_monthly_cost = (
            monthly_payment +
            monthly_insurance +
            monthly_maintenance +
            monthly_fuel
        )
        
        # Calculate total cost of ownership
        total_cost_of_ownership = (
            vehicle_price +  # Initial cost
            total_interest +  # Interest paid
            total_insurance +  # Total insurance
            total_maintenance +  # Total maintenance
            total_fuel +  # Total fuel
            extended_warranty  # Extended warranty
        )
        
        # Calculate cost breakdowns for the pie chart
        cost_breakdown = {
            'principal': float(vehicle_price),
            'interest': float(total_interest),
            'insurance': float(total_insurance),
            'maintenance': float(total_maintenance),
            'fuel': float(total_fuel),
            'warranty': float(extended_warranty)
        }
        
        # Calculate affordability metrics
        recommended_max_payment = vehicle_price * Decimal('0.15')  # 15% of vehicle price
        is_payment_affordable = monthly_payment <= recommended_max_payment
        
        context = {
            'vehicle_price': vehicle_price,
            'down_payment': down_payment,
            'loan_amount': loan_amount,
            'loan_term': loan_term,
            'base_interest_rate': base_interest_rate,
            'credit_score': credit_score,
            'credit_score_adjustment': credit_score_adjustment,
            'final_interest_rate': final_interest_rate,
            'monthly_payment': monthly_payment,
            'total_payment': total_payment,
            'total_interest': total_interest,
            'insurance_cost': insurance_cost,
            'maintenance_cost': maintenance_cost,
            'fuel_cost': fuel_cost,
            'extended_warranty': extended_warranty,
            'total_monthly_cost': total_monthly_cost,
            'total_cost_of_ownership': total_cost_of_ownership,
            'cost_breakdown': cost_breakdown,
            'is_payment_affordable': is_payment_affordable,
            'recommended_max_payment': recommended_max_payment,
            'down_payment_percentage': (down_payment / vehicle_price * 100) if vehicle_price else 0,
            'loan_to_value_ratio': (loan_amount / vehicle_price * 100) if vehicle_price else 0,
            'monthly_cost_breakdown': {
                'loan': float(monthly_payment),
                'insurance': float(monthly_insurance),
                'maintenance': float(monthly_maintenance),
                'fuel': float(monthly_fuel)
            }
        }
        
        return render(request, 'car_loan/result.html', context)
        
    except Exception as e:
        logger.error(f"Error in result_view: {str(e)}", exc_info=True)
        messages.error(request, f'Error calculating loan: {str(e)}')
        return redirect('car_loan:calculator')

@login_required
def download_pdf(request):
    # Extract query parameters
    context = {
        'vehicle_price': request.GET.get('vehicle_price'),
        'down_payment': request.GET.get('down_payment'),
        'loan_amount': request.GET.get('loan_amount'),
        'monthly_payment': request.GET.get('monthly_payment'),
        'total_interest': request.GET.get('total_interest'),
        'total_payment': request.GET.get('total_payment'),
        'loan_term': request.GET.get('loan_term'),
        'interest_rate': request.GET.get('interest_rate'),
        'credit_score': request.GET.get('credit_score'),
        'insurance_cost': request.GET.get('insurance_cost'),
        'maintenance_cost': request.GET.get('maintenance_cost'),
        'fuel_cost': request.GET.get('fuel_cost'),
        'extended_warranty': request.GET.get('extended_warranty'),
        'total_cost_of_ownership': request.GET.get('total_cost_of_ownership'),
    }
    
    # Render the template to a string
    html_string = render_to_string('car_loan/pdf_template.html', context)
    
    # Generate the PDF
    pdf = HTML(string=html_string).write_pdf()

    # Return the PDF as a response
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="loan_summary.pdf"'
    return response

@login_required
def compare_loans_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            logger.info(f"Received comparison data: {data}")
            
            # Calculate loan amount
            vehicle_price = Decimal(str(data.get('vehicle_price', '0')))
            down_payment = Decimal(str(data.get('down_payment', '0')))
            loan_term = int(data.get('loan_term', '0'))
            interest_rate = Decimal(str(data.get('interest_rate', '0')))
            name = data.get('name', '').strip()

            # Validate data
            if not name:
                return JsonResponse({
                    'success': False,
                    'error': 'Comparison name is required'
                }, status=400)
            
            if vehicle_price <= 0:
                return JsonResponse({
                    'success': False,
                    'error': 'Vehicle price must be greater than 0'
                }, status=400)
            
            if down_payment >= vehicle_price:
                return JsonResponse({
                    'success': False,
                    'error': 'Down payment must be less than vehicle price'
                }, status=400)

            loan_amount = vehicle_price - down_payment
            monthly_interest = (interest_rate / 100) / 12
            
            if monthly_interest == 0:
                monthly_payment = loan_amount / loan_term
            else:
                factor = (1 + monthly_interest) ** loan_term
                monthly_payment = loan_amount * (monthly_interest * factor) / (factor - 1)
            
            total_cost = monthly_payment * loan_term

            comparison = LoanComparison.objects.create(
                user=request.user,
                name=name,
                vehicle_price=vehicle_price,
                down_payment=down_payment,
                loan_term=loan_term,
                interest_rate=interest_rate,
                monthly_payment=monthly_payment,
                total_cost=total_cost
            )
            
            logger.info(f"Created comparison: {comparison.id}")
            
            return JsonResponse({
                'success': True,
                'message': 'Comparison added successfully',
                'comparison': {
                    'id': comparison.id,
                    'name': comparison.name,
                    'monthly_payment': float(monthly_payment),
                    'total_cost': float(total_cost)
                }
            })
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            logger.error(f"Error in compare_loans_view: {str(e)}", exc_info=True)
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
            
    comparisons = LoanComparison.objects.filter(user=request.user)
    return render(request, 'car_loan/compare_loans.html', {'comparisons': comparisons})

def calculate_monthly_payment(loan_amount, monthly_interest, loan_term):
    if monthly_interest == 0:
        return loan_amount / loan_term
    
    factor = (1 + monthly_interest) ** loan_term
    return loan_amount * (monthly_interest * factor) / (factor - 1)

@login_required
def early_payoff_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        loan_calc = get_object_or_404(LoanCalculation, id=data['loan_id'], user=request.user)
        
        payoff = EarlyPayoff.objects.create(
            user=request.user,
            loan_calculation=loan_calc,
            extra_payment=Decimal(data['extra_payment']),
            payment_frequency=data['payment_frequency'],
            start_month=int(data['start_month'])
        )
        
        # Calculate savings
        original_payment = loan_calc.monthly_payment
        loan_amount = loan_calc.vehicle_price - loan_calc.down_payment
        annual_rate = loan_calc.interest_rate
        term_months = loan_calc.loan_term
        
        # Calculate new loan term and interest saved
        monthly_rate = (annual_rate / 100) / 12
        remaining_balance = loan_amount
        months = 0
        total_interest = Decimal('0')
        
        while remaining_balance > 0 and months < term_months:
            months += 1
            interest = remaining_balance * monthly_rate
            total_interest += interest
            
            payment = original_payment
            if months >= payoff.start_month:
                if payoff.payment_frequency == 'monthly':
                    payment += payoff.extra_payment
                elif payoff.payment_frequency == 'quarterly' and months % 3 == 0:
                    payment += payoff.extra_payment
                elif payoff.payment_frequency == 'yearly' and months % 12 == 0:
                    payment += payoff.extra_payment
                elif payoff.payment_frequency == 'one_time' and months == payoff.start_month:
                    payment += payoff.extra_payment
            
            principal = min(payment - interest, remaining_balance)
            remaining_balance -= principal
        
        payoff.months_saved = term_months - months
        payoff.interest_saved = loan_calc.total_interest - total_interest
        payoff.save()
        
        return JsonResponse({
            'months_saved': payoff.months_saved,
            'interest_saved': str(payoff.interest_saved)
        })
    
    loan_calcs = LoanCalculation.objects.filter(user=request.user).order_by('-calculation_date')
    return render(request, 'car_loan/early_payoff.html', {'loan_calculations': loan_calcs})

@login_required
def budget_analyzer_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        monthly_income = Decimal(data['monthly_income'])
        existing_debts = Decimal(data.get('existing_debts', 0))
        monthly_expenses = Decimal(data['monthly_expenses'])
        
        # Calculate maximum recommended car payment (28% rule)
        max_payment = (monthly_income * Decimal('0.28')).quantize(Decimal('0.01'))
        
        # Calculate debt-to-income ratio
        total_debts = existing_debts + Decimal(data.get('proposed_car_payment', 0))
        dti_ratio = (total_debts / monthly_income * 100).quantize(Decimal('0.01'))
        
        # Determine budget status
        if dti_ratio <= 36:
            status = 'good'
        elif dti_ratio <= 43:
            status = 'warning'
        else:
            status = 'critical'
        
        budget = MonthlyBudget.objects.create(
            user=request.user,
            monthly_income=monthly_income,
            existing_debts=existing_debts,
            monthly_expenses=monthly_expenses,
            max_recommended_payment=max_payment,
            debt_to_income_ratio=dti_ratio,
            budget_status=status
        )
        
        return JsonResponse({
            'max_payment': str(max_payment),
            'dti_ratio': str(dti_ratio),
            'status': status,
            'recommendations': [
                'Keep total monthly debt payments below 36% of income',
                'Save at least 20% for a down payment',
                'Include insurance and maintenance in your budget'
            ]
        })
    
    return render(request, 'car_loan/budget_analyzer.html')

def about_view(request):
    """
    View function for the About page.
    Renders the about.html template with company information and handles contact form submission.
    """
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip()
        message = request.POST.get('message', '').strip()

        if name and email and message:
            ContactQuery.objects.create(
                name=name,
                email=email,
                message=message
            )
            messages.success(request, "Query has been submitted")
        else:
            messages.error(request, "Please fill out all fields in the contact form.")

        return redirect('car_loan:about')

    return render(request, 'car_loan/about.html')

@login_required
def save_calculation(request):
    if request.method == 'POST':
        try:
            # Create a new saved calculation
            calculation = SavedCalculation.objects.create(
                user=request.user,
                vehicle_price=Decimal(request.POST.get('vehicle_price', 0)),
                down_payment=Decimal(request.POST.get('down_payment', 0)),
                trade_in=Decimal(request.POST.get('trade_in', 0)),
                sales_tax=Decimal(request.POST.get('sales_tax', 0)),
                doc_fee=Decimal(request.POST.get('doc_fee', 0)),
                registration_fee=Decimal(request.POST.get('registration_fee', 0)),
                loan_term=int(request.POST.get('loan_term', 60)),
                interest_rate=Decimal(request.POST.get('interest_rate', 0)),
                loan_fee=Decimal(request.POST.get('loan_fee', 0)),
                monthly_payment=Decimal(request.POST.get('monthly_payment', 0))
            )

            # Save optional fields if provided
            if request.POST.get('credit_score'):
                calculation.credit_score = int(request.POST.get('credit_score'))
            if request.POST.get('insurance_cost'):
                calculation.insurance_cost = Decimal(request.POST.get('insurance_cost'))
            if request.POST.get('maintenance_cost'):
                calculation.maintenance_cost = Decimal(request.POST.get('maintenance_cost'))
            if request.POST.get('fuel_cost'):
                calculation.fuel_cost = Decimal(request.POST.get('fuel_cost'))
            if request.POST.get('extended_warranty'):
                calculation.extended_warranty = Decimal(request.POST.get('extended_warranty'))
            
            calculation.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Calculation saved successfully!'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({
        'success': False,
        'error': 'Invalid request method'
    })

@login_required
def saved_calculations(request):
    """View for displaying saved calculations"""
    calculations = SavedCalculation.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'car_loan/saved_calculations.html', {'calculations': calculations})

@login_required
def delete_calculation(request, pk):
    """Delete a saved calculation"""
    try:
        calculation = SavedCalculation.objects.get(pk=pk, user=request.user)
        calculation.delete()
        return JsonResponse({'success': True})
    except SavedCalculation.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Calculation not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def delete_comparison(request, pk):
    if request.method == 'POST':
        try:
            comparison = get_object_or_404(LoanComparison, pk=pk, user=request.user)
            comparison.delete()
            return JsonResponse({
                'success': True,
                'message': 'Comparison deleted successfully'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    return JsonResponse({
        'success': False,
        'error': 'Invalid request method'
    }, status=400)

@login_required
def calculate_loan(request):
    if request.method == 'POST':
        try:
            # Helper function to safely convert to Decimal
            def to_decimal(value, default='0'):
                try:
                    return Decimal(str(value)) if value else Decimal(default)
                except (InvalidOperation, TypeError):
                    return Decimal(default)

            # Get and convert form data
            vehicle_price = to_decimal(request.POST.get('vehicle_price'))
            down_payment = to_decimal(request.POST.get('down_payment'))
            loan_term = int(request.POST.get('loan_term', '60'))
            interest_rate = to_decimal(request.POST.get('interest_rate'))
            monthly_income = to_decimal(request.POST.get('monthly_income', '0'))  # User's monthly income

            # Calculate loan amount
            loan_amount = vehicle_price - down_payment

            # Calculate monthly payment
            annual_rate = interest_rate / Decimal('100')
            monthly_rate = annual_rate / Decimal('12')
            
            if monthly_rate == 0:
                monthly_payment = loan_amount / Decimal(loan_term)
            else:
                monthly_payment = loan_amount * (
                    monthly_rate * (1 + monthly_rate) ** loan_term
                ) / ((1 + monthly_rate) ** loan_term - 1)

            # Calculate affordability
            recommended_max_payment = monthly_income * Decimal('0.30')  # 30% of monthly income
            is_affordable = monthly_payment <= recommended_max_payment

            # Store results in session
            request.session['loan_results'] = {
                'vehicle_price': str(vehicle_price),
                'down_payment': str(down_payment),
                'loan_amount': str(loan_amount),
                'loan_term': loan_term,
                'interest_rate': str(interest_rate),
                'monthly_payment': str(monthly_payment.quantize(Decimal('.01'))),
                'recommended_max_payment': str(recommended_max_payment.quantize(Decimal('.01'))),
                'is_affordable': is_affordable
            }

            # Redirect to results page
            return redirect('car_loan:result')

        except Exception as e:
            messages.error(request, f'Error calculating loan: {str(e)}')
            return redirect('car_loan:calculator')

    return render(request, 'car_loan/calculator.html')

from django.contrib.auth.decorators import login_required
from django.shortcuts import render

@login_required
def value_estimator(request):
    return render(request, 'car_loan/value_estimator.html')


@login_required
def value_estimator_api(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)

    try:
        result = estimate_vehicle_payload(payload)
        return JsonResponse({'success': True, **result})
    except Exception as exc:
        logger.error('Value estimator API failed: %s', exc, exc_info=True)
        return JsonResponse({'success': False, 'error': str(exc)}, status=500)