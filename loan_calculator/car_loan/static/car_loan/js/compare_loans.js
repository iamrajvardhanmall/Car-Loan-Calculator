// Compare Loans Page JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    const addLoanButton = document.getElementById('addLoan');
    const loansContainer = document.getElementById('loansContainer');
    const compareButton = document.getElementById('compareLoans');
    const comparisonForm = document.getElementById('comparison-form');
    const comparisonTableBody = document.querySelector('#comparison-table tbody');
    let loanCount = document.querySelectorAll('.loan-form').length || 2; // Start with existing loans or default to 2

    // Initialize CSRF token and URLs
    const csrfToken = getCookie('csrftoken') || window.csrfToken;
    const compareLoansUrl = window.compareLoansUrl || '/car_loan/compare-loans/';
    const deleteComparisonUrlBase = window.deleteComparisonUrlBase || '/car_loan/delete-comparison/';



    // ===== MAIN FORM SUBMISSION - ADD TO COMPARISON =====
    if (comparisonForm) {
        comparisonForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                vehicle_price: parseFloat(document.getElementById('vehicle_price').value) || 0,
                down_payment: parseFloat(document.getElementById('down_payment').value) || 0,
                loan_term: parseInt(document.getElementById('loan_term').value) || 0,
                interest_rate: parseFloat(document.getElementById('interest_rate').value) || 0
            };

            // Validate form data
            if (!validateComparisonForm(formData)) {
                return;
            }

            // Send to backend via AJAX
            sendComparisonToBackend(formData);
        });
    }

    // Validate comparison form
    function validateComparisonForm(data) {
        if (!data.name) {
            showNotification('Please enter a comparison name.', 'warning');
            return false;
        }
        if (data.vehicle_price <= 0) {
            showNotification('Vehicle price must be greater than 0.', 'warning');
            return false;
        }
        if (data.down_payment < 0) {
            showNotification('Down payment cannot be negative.', 'warning');
            return false;
        }
        if (data.down_payment >= data.vehicle_price) {
            showNotification('Down payment must be less than vehicle price.', 'warning');
            return false;
        }
        if (data.loan_term <= 0) {
            showNotification('Loan term must be greater than 0.', 'warning');
            return false;
        }
        if (data.interest_rate < 0) {
            showNotification('Interest rate cannot be negative.', 'warning');
            return false;
        }
        return true;
    }

    // Send comparison data to backend
    function sendComparisonToBackend(formData) {
        fetch(compareLoansUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Add new row to table
                addComparisonToTable(data.comparison);

                // Clear form
                comparisonForm.reset();

                // Show success message
                showNotification('Comparison added successfully!', 'success');
            } else {
                showNotification('Error: ' + (data.error || 'Failed to add comparison'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Network error: ' + error.message, 'danger');
        });
    }

    // Add comparison row to table
    function addComparisonToTable(comparison) {
        if (!comparisonTableBody) return;

        const newRow = document.createElement('tr');
        newRow.setAttribute('data-id', comparison.id);
        newRow.innerHTML = `
            <td>${escapeHtml(comparison.name)}</td>
            <td>₹${parseFloat(comparison.monthly_payment).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>₹${parseFloat(comparison.total_cost).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-comparison" data-id="${comparison.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        // Add event listener to delete button
        const deleteBtn = newRow.querySelector('.delete-comparison');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                deleteComparison(comparison.id, newRow);
            });
        }

        comparisonTableBody.appendChild(newRow);
    }

    // Delete comparison
    function deleteComparison(comparisonId, rowElement) {
        if (!confirm('Are you sure you want to delete this comparison?')) {
            return;
        }

        const deleteUrl = `${deleteComparisonUrlBase}${comparisonId}/`;
        console.log('Deleting comparison with URL:', deleteUrl);
        
        fetch(deleteUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                rowElement.remove();
                showNotification('Comparison deleted successfully!', 'success');
            } else {
                showNotification('Error: ' + (data.error || 'Failed to delete'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Network error: ' + error.message, 'danger');
        });
    }

    // Setup delete buttons for existing comparisons
    document.querySelectorAll('.delete-comparison').forEach(btn => {
        btn.addEventListener('click', function() {
            const comparisonId = this.getAttribute('data-id');
            const rowElement = this.closest('tr');
            deleteComparison(comparisonId, rowElement);
        });
    });

    // Add new loan form
    if (addLoanButton) {
        addLoanButton.addEventListener('click', function() {
            if (loanCount >= 5) {
                showNotification('Maximum of 5 loans can be compared at once.', 'warning');
                return;
            }
            
            addLoanForm();
        });
    }

    function addLoanForm() {
        loanCount++;
        
        const loanForm = document.createElement('div');
        loanForm.className = 'col-md-6 col-lg-4 mb-4';
        loanForm.innerHTML = `
            <div class="card loan-form h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">Loan ${loanCount}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-loan" title="Remove Loan">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="card-body">
                    <form class="loan-calculation-form" data-loan-id="${loanCount}">
                        <div class="mb-3">
                            <label class="form-label">Loan Amount</label>
                            <input type="number" class="form-control loan-amount" name="loan_amount" required min="1000" max="1000000" step="100">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Interest Rate (%)</label>
                            <input type="number" class="form-control interest-rate" name="interest_rate" required min="0.1" max="50" step="0.1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Loan Term (months)</label>
                            <input type="number" class="form-control loan-term" name="loan_term" required min="6" max="120" step="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Down Payment</label>
                            <input type="number" class="form-control down-payment" name="down_payment" min="0" step="100">
                        </div>
                        <div class="text-center">
                            <button type="button" class="btn btn-primary btn-sm calculate-single">
                                <i class="bi bi-calculator"></i> Calculate
                            </button>
                        </div>
                    </form>
                    <div class="loan-results mt-3" style="display: none;">
                        <div class="card bg-light">
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-6">
                                        <small class="text-muted">Monthly Payment</small>
                                        <div class="h6 monthly-payment">-</div>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Total Interest</small>
                                        <div class="h6 total-interest">-</div>
                                    </div>
                                </div>
                                <div class="row text-center mt-2">
                                    <div class="col-6">
                                        <small class="text-muted">Total Cost</small>
                                        <div class="h6 total-cost">-</div>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">APR</small>
                                        <div class="h6 apr">-</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        loansContainer.appendChild(loanForm);
        
        // Add event listeners to the new form
        setupLoanFormEventListeners(loanForm);
        
        // Update compare button state
        updateCompareButtonState();
    }

    // Remove loan form
    function removeLoanForm(loanForm) {
        if (document.querySelectorAll('.loan-form').length <= 2) {
            showNotification('At least 2 loans are required for comparison.', 'warning');
            return;
        }
        
        loanForm.remove();
        loanCount--;
        
        // Renumber remaining loans
        const remainingForms = document.querySelectorAll('.loan-form');
        remainingForms.forEach((form, index) => {
            const header = form.querySelector('.card-header h6');
            if (header) {
                header.textContent = `Loan ${index + 1}`;
            }
            
            const calculationForm = form.querySelector('.loan-calculation-form');
            if (calculationForm) {
                calculationForm.dataset.loanId = index + 1;
            }
        });
        
        loanCount = remainingForms.length;
        updateCompareButtonState();
    }

    // Setup event listeners for loan forms
    function setupLoanFormEventListeners(container) {
        // Remove loan button
        const removeButton = container.querySelector('.remove-loan');
        if (removeButton) {
            removeButton.addEventListener('click', function() {
                removeLoanForm(container);
            });
        }
        
        // Calculate button
        const calculateButton = container.querySelector('.calculate-single');
        if (calculateButton) {
            calculateButton.addEventListener('click', function() {
                calculateSingleLoan(container);
            });
        }
        
        // Form validation
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateLoanField(this);
            });
            
            input.addEventListener('input', function() {
                clearFieldError(this);
            });
        });
    }

    // Initialize existing loan forms
    document.querySelectorAll('.loan-form').forEach(form => {
        setupLoanFormEventListeners(form);
    });

    // Calculate single loan
    function calculateSingleLoan(container) {
        const form = container.querySelector('.loan-calculation-form');
        const resultsContainer = container.querySelector('.loan-results');
        
        if (!validateLoanForm(form)) {
            return;
        }
        
        const loanAmount = parseFloat(form.querySelector('.loan-amount').value);
        const interestRate = parseFloat(form.querySelector('.interest-rate').value);
        const loanTerm = parseInt(form.querySelector('.loan-term').value);
        const downPayment = parseFloat(form.querySelector('.down-payment').value) || 0;
        
        const principalAmount = loanAmount - downPayment;
        const monthlyRate = interestRate / 100 / 12;
        const monthlyPayment = (principalAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / 
                              (Math.pow(1 + monthlyRate, loanTerm) - 1);
        const totalPayment = monthlyPayment * loanTerm;
        const totalInterest = totalPayment - principalAmount;
        const totalCost = totalPayment + downPayment;
        
        // Update results display
        const monthlyPaymentEl = resultsContainer.querySelector('.monthly-payment');
        const totalInterestEl = resultsContainer.querySelector('.total-interest');
        const totalCostEl = resultsContainer.querySelector('.total-cost');
        const aprEl = resultsContainer.querySelector('.apr');
        
        if (monthlyPaymentEl) monthlyPaymentEl.textContent = `₹${monthlyPayment.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (totalInterestEl) totalInterestEl.textContent = `₹${totalInterest.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (totalCostEl) totalCostEl.textContent = `₹${totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (aprEl) aprEl.textContent = `${interestRate.toFixed(2)}%`;
        
        // Show results
        resultsContainer.style.display = 'block';
        
        // Store calculation data for comparison
        form.dataset.calculated = 'true';
        form.dataset.monthlyPayment = monthlyPayment.toFixed(2);
        form.dataset.totalInterest = totalInterest.toFixed(2);
        form.dataset.totalCost = totalCost.toFixed(2);
        
        updateCompareButtonState();
    }

    // Compare all loans
    if (compareButton) {
        compareButton.addEventListener('click', function() {
            const calculatedForms = document.querySelectorAll('.loan-calculation-form[data-calculated="true"]');
            
            if (calculatedForms.length < 2) {
                showNotification('Please calculate at least 2 loans before comparing.', 'warning');
                return;
            }
            
            generateComparisonResults(calculatedForms);
        });
    }

    function generateComparisonResults(forms) {
        const comparisonData = Array.from(forms).map((form, index) => ({
            id: index + 1,
            loanAmount: parseFloat(form.querySelector('.loan-amount').value),
            interestRate: parseFloat(form.querySelector('.interest-rate').value),
            loanTerm: parseInt(form.querySelector('.loan-term').value),
            downPayment: parseFloat(form.querySelector('.down-payment').value) || 0,
            monthlyPayment: parseFloat(form.dataset.monthlyPayment),
            totalInterest: parseFloat(form.dataset.totalInterest),
            totalCost: parseFloat(form.dataset.totalCost)
        }));
        
        // Find best options
        const bestMonthlyPayment = Math.min(...comparisonData.map(loan => loan.monthlyPayment));
        const bestTotalInterest = Math.min(...comparisonData.map(loan => loan.totalInterest));
        const bestTotalCost = Math.min(...comparisonData.map(loan => loan.totalCost));
        
        // Create comparison table
        let comparisonHTML = `
            <div class="mt-5">
                <h4 class="mb-4">Loan Comparison Results</h4>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Loan</th>
                                <th>Amount</th>
                                <th>Rate</th>
                                <th>Term</th>
                                <th>Monthly Payment</th>
                                <th>Total Interest</th>
                                <th>Total Cost</th>
                                <th>Savings</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        comparisonData.forEach(loan => {
            const isLowestPayment = loan.monthlyPayment === bestMonthlyPayment;
            const isLowestInterest = loan.totalInterest === bestTotalInterest;
            const isLowestCost = loan.totalCost === bestTotalCost;
            const savings = loan.totalCost - bestTotalCost;
            
            comparisonHTML += `
                <tr class="${isLowestCost ? 'table-success' : ''}">
                    <td>
                        <strong>Loan ${loan.id}</strong>
                        ${isLowestCost ? '<br><small class="text-success"><i class="bi bi-trophy"></i> Best Overall</small>' : ''}
                    </td>
                    <td>₹${loan.loanAmount.toLocaleString('en-IN')}</td>
                    <td>${loan.interestRate}%</td>
                    <td>${loan.loanTerm} months</td>
                    <td>
                        ₹${loan.monthlyPayment.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        ${isLowestPayment ? '<br><small class="text-success"><i class="bi bi-star"></i> Lowest</small>' : ''}
                    </td>
                    <td>
                        ₹${loan.totalInterest.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        ${isLowestInterest ? '<br><small class="text-success"><i class="bi bi-star"></i> Lowest</small>' : ''}
                    </td>
                    <td>
                        ₹${loan.totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        ${isLowestCost ? '<br><small class="text-success"><i class="bi bi-star"></i> Lowest</small>' : ''}
                    </td>
                    <td class="${savings > 0 ? 'text-danger' : 'text-success'}">
                        ${savings > 0 ? '+' : ''}₹${savings.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                </tr>
            `;
        });
        
        comparisonHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Add comparison results to page
        let resultsContainer = document.getElementById('comparisonResults');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'comparisonResults';
            loansContainer.parentNode.appendChild(resultsContainer);
        }
        
        resultsContainer.innerHTML = comparisonHTML;
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Form validation
    function validateLoanForm(form) {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!validateLoanField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    function validateLoanField(field) {
        const value = field.value.trim();
        
        if (field.hasAttribute('required') && !value) {
            showFieldError(field, 'This field is required.');
            return false;
        }
        
        if (field.type === 'number' && value) {
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

    function updateCompareButtonState() {
        if (compareButton) {
            const calculatedForms = document.querySelectorAll('.loan-calculation-form[data-calculated="true"]');
            compareButton.disabled = calculatedForms.length < 2;
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

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initial setup
    updateCompareButtonState();
});