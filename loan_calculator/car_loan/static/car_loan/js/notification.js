document.addEventListener('DOMContentLoaded', () => {
    const notificationBadge = document.getElementById('notificationBadge');

    notificationBadge.addEventListener('click', () => {
        alert('You have no new notifications.');
    });
});