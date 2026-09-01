document.addEventListener('DOMContentLoaded', function() {
    const calculatorForm = document.getElementById('loanCalculator');
    if (!calculatorForm) return; // Exit early if not on a page with this form
    
    calculatorForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const formData = new FormData(this);
        
        try {
            const response = await fetch('/calculate-loan/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });

            const data = await response.json();
            
            if (data.success) {
                // Format currency values
                const formatter = new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR'
                });

                // Update results
                document.getElementById('monthlyPayment').textContent = 
                    formatter.format(data.monthly_payment);
                document.getElementById('totalCost').textContent = 
                    formatter.format(data.total_cost);
                document.getElementById('totalInterest').textContent = 
                    formatter.format(data.total_interest);
                document.getElementById('loanAmount').textContent = 
                    formatter.format(data.loan_amount);
                document.getElementById('taxAmount').textContent = 
                    formatter.format(data.tax_amount);

                // Show results section
                document.getElementById('results').classList.remove('d-none');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            // Show error message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.innerHTML = `
                ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            calculatorForm.insertAdjacentElement('beforebegin', alertDiv);
        }
    });

    // Add input validation
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
        });
    });
});
