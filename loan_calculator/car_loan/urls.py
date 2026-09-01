from django.urls import path
from . import views
from weasyprint import HTML

app_name = 'car_loan'  

urlpatterns = [
    path('', views.home_view, name='home'),  # Root URL now points to home_view
    path('calculator/', views.calculator_view, name='calculator'),
    path('saved/', views.SavedCalculationsView.as_view(), name='saved_calculations'),
    path('delete/<int:pk>/', views.delete_calculation, name='delete_calculation'),
    path('schedule/<int:pk>/', views.amortization_schedule, name='amortization_schedule'),
    path('result/', views.result_view, name='result'),
    path('download_pdf/', views.download_pdf, name='download_pdf'),
    path('signup/', views.signup_view, name='signup'),
    path('about/', views.about_view, name='about'),
    path('save-calculation/', views.save_calculation, name='save_calculation'),
    path('compare-loans/', views.compare_loans_view, name='compare_loans'),
    path('delete-comparison/<int:pk>/', views.delete_comparison, name='delete_comparison'),
    path('early-payoff/', views.early_payoff_view, name='early_payoff'),
    path('budget-analyzer/', views.budget_analyzer_view, name='budget_analyzer'),
    path('value-estimator/', views.value_estimator, name='value_estimator'),
    path('value-estimator/api/', views.value_estimator_api, name='value_estimator_api'),
]