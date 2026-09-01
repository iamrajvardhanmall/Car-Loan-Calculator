// Google Authentication JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Google Sign-In configuration
    let googleAuth = null;
    const GOOGLE_CLIENT_ID = '622648339812-lgq9ttle7hekorda7na987tmudft6525.apps.googleusercontent.com'; // Google OAuth2 Client ID
    
    // Initialize Google Sign-In
    function initGoogleAuth() {
        if (typeof gapi !== 'undefined') {
            gapi.load('auth2', function() {
                googleAuth = gapi.auth2.init({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: 'profile email'
                });
                
                // Attach click handlers to Google Sign-In buttons
                attachGoogleSignInHandlers();
            });
        } else {
            console.warn('Google API not loaded. Google Sign-In will not be available.');
        }
    }

    // Attach event handlers to Google Sign-In buttons
    function attachGoogleSignInHandlers() {
        const googleSignInButtons = document.querySelectorAll('.google-signin-btn, #google-signin-button');
        
        googleSignInButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                handleGoogleSignIn(this);
            });
        });
    }

    // Handle Google Sign-In
    function handleGoogleSignIn(button) {
        if (!googleAuth) {
            showNotification('Google Sign-In is not available. Please try again later.', 'error');
            return;
        }
        
        // Show loading state
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Connecting to Google...';
        button.disabled = true;
        
        googleAuth.signIn({
            prompt: 'select_account'
        }).then(function(googleUser) {
            const profile = googleUser.getBasicProfile();
            const idToken = googleUser.getAuthResponse().id_token;
            
            // Send token to Django backend
            sendGoogleTokenToBackend(idToken, profile);
            
        }).catch(function(error) {
            console.error('Google Sign-In error:', error);
            
            // Restore button state
            button.innerHTML = originalText;
            button.disabled = false;
            
            if (error.error === 'popup_closed_by_user') {
                showNotification('Sign-in was cancelled.', 'warning');
            } else {
                showNotification('Google Sign-In failed. Please try again.', 'error');
            }
        });
    }

    // Send Google token to Django backend
    function sendGoogleTokenToBackend(idToken, profile) {
        const csrfToken = getCookie('csrftoken') || window.csrfToken;
        
        fetch('/car_loan/google-auth/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                id_token: idToken,
                email: profile.getEmail(),
                name: profile.getName(),
                picture: profile.getImageUrl()
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Redirect to dashboard or intended page
                const redirectUrl = data.redirect_url || '/car_loan/dashboard/';
                window.location.href = redirectUrl;
            } else {
                throw new Error(data.error || 'Authentication failed');
            }
        })
        .catch(error => {
            console.error('Backend authentication error:', error);
            showNotification('Authentication failed. Please try again.', 'error');
            
            // Restore button states
            const googleButtons = document.querySelectorAll('.google-signin-btn, #google-signin-button');
            googleButtons.forEach(btn => {
                btn.innerHTML = btn.innerHTML.replace(/.*Connecting.*/, '<i class="bi bi-google me-2"></i>Sign in with Google');
                btn.disabled = false;
            });
        });
    }

    // Alternative: Handle Google One Tap (if implemented)
    function initGoogleOneTap() {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleOneTapResponse,
                auto_select: false,
                cancel_on_tap_outside: false
            });
            
            // Display One Tap if user is not signed in
            const isUserSignedIn = document.body.classList.contains('user-authenticated');
            if (!isUserSignedIn) {
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        console.log('Google One Tap not displayed:', notification.getNotDisplayedReason());
                    }
                });
            }
        }
    }

    function handleGoogleOneTapResponse(response) {
        // Send credential to backend
        const csrfToken = getCookie('csrftoken') || window.csrfToken;
        
        fetch('/car_loan/google-one-tap/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                credential: response.credential
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const redirectUrl = data.redirect_url || '/car_loan/dashboard/';
                window.location.href = redirectUrl;
            } else {
                throw new Error(data.error || 'One Tap authentication failed');
            }
        })
        .catch(error => {
            console.error('One Tap authentication error:', error);
            showNotification('Authentication failed. Please try again.', 'error');
        });
    }

    // Handle sign out
    function handleGoogleSignOut() {
        if (googleAuth) {
            googleAuth.signOut().then(function() {
                console.log('User signed out from Google.');
                // Redirect to login page or home
                window.location.href = '/car_loan/login/';
            }).catch(function(error) {
                console.error('Sign out error:', error);
            });
        }
    }

    // Attach sign out handler if sign out button exists
    const signOutButton = document.getElementById('google-signout-button');
    if (signOutButton) {
        signOutButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleGoogleSignOut();
        });
    }

    // Handle traditional form registration/login alongside Google auth
    const traditionalForms = document.querySelectorAll('#loginForm, #registrationForm');
    traditionalForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // Show loading state on submit button
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
                submitButton.disabled = true;
                
                // Restore button if form submission takes too long
                setTimeout(() => {
                    if (submitButton.disabled) {
                        submitButton.innerHTML = originalText;
                        submitButton.disabled = false;
                    }
                }, 10000);
            }
        });
    });

    // Handle privacy policy and terms links
    const privacyLinks = document.querySelectorAll('a[href*="privacy"], a[href*="terms"]');
    privacyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Open in new tab for better UX
            if (!this.target) {
                e.preventDefault();
                window.open(this.href, '_blank', 'noopener,noreferrer');
            }
        });
    });

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

    // Check if Google API script is loaded, then initialize
    function checkGoogleAPIAndInit() {
        if (typeof gapi !== 'undefined') {
            initGoogleAuth();
        } else {
            // Wait for Google API to load
            const checkInterval = setInterval(() => {
                if (typeof gapi !== 'undefined') {
                    clearInterval(checkInterval);
                    initGoogleAuth();
                }
            }, 100);
            
            // Stop checking after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('Google API failed to load within 10 seconds.');
            }, 10000);
        }
        
        // Also check for Google One Tap API
        if (typeof google !== 'undefined' && google.accounts) {
            initGoogleOneTap();
        }
    }

    // Initialize when DOM is ready
    checkGoogleAPIAndInit();

    // Handle page visibility change (for security)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is now hidden - could implement session timeout warnings
        } else {
            // Page is now visible - could refresh session status
        }
    });

    // Global functions that can be called from templates
    window.GoogleAuth = {
        signIn: handleGoogleSignIn,
        signOut: handleGoogleSignOut,
        init: initGoogleAuth
    };
});