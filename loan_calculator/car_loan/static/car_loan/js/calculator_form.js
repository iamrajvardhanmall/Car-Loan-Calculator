// Calculator Form JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Slider functionality
    const sliders = document.querySelectorAll('input[type="range"]');
    
    // Slider-to-hidden-input mapping
    const sliderHiddenMap = {
        'loanTermSlider': 'id_loan_term',
        'interestRateSlider': 'id_interest_rate'
    };

    // Slider display output mapping
    const sliderOutputMap = {
        'loanTermSlider': 'loanTermValue',
        'interestRateSlider': 'interestRateValue'
    };

    sliders.forEach(slider => {
        const output = document.getElementById(sliderOutputMap[slider.id] || (slider.id + '_value'));
        const hiddenInput = document.getElementById(sliderHiddenMap[slider.id]);
        
        if (output) {
            // Update display value and hidden input when slider changes
            slider.addEventListener('input', function() {
                updateSliderValue(this, output);
                if (hiddenInput) {
                    hiddenInput.value = this.value;
                }
            });
            
            // Initialize display value
            updateSliderValue(slider, output);
        }
    });

    function updateSliderValue(slider, output) {
        let value = parseFloat(slider.value);
        
        // Format value based on slider type
        if (slider.id.includes('rate') || slider.id.includes('interest')) {
            output.textContent = value.toFixed(1) + '%';
        } else if (slider.id.includes('amount') || slider.id.includes('price') || slider.id.includes('payment') || slider.id.includes('income')) {
            // Use Indian formatting and rupee symbol
            output.textContent = '₹' + value.toLocaleString('en-IN');
        } else if (slider.id.includes('term') || slider.id.includes('months')) {
            output.textContent = value + ' months';
        } else if (slider.id.includes('years')) {
            output.textContent = value + ' years';
        } else {
            output.textContent = value.toLocaleString();
        }
    }

    // Form submission and save functionality
    const calculatorForm = document.getElementById('calculatorForm');
    const saveButton = document.getElementById('saveCalculation');
    
    if (calculatorForm) {
        calculatorForm.addEventListener('submit', function(e) {
            if (!validateForm()) {
                e.preventDefault();
                return false;
            }
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="bi bi-calculator me-2"></i>Calculating...';
                submitButton.disabled = true;
            }
        });
    }

    // Save calculation functionality
    if (saveButton) {
        saveButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (!validateForm()) {
                showNotification('Please fill in all required fields correctly.', 'error');
                return;
            }
            
            const formData = new FormData(calculatorForm);
            
            // Show loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...';
            this.disabled = true;
            
            // Get CSRF token
            const csrfToken = getCookie('csrftoken') || window.csrfToken;
            
            fetch('/save-calculation/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrfToken
                },
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showNotification('Calculation saved successfully!', 'success');
                } else {
                    throw new Error(data.error || 'Failed to save calculation');
                }
            })
            .catch(error => {
                console.error('Error saving calculation:', error);
                showNotification('Failed to save calculation. Please try again.', 'error');
            })
            .finally(() => {
                // Restore button state
                this.innerHTML = originalText;
                this.disabled = false;
            });
        });
    }

    // Form validation
    function validateForm() {
        let isValid = true;
        const requiredFields = calculatorForm.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    function validateField(field) {
        const value = field.value.trim();
        
        if (!value) {
            showFieldError(field, 'This field is required.');
            return false;
        }
        
        // Specific validations
        if (field.type === 'number' || field.type === 'range') {
            const numValue = parseFloat(value);
            const min = parseFloat(field.min);
            const max = parseFloat(field.max);
            
            if (isNaN(numValue)) {
                showFieldError(field, 'Please enter a valid number.');
                return false;
            }
            
            if (min !== undefined && numValue < min) {
                showFieldError(field, `Value must be at least ${min}.`);
                return false;
            }
            
            if (max !== undefined && numValue > max) {
                showFieldError(field, `Value must not exceed ${max}.`);
                return false;
            }
        }
        
        clearFieldError(field);
        return true;
    }

    function showFieldError(field, message) {
        clearFieldError(field);
        
        field.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }

    function clearFieldError(field) {
        field.classList.remove('is-invalid');
        
        const errorFeedback = field.parentNode.querySelector('.invalid-feedback');
        if (errorFeedback) {
            errorFeedback.remove();
        }
    }

    // Real-time validation
    const formFields = calculatorForm.querySelectorAll('input, select');
    formFields.forEach(field => {
        field.addEventListener('blur', function() {
            if (this.hasAttribute('required')) {
                validateField(this);
            }
        });
        
        field.addEventListener('input', function() {
            clearFieldError(this);
        });
    });

    // Auto-calculation functionality (if enabled)
    const autoCalculateCheckbox = document.getElementById('autoCalculate');
    if (autoCalculateCheckbox) {
        autoCalculateCheckbox.addEventListener('change', function() {
            localStorage.setItem('autoCalculateEnabled', this.checked.toString());
            
            if (this.checked) {
                enableAutoCalculation();
            } else {
                disableAutoCalculation();
            }
        });
        
        // Load saved preference
        const savedAutoCalculate = localStorage.getItem('autoCalculateEnabled');
        if (savedAutoCalculate === 'true') {
            autoCalculateCheckbox.checked = true;
            enableAutoCalculation();
        }
    }

    function enableAutoCalculation() {
        // Add event listeners for auto-calculation
        formFields.forEach(field => {
            field.addEventListener('input', debounce(triggerAutoCalculation, 1000));
        });
    }

    function disableAutoCalculation() {
        // Remove auto-calculation listeners
        formFields.forEach(field => {
            field.removeEventListener('input', triggerAutoCalculation);
        });
    }

    function triggerAutoCalculation() {
        if (validateForm()) {
            // Only auto-calculate if form is valid
            const autoCalculateBtn = document.getElementById('autoCalculateBtn');
            if (autoCalculateBtn) {
                autoCalculateBtn.click();
            }
        }
    }

    // Utility functions
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showNotification(message, type = 'info') {
        // Check if notification system exists
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback notification system
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Form reset functionality
    const resetButton = document.getElementById('resetForm');
    if (resetButton) {
        resetButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('Are you sure you want to reset all fields?')) {
                calculatorForm.reset();
                
                // Reset sliders display values
                sliders.forEach(slider => {
                    const output = document.getElementById(slider.id + '_value');
                    if (output) {
                        updateSliderValue(slider, output);
                    }
                });
                
                // Clear any validation errors
                formFields.forEach(field => {
                    clearFieldError(field);
                });
                
                showNotification('Form has been reset.', 'info');
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter or Cmd+Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (calculatorForm) {
                calculatorForm.submit();
            }
        }
        
        // Ctrl+S or Cmd+S to save calculation
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (saveButton) {
                saveButton.click();
            }
        }
    });
});