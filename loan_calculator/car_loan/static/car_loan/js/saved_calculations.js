// Saved Calculations Page JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize CSRF token for AJAX requests
    const csrfToken = getCookie('csrftoken') || window.csrfToken;
    
    // Function to get cookie value
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

    // Delete calculation functionality
    const deleteButtons = document.querySelectorAll('.delete-calculation');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            const calculationId = this.dataset.id;
            const calculationRow = this.closest('tr') || this.closest('.calculation-item');

            console.log('Delete button clicked. Calculation ID:', calculationId);

            if (!calculationId) {
                console.error('No calculation ID found');
                return;
            }

            // Show confirmation dialog
            if (!confirm('Are you sure you want to delete this calculation?')) {
                return;
            }

            // Show loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
            this.disabled = true;

            const url = `/delete/${calculationId}/`;
            console.log('Sending DELETE request to:', url);

            // Make AJAX request to delete
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                credentials: 'same-origin'
            })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Remove the row with animation
                    if (calculationRow) {
                        calculationRow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        calculationRow.style.opacity = '0';
                        calculationRow.style.transform = 'translateX(-100%)';

                        setTimeout(() => {
                            calculationRow.remove();

                            // Check if there are any calculations left
                            const remainingCalculations = document.querySelectorAll('.calculation-item, tbody tr:not(.no-calculations)');
                            if (remainingCalculations.length === 0) {
                                showNoCalculationsMessage();
                            }
                        }, 300);
                    }

                    // Show success message
                    showNotification('Calculation deleted successfully!', 'success');
                } else {
                    console.error('Delete failed - server response:', data);
                    throw new Error(data.error || 'Failed to delete calculation');
                }
            })
            .catch(error => {
                console.error('Error deleting calculation:', error);
                console.error('Full error details:', error.toString());

                // Restore button state
                this.innerHTML = originalText;
                this.disabled = false;

                // Show error message
                showNotification('Failed to delete calculation. Please try again.', 'error');
            });
        });
    });

    // Function to show no calculations message
    function showNoCalculationsMessage() {
        const container = document.querySelector('.calculations-container') || document.querySelector('tbody') || document.querySelector('.table-container');
        
        if (container) {
            const noCalculationsHTML = `
                <div class="text-center py-5 no-calculations">
                    <i class="bi bi-calculator display-1 text-muted mb-3"></i>
                    <h4 class="text-muted">No Saved Calculations</h4>
                    <p class="text-muted">You haven't saved any loan calculations yet.</p>
                    <a href="/car_loan/calculator/" class="btn btn-primary">
                        <i class="bi bi-plus-circle"></i> Create New Calculation
                    </a>
                </div>
            `;
            
            if (container.tagName === 'TBODY') {
                const table = container.closest('table');
                const noCalcDiv = document.createElement('div');
                noCalcDiv.innerHTML = noCalculationsHTML;
                noCalcDiv.className = 'col-12';
                table.parentNode.replaceChild(noCalcDiv, table);
            } else {
                container.innerHTML = noCalculationsHTML;
            }
        }
    }

    // Function to show notification
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

    // View calculation details functionality
    const viewButtons = document.querySelectorAll('.view-calculation');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const calculationId = this.dataset.id;
            if (calculationId) {
                window.location.href = `/car_loan/calculation/${calculationId}/`;
            }
        });
    });

    // Export functionality (if needed)
    const exportButton = document.getElementById('exportCalculations');
    if (exportButton) {
        exportButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Show loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="bi bi-hourglass-split"></i> Exporting...';
            this.disabled = true;
            
            // Make request to export endpoint
            fetch('/car_loan/export-calculations/', {
                method: 'GET',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Export failed');
                }
                return response.blob();
            })
            .then(blob => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `car_loan_calculations_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showNotification('Calculations exported successfully!', 'success');
            })
            .catch(error => {
                console.error('Export error:', error);
                showNotification('Failed to export calculations.', 'error');
            })
            .finally(() => {
                // Restore button state
                this.innerHTML = originalText;
                this.disabled = false;
            });
        });
    }

    // Search/filter functionality
    const searchInput = document.getElementById('searchCalculations');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const calculationRows = document.querySelectorAll('tbody tr:not(.no-calculations), .calculation-item');
            
            calculationRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const shouldShow = text.includes(searchTerm);
                row.style.display = shouldShow ? '' : 'none';
            });
        });
    }

    // Sort functionality
    const sortButtons = document.querySelectorAll('[data-sort]');
    if (sortButtons.length > 0) {
        let currentSort = { field: 'date', direction: 'desc' };
        
        sortButtons.forEach(button => {
            button.addEventListener('click', function() {
                const field = this.dataset.sort;
                const direction = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
                
                sortCalculations(field, direction);
                updateSortIndicators(field, direction);
                
                currentSort = { field, direction };
            });
        });
        
        function sortCalculations(field, direction) {
            const tbody = document.querySelector('tbody');
            if (!tbody) return;
            
            const rows = Array.from(tbody.querySelectorAll('tr:not(.no-calculations)'));
            
            rows.sort((a, b) => {
                let aVal, bVal;
                
                switch(field) {
                    case 'date':
                        aVal = new Date(a.querySelector('.date-cell')?.textContent || '');
                        bVal = new Date(b.querySelector('.date-cell')?.textContent || '');
                        break;
                        case 'amount':
                            aVal = parseFloat(a.querySelector('.amount-cell')?.textContent.replace(/[₹$,\s]/g, '') || '0');
                            bVal = parseFloat(b.querySelector('.amount-cell')?.textContent.replace(/[₹$,\s]/g, '') || '0');
                        break;
                    case 'payment':
                            aVal = parseFloat(a.querySelector('.payment-cell')?.textContent.replace(/[₹$,\s]/g, '') || '0');
                            bVal = parseFloat(b.querySelector('.payment-cell')?.textContent.replace(/[₹$,\s]/g, '') || '0');
                        break;
                    default:
                        aVal = a.textContent;
                        bVal = b.textContent;
                }
                
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                return 0;
            });
            
            rows.forEach(row => tbody.appendChild(row));
        }
        
        function updateSortIndicators(field, direction) {
            sortButtons.forEach(button => {
                const icon = button.querySelector('i');
                if (button.dataset.sort === field) {
                    icon.className = direction === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
                } else {
                    icon.className = 'bi bi-arrow-up-down';
                }
            });
        }
    }

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Copy to clipboard functionality
    window.copyToClipboard = function(elementId) {
        const copyText = document.getElementById(elementId);
        if (!copyText) return;
        
        copyText.select();
        copyText.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand("copy");
        
        // Show tooltip feedback
        const tooltip = new bootstrap.Tooltip(copyText.nextElementSibling, {
            title: "Copied!",
            trigger: "manual"
        });
        tooltip.show();
        
        setTimeout(() => {
            tooltip.hide();
        }, 1000);
    };

    // Save calculation functionality
    window.saveCalculation = function(calculationData) {
        // Use window.savedCalculationsUrl if set by template, otherwise fallback
        const saveUrl = window.savedCalculationsUrl || '/car_loan/saved-calculations/';
        
        fetch(saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(calculationData),
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
                // Show success message
                const toast = document.getElementById('saveToast');
                if (toast && typeof bootstrap !== 'undefined') {
                    const bsToast = new bootstrap.Toast(toast);
                    bsToast.show();
                } else {
                    showNotification('Calculation saved successfully!', 'success');
                }
                
                // Optionally update the UI
                if (window.location.pathname.includes('saved-calculations')) {
                    // Reload the page to show the new calculation
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } else {
                throw new Error(data.error || 'Failed to save calculation');
            }
        })
        .catch(error => {
            console.error('Error saving calculation:', error);
            showNotification('Failed to save calculation. Please try again.', 'error');
        });
    };
});