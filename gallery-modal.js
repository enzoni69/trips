
/**
 * Gallery Enhancement with Lightbox Modal
 * Safe solution that works with existing tour gallery without breaking React
 */

console.log("🖼️ Loading gallery enhancement...");

let currentImageIndex = 0;
let currentImages = [];
let modal = null;

function createLightboxModal() {
  if (modal) return modal;
  
  modal = document.createElement('div');
  modal.className = 'gallery-lightbox-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
  `;
  
  modal.innerHTML = `
    <div class="lightbox-content" style="
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <button class="lightbox-prev" style="
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.6);
        color: white;
        border: none;
        border-radius: 4px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        touch-action: manipulation;
        user-select: none;
      ">‹</button>
      
      <img class="lightbox-image" style="
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        pointer-events: none;
      ">
      
      <button class="lightbox-next" style="
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.6);
        color: white;
        border: none;
        border-radius: 4px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        touch-action: manipulation;
        user-select: none;
      ">›</button>
      
      <button class="lightbox-close" style="
        position: absolute;
        top: -45px;
        right: 0;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 18px;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
      ">×</button>
      
      <div class="lightbox-counter" style="
        position: absolute;
        bottom: -40px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.9);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: bold;
      "></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners with better touch support
  const closeBtn = modal.querySelector('.lightbox-close');
  const prevBtn = modal.querySelector('.lightbox-prev');
  const nextBtn = modal.querySelector('.lightbox-next');
  
  // Close button
  closeBtn.addEventListener('click', closeLightbox);
  closeBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    closeLightbox();
  });
  
  // Previous button
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showPrevImage();
  });
  prevBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPrevImage();
  });
  
  // Next button
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showNextImage();
  });
  nextBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showNextImage();
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrevImage();
      if (e.key === 'ArrowRight') showNextImage();
    }
  });
  
  return modal;
}

function openLightbox(images, startIndex = 0) {
  currentImages = images;
  currentImageIndex = startIndex;
  
  if (!modal) createLightboxModal();
  
  updateLightboxImage();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function showPrevImage() {
  currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
  updateLightboxImage();
}

function showNextImage() {
  currentImageIndex = (currentImageIndex + 1) % currentImages.length;
  updateLightboxImage();
}

function updateLightboxImage() {
  if (!modal || !currentImages.length) return;
  
  const img = modal.querySelector('.lightbox-image');
  const counter = modal.querySelector('.lightbox-counter');
  const prevBtn = modal.querySelector('.lightbox-prev');
  const nextBtn = modal.querySelector('.lightbox-next');
  
  img.src = currentImages[currentImageIndex];
  counter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
  
  // Show/hide navigation buttons
  prevBtn.style.display = currentImages.length > 1 ? 'flex' : 'none';
  nextBtn.style.display = currentImages.length > 1 ? 'flex' : 'none';
}

function enhanceGalleryImages() {
  // Find all gallery sections and make images clickable
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          enhanceImagesInNode(node);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Enhance existing images
  enhanceImagesInNode(document.body);
}

function enhanceImagesInNode(node) {
  // Look for ALL images in the document that could be tour images
  const images = node.querySelectorAll ? 
    node.querySelectorAll('img[src*="http"], img[src*="data:"], img[src^="/"], img[src^="./"]') : [];
  
  images.forEach(img => {
    if (img.dataset.galleryEnhanced) return;
    
    // Skip if it's obviously not a tour image (logo, icons, etc.)
    if (img.src.includes('logo') || img.width < 50 || img.height < 50) return;
    
    img.dataset.galleryEnhanced = 'true';
    
    // Find parent container - be more aggressive in finding containers
    const container = img.closest(`
      .tour-card, 
      [class*="grid"], 
      [class*="gallery"], 
      [data-value="gallery"],
      [class*="tour"], 
      .card,
      [role="tabpanel"],
      [class*="aspect-"],
      div[class*="grid"],
      div[class*="cols-"]
    `) || img.closest('div') || img.parentElement;
    
    if (!container) return;
    
    // Make image clickable with stronger styles
    img.style.cursor = 'pointer';
    img.style.transition = 'transform 0.2s ease';
    img.style.userSelect = 'none';
    img.style.touchAction = 'manipulation';
    
    // Add visual feedback for clickability
    img.style.border = '2px solid transparent';
    
    // Hover effects
    img.addEventListener('mouseover', () => {
      if (window.innerWidth > 768) { // Only on desktop
        img.style.transform = 'scale(1.03)';
        img.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      }
    });
    
    img.addEventListener('mouseout', () => {
      img.style.transform = 'scale(1)';
      img.style.borderColor = 'transparent';
    });
    
    // Click handler with touch support
    const openGallery = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Look for images in the wider container area
      let searchContainer = container;
      // Try to find a larger container for group/private tour sections
      const largerContainer = img.closest('.tour-card, [role="tabpanel"], .card, [class*="grid-cols"]');
      if (largerContainer) {
        searchContainer = largerContainer;
      }
      
      // Collect all images from the container
      const allImages = Array.from(searchContainer.querySelectorAll('img'))
        .map(i => i.src)
        .filter(src => src && 
          !src.includes('logo') && 
          !src.includes('placeholder') && 
          !src.includes('placehold') &&
          !src.includes('icon') &&
          src.length > 10
        );
      
      const clickedIndex = allImages.indexOf(img.src);
      
      if (allImages.length > 0) {
        openLightbox(allImages, Math.max(0, clickedIndex));
      }
    };
    
    img.addEventListener('click', openGallery);
    img.addEventListener('touchend', (e) => {
      e.preventDefault();
      openGallery(e);
    });
    
    // Add mobile tap feedback
    img.addEventListener('touchstart', () => {
      if (window.innerWidth <= 768) {
        img.style.opacity = '0.8';
      }
    });
    
    img.addEventListener('touchcancel', () => {
      img.style.opacity = '1';
    });
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', enhanceGalleryImages);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  enhanceGalleryImages();
}

console.log("✅ Gallery enhancement loaded successfully");
