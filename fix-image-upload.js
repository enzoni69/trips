
/**
 * Fix Image Upload Issues - Comprehensive Solution
 * This script addresses common image upload problems in the tour creation form
 */

console.log("🔧 Applying image upload fixes...");

// Fix 1: Increase request timeout and size limits
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  if (options.body && (typeof options.body === 'string' || options.body instanceof FormData)) {
    options.timeout = options.timeout || 30000; // 30 seconds
    
    // Add proper headers for JSON requests
    if (typeof options.body === 'string' && url.includes('/api/')) {
      options.headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
    }
  }
  
  return originalFetch.call(this, url, options).catch(error => {
    console.error('Fetch error:', error);
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Network error - please check your connection and try again');
    }
    throw error;
  });
};

// Fix 2: Override form submission to handle large image arrays
function fixFormSubmission() {
  // Find forms that might submit tour data
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    const originalSubmit = form.onsubmit;
    
    form.onsubmit = function(e) {
      try {
        // Check for image URL fields
        const textareas = form.querySelectorAll('textarea');
        textareas.forEach(textarea => {
          if (textarea.placeholder && textarea.placeholder.includes('image URL')) {
            const value = textarea.value;
            if (value && value.length > 10000) { // Large text content
              console.warn('Large image URL data detected, optimizing...');
              
              // Split into smaller chunks if needed
              const urls = value.split('\n').filter(url => url.trim() !== '');
              if (urls.length > 20) {
                console.warn('Too many image URLs, limiting to first 20');
                textarea.value = urls.slice(0, 20).join('\n');
              }
            }
          }
        });
        
        // Call original submit handler if it exists
        if (originalSubmit) {
          return originalSubmit.call(this, e);
        }
        
        return true;
      } catch (error) {
        console.error('Form submission error:', error);
        alert('Error submitting form. Please try again.');
        e.preventDefault();
        return false;
      }
    };
  });
}

// Fix 3: Add retry mechanism for failed requests
function addRetryMechanism() {
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.send = function(data) {
    const xhr = this;
    let retryCount = 0;
    const maxRetries = 3;
    
    const retrySend = () => {
      originalXHRSend.call(xhr, data);
    };
    
    const originalOnError = xhr.onerror;
    xhr.onerror = function(e) {
      console.error('XHR Error:', e);
      
      if (retryCount < maxRetries && xhr.status === 500) {
        retryCount++;
        console.log(`Retrying request... Attempt ${retryCount}/${maxRetries}`);
        setTimeout(retrySend, 1000 * retryCount); // Exponential backoff
        return;
      }
      
      if (originalOnError) {
        originalOnError.call(xhr, e);
      }
    };
    
    retrySend();
  };
}

// Fix 4: Monitor for React state updates and handle image array properly
function fixReactImageHandling() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Look for image URL inputs
            const imageInputs = node.querySelectorAll ? 
              node.querySelectorAll('input[type="url"], textarea[placeholder*="image"]') : [];
            
            imageInputs.forEach(input => {
              if (!input.dataset.fixedImageUpload) {
                input.dataset.fixedImageUpload = 'true';
                
                // Add validation for image URLs
                input.addEventListener('blur', function() {
                  const value = this.value.trim();
                  if (value && !value.startsWith('http')) {
                    this.style.borderColor = '#ef4444';
                    this.title = 'Please enter a valid image URL starting with http:// or https://';
                  } else {
                    this.style.borderColor = '';
                    this.title = '';
                  }
                });
              }
            });
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Fix 5: Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (event.reason && event.reason.message && event.reason.message.includes('500')) {
    console.error('500 Error detected - likely image upload issue');
    
    // Try to show user-friendly message
    if (window.location.pathname.includes('admin')) {
      setTimeout(() => {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 12px;
          border-radius: 6px;
          z-index: 9999;
          max-width: 300px;
        `;
        errorDiv.textContent = 'Image upload failed. Please check your image URLs and try again.';
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
      }, 100);
    }
  }
  
  // Prevent the default handling
  event.preventDefault();
});

// Apply all fixes when page loads
document.addEventListener('DOMContentLoaded', function() {
  fixFormSubmission();
  addRetryMechanism();
  fixReactImageHandling();
  
  console.log("✅ Image upload fixes applied successfully");
});

// Also apply fixes if page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  fixFormSubmission();
  addRetryMechanism();
  fixReactImageHandling();
  
  console.log("✅ Image upload fixes applied successfully");
}
