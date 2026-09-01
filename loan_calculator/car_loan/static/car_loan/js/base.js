// Base template JavaScript functionality
// CSRF Token for all AJAX requests
const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                  document.querySelector('meta[name=csrf-token]')?.getAttribute('content') || '';

// Make CSRF token globally available
window.csrfToken = csrfToken;

// Global helper function to get CSRF cookie
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

// Global CSRF setup for fetch requests
window.setupCSRF = function() {
    return {
        'X-CSRFToken': csrfToken || getCookie('csrftoken'),
        'X-Requested-With': 'XMLHttpRequest'
    };
};