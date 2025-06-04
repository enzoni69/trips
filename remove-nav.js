// Wait for page to load, then remove navigation
document.addEventListener('DOMContentLoaded', function() {
    // Function to remove navigation elements
    function removeNavigation() {
        // Find and remove all navigation elements
        const selectors = [
            'header',
            'nav', 
            '.nav',
            '.navigation',
            '.main-nav',
            '[role="banner"]',
            'a[href="/"]', // Home link
            'a[href="/private"]', // Private Tours link  
            'a[href="/join"]', // Group Tours link
            'a[href="/build"]' // Design Tour link
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.remove();
            });
        });
        
        // Also remove any buttons with navigation text
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            const text = button.textContent;
            if (text.includes('Home') || text.includes('Private Tours') || 
                text.includes('Group Tours') || text.includes('Design Tour')) {
                button.style.display = 'none';
                button.remove();
            }
        });
    }
    
    // Run immediately
    removeNavigation();
    
    // Run again after a short delay for React
    setTimeout(removeNavigation, 500);
    setTimeout(removeNavigation, 1000);
});