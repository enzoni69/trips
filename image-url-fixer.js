/**
 * Direct Fix for Image URL Input - Adds Individual Input Boxes
 * This replaces the problematic textarea with individual URL inputs + Add button
 */

console.log("🔧 Fixing image URL interface...");

// URL validation function
function isValidImageUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function createImageUrlInterface() {
  let checkCount = 0;
  const maxChecks = 30;
  
  function findAndReplaceTextarea() {
    // Check if we already created the interface
    if (document.querySelector('.image-url-container')) {
      console.log("✅ Image URL interface already exists, skipping");
      return;
    }
    
    // Find the problematic textarea
    const textarea = document.querySelector('textarea[placeholder*="image URL"]');
    
    if (!textarea && checkCount < maxChecks) {
      checkCount++;
      setTimeout(findAndReplaceTextarea, 500);
      return;
    }
    
    if (!textarea) {
      console.log("❌ Could not find image URL textarea");
      return;
    }
    
    console.log("✅ Found image URL textarea, replacing with better interface");
    
    // Get current URLs from textarea
    let currentUrls = [];
    if (textarea.value) {
      currentUrls = textarea.value.split('\n').filter(url => url.trim() !== '');
    }
    
    // Create new container
    const container = document.createElement('div');
    container.className = 'image-url-container';
    container.style.cssText = `
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px;
      background: #f9fafb;
      min-height: 80px;
    `;
    
    // Create inputs container
    const inputsContainer = document.createElement('div');
    inputsContainer.className = 'image-url-inputs';
    
    // Function to create a single URL input
    function createUrlInput(value = '', isFirst = false) {
      const inputWrapper = document.createElement('div');
      inputWrapper.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
      
      const input = document.createElement('input');
      input.type = 'url';
      input.value = value;
      input.placeholder = isFirst ? 'Enter first image URL...' : 'Enter another image URL...';
      input.style.cssText = `
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 14px;
      `;
      
      // Create remove button (only if not the first input)
      if (!isFirst) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = `
          padding: 8px 12px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        `;
        removeBtn.onclick = () => {
          inputWrapper.remove();
          updateTextarea();
        };
        inputWrapper.appendChild(removeBtn);
      }
      
      // Update textarea when input changes with debouncing
      let timeoutId;
      input.addEventListener('input', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updateTextarea, 100);
      });
      
      // Also update on blur for immediate response
      input.addEventListener('blur', updateTextarea);
      
      // Validate URL format
      input.addEventListener('blur', function() {
        const url = this.value.trim();
        if (url && !isValidImageUrl(url)) {
          this.style.borderColor = '#ef4444';
          this.title = 'Please enter a valid image URL';
        } else {
          this.style.borderColor = '#d1d5db';
          this.title = '';
        }
      });
      
      inputWrapper.insertBefore(input, inputWrapper.firstChild);
      return inputWrapper;
    }
    
    // Function to update the original textarea (hidden)
    function updateTextarea() {
      const inputs = container.querySelectorAll('input[type="url"]');
      const urls = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(url => url !== '');
      
      // Update the original textarea value using React's way
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      nativeInputValueSetter.call(textarea, urls.join('\n'));
      
      // Trigger multiple events to ensure React picks up the change
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        Object.defineProperty(event, 'target', { writable: false, value: textarea });
        textarea.dispatchEvent(event);
      });
      
      // Also trigger a synthetic React event
      setTimeout(() => {
        if (textarea._valueTracker) {
          textarea._valueTracker.setValue('');
        }
        const syntheticEvent = new Event('input', { bubbles: true });
        textarea.dispatchEvent(syntheticEvent);
      }, 0);
    }
    
    // Add current URLs as inputs
    if (currentUrls.length === 0) {
      inputsContainer.appendChild(createUrlInput('', true));
    } else {
      currentUrls.forEach((url, index) => {
        inputsContainer.appendChild(createUrlInput(url, index === 0));
      });
    }
    
    // Create "Add Another URL" button
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = '+ Add Another Image URL';
    addButton.style.cssText = `
      padding: 8px 16px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 8px;
    `;
    addButton.onclick = () => {
      const newInput = createUrlInput();
      inputsContainer.appendChild(newInput);
      
      // Focus on the new input
      const input = newInput.querySelector('input[type="url"]');
      setTimeout(() => input.focus(), 0);
      
      updateTextarea();
    };
    
    // Create help text
    const helpText = document.createElement('p');
    helpText.textContent = 'Add multiple image URLs using the button above. Each URL should be a direct link to an image.';
    helpText.style.cssText = `
      margin: 8px 0 0 0;
      font-size: 12px;
      color: #6b7280;
    `;
    
    // Assemble the interface
    container.appendChild(inputsContainer);
    container.appendChild(addButton);
    container.appendChild(helpText);
    
    // Hide original textarea and insert new interface
    textarea.style.display = 'none';
    textarea.parentNode.insertBefore(container, textarea.nextSibling);
    
    // Monitor for external changes to textarea (from React)
    const observer = new MutationObserver(() => {
      const currentValue = textarea.value;
      const currentUrls = currentValue ? currentValue.split('\n').filter(url => url.trim() !== '') : [];
      const inputUrls = Array.from(container.querySelectorAll('input[type="url"]'))
        .map(input => input.value.trim())
        .filter(url => url !== '');
      
      // Sync if they don't match
      if (JSON.stringify(currentUrls) !== JSON.stringify(inputUrls)) {
        syncInputsWithTextarea(currentUrls);
      }
    });
    
    observer.observe(textarea, { attributes: true, attributeFilter: ['value'] });
    
    // Function to sync inputs with textarea value
    function syncInputsWithTextarea(urls) {
      const inputsContainer = container.querySelector('.image-url-inputs');
      inputsContainer.innerHTML = '';
      
      if (urls.length === 0) {
        inputsContainer.appendChild(createUrlInput('', true));
      } else {
        urls.forEach((url, index) => {
          inputsContainer.appendChild(createUrlInput(url, index === 0));
        });
      }
    }
    
    console.log("✅ Image URL interface updated with individual inputs and Add button");
  }
  
  findAndReplaceTextarea();
}

// Run when page loads - only once
let hasRun = false;

function runOnce() {
  if (hasRun) return;
  hasRun = true;
  createImageUrlInterface();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runOnce);
} else {
  runOnce();
}

// Also run when navigating to admin page - but only if not already run
setTimeout(() => {
  if (!hasRun) runOnce();
}, 2000);