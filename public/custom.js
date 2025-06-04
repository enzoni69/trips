// Custom JavaScript to help with navigation visibility
document.addEventListener('DOMContentLoaded', function() {
  // Add current path as data attribute to body
  const path = window.location.pathname;
  document.body.setAttribute('data-path', path);
  
  // If on admin page, we'll show the navigation
  // Otherwise it will be hidden via CSS
});