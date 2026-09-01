// Loan Result Page JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get loan data from Django template (will be injected via data attributes or inline script)
    const loanDataElement = document.getElementById('loan-data');
    const loanDetailsElement = document.getElementById('loan-details');
    
    let loanData = {};
    let loanDetails = {};
    
    // Try to get data from data attributes or fallback to defaults
    if (loanDataElement) {
        loanData = {
            principal: Number(loanDataElement.dataset.principal || 0),
            interest: Number(loanDataElement.dataset.interest || 0),
            insurance: Number(loanDataElement.dataset.insurance || 0),
            maintenance: Number(loanDataElement.dataset.maintenance || 0),
            fuel: Number(loanDataElement.dataset.fuel || 0),
            warranty: Number(loanDataElement.dataset.warranty || 0)
        };
    }
    
    if (loanDetailsElement) {
        loanDetails = {
            loanAmount: Number(loanDetailsElement.dataset.loanAmount || 0),
            interestRate: Number(loanDetailsElement.dataset.interestRate || 0),
            monthlyPayment: Number(loanDetailsElement.dataset.monthlyPayment || 0),
            loanTerm: Number(loanDetailsElement.dataset.loanTerm || 0),
            isAffordable: loanDetailsElement.dataset.isAffordable === 'true',
            recommendedMaxPayment: Number(loanDetailsElement.dataset.recommendedMaxPayment || 0)
        };
    }

    // Payment Breakdown Chart (Doughnut)
    const paymentCtx = document.getElementById('paymentChart');
    if (paymentCtx && typeof Chart !== 'undefined') {
        new Chart(paymentCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest', 'Insurance', 'Maintenance', 'Fuel', 'Warranty'],
                datasets: [{
                    data: [
                        loanData.principal,
                        loanData.interest,
                        loanData.insurance,
                        loanData.maintenance,
                        loanData.fuel,
                        loanData.warranty
                    ],
                    backgroundColor: [
                        '#4361ee',
                        '#4cc9f0',
                        '#f72585',
                        '#7209b7',
                        '#3a0ca3',
                        '#3f37c9'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Amortization Schedule
    function calculateAmortizationSchedule() {
        const schedule = [];
        let balance = loanDetails.loanAmount;
        const monthlyRate = loanDetails.interestRate / 100 / 12;
        const payment = loanDetails.monthlyPayment;

        for (let month = 1; month <= loanDetails.loanTerm; month++) {
            const interest = balance * monthlyRate;
            const principal = payment - interest;
            balance = Math.max(0, balance - principal);

            schedule.push({
                month: month,
                payment: payment,
                principal: principal,
                interest: interest,
                balance: balance
            });
        }

        return schedule;
    }

    const schedule = calculateAmortizationSchedule();
    const scheduleTable = document.getElementById('paymentSchedule');
    
    if (scheduleTable && schedule.length > 0) {
        // Only show first 12 months by default
        const initialMonths = 12;
        let isExpanded = false;

        function appendPaymentRow(table, payment) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.month}</td>
                <td>₹${payment.payment.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>₹${payment.principal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>₹${payment.interest.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>₹${payment.balance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            `;
            table.appendChild(row);
        }

        function showInitialRows() {
            scheduleTable.innerHTML = '';
            schedule.slice(0, initialMonths).forEach(payment => {
                appendPaymentRow(scheduleTable, payment);
            });
            appendShowMoreButton();
        }

        function showAllRows() {
            scheduleTable.innerHTML = '';
            schedule.forEach(payment => {
                appendPaymentRow(scheduleTable, payment);
            });
            appendViewLessButton();
            isExpanded = true;
        }

        function appendShowMoreButton() {
            const showMoreRow = document.createElement('tr');
                showMoreRow.innerHTML = `
                    <td colspan="5" class="text-center py-3">
                        <button class="btn btn-primary btn-sm" id="showMorePayments">
                            <i class="bi bi-chevron-down"></i> Show All ${schedule.length} Months
                        </button>
                    </td>
                `;
            scheduleTable.appendChild(showMoreRow);

            document.getElementById('showMorePayments').addEventListener('click', function() {
                showAllRows();
            });
        }

        function appendViewLessButton() {
            const viewLessRow = document.createElement('tr');
            viewLessRow.innerHTML = `
                <td colspan="5" class="text-center py-3">
                    <button class="btn btn-outline-primary btn-sm" id="viewLessPayments">
                        <i class="bi bi-chevron-up"></i> Show Less
                    </button>
                </td>
            `;
            scheduleTable.appendChild(viewLessRow);

            document.getElementById('viewLessPayments').addEventListener('click', function() {
                showInitialRows();
                isExpanded = false;
            });
        }

        // Initialize with first 12 months
        showInitialRows();
    }

    // Add affordability indicator
    const affordabilityIndicator = document.getElementById('affordabilityIndicator');
    if (affordabilityIndicator) {
        affordabilityIndicator.classList.add(loanDetails.isAffordable ? 'text-success' : 'text-danger');
        affordabilityIndicator.innerHTML = loanDetails.isAffordable
            ? '<i class="bi bi-check-circle-fill"></i> Payment is within recommended range'
            : `<i class="bi bi-exclamation-triangle-fill"></i> Payment exceeds recommended maximum of ₹${loanDetails.recommendedMaxPayment.toLocaleString('en-IN')}`;
    }
});

// Function to initialize loan data from Django template variables
// This should be called from the template with actual data
window.initializeLoanData = function(costBreakdown, loanDetails) {
    // Store data in data attributes for use by the main script
    const loanDataElement = document.getElementById('loan-data');
    const loanDetailsElement = document.getElementById('loan-details');
    
    if (loanDataElement && costBreakdown) {
        loanDataElement.dataset.principal = costBreakdown.principal || 0;
        loanDataElement.dataset.interest = costBreakdown.interest || 0;
        loanDataElement.dataset.insurance = costBreakdown.insurance || 0;
        loanDataElement.dataset.maintenance = costBreakdown.maintenance || 0;
        loanDataElement.dataset.fuel = costBreakdown.fuel || 0;
        loanDataElement.dataset.warranty = costBreakdown.warranty || 0;
    }
    
    if (loanDetailsElement && loanDetails) {
        loanDetailsElement.dataset.loanAmount = loanDetails.loanAmount || 0;
        loanDetailsElement.dataset.interestRate = loanDetails.interestRate || 0;
        loanDetailsElement.dataset.monthlyPayment = loanDetails.monthlyPayment || 0;
        loanDetailsElement.dataset.loanTerm = loanDetails.loanTerm || 0;
        loanDetailsElement.dataset.isAffordable = loanDetails.isAffordable || false;
        loanDetailsElement.dataset.recommendedMaxPayment = loanDetails.recommendedMaxPayment || 0;
    }
};