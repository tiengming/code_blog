(function() {
  // 灯箱插件
  class Lightbox {
    constructor(options = {}) {
      this.options = Object.assign({
        animationDuration: 300,
        closeOnOverlayClick: true,
        onOpen: null,
        onClose: null,
        onNavigate: null
      }, options);

      this.images = [];
      this.currentIndex = 0;
      this.isOpen = false;
      this.isZoomed = false;
      this.zoomLevel = 1;
      this.touchStartX = 0;
      this.touchEndX = 0;
      this.wheelTimer = null;
      this.initialPinchDistance = 0;

      this.init();
    }

    init() {
      this.createStyles();
      this.createLightbox();
      this.bindEvents();
    }

    createStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .lb-lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          transition: opacity ${this.options.animationDuration}ms ease;
          pointer-events: none;
        }
        .lb-lightbox-overlay.active {
          pointer-events: auto;
        }
        .lb-lightbox-content-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        .lb-lightbox-container {
          max-width: 90%;
          max-height: 90%;
          position: relative;
          transition: transform ${this.options.animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        .lb-lightbox-image {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: transform ${this.options.animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${this.options.animationDuration}ms ease;
        }
        .lb-lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(255, 255, 255, 0.8);
          color: #333;
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          font-size: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .lb-lightbox-nav:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: translateY(-50%) scale(1.1);
        }
        .lb-lightbox-nav:active {
          transform: translateY(-50%) scale(0.9);
        }
        .lb-lightbox-nav::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: currentColor;
          opacity: 0.2;
          transition: opacity 0.3s ease;
        }
        .lb-lightbox-nav:hover::before {
          opacity: 0.3;
        }
        .lb-lightbox-prev {
          left: 20px;
        }
        .lb-lightbox-next {
          right: 20px;
        }
        .lb-lightbox-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background-color: rgba(255, 255, 255, 0.8);
          color: #333;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .lb-lightbox-close:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }
        .lb-lightbox-close:active {
          transform: scale(0.9);
        }
        .lb-lightbox-close::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: currentColor;
          opacity: 0.2;
          transition: opacity 0.3s ease;
        }
        .lb-lightbox-close:hover::before {
          opacity: 0.3;
        }
        .lb-lightbox-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 4px solid #fff;
          animation: lb-spin 1s linear infinite;
        }
        @keyframes lb-spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @media (max-width: 768px) {
          .lb-lightbox-nav {
            width: 40px;
            height: 40px;
            font-size: 20px;
          }
          .lb-lightbox-close {
            width: 35px;
            height: 35px;
            font-size: 20px;
          }
        }
        @media (prefers-color-scheme: dark) {
          .lb-lightbox-overlay {
            background-color: rgba(0, 0, 0, 0.9);
          }
          .lb-lightbox-nav,
          .lb-lightbox-close {
            background-color: rgba(50, 50, 50, 0.8);
            color: #fff;
          }
          .lb-lightbox-nav:hover,
          .lb-lightbox-close:hover {
            background-color: rgba(70, 70, 70, 1);
          }
          .lb-lightbox-image {
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);
          }
        }
      `;
      document.head.appendChild(style);
    }

    createLightbox() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'lb-lightbox-overlay';
      this.overlay.style.zIndex = '-1';
      this.overlay.setAttribute('role', 'dialog');
      this.overlay.setAttribute('aria-label', 'Image lightbox');

      this.contentWrapper = document.createElement('div');
      this.contentWrapper.className = 'lb-lightbox-content-wrapper';

      this.container = document.createElement('div');
      this.container.className = 'lb-lightbox-container';

      this.image = document.createElement('img');
      this.image.className = 'lb-lightbox-image';

      this.prevButton = document.createElement('button');
      this.prevButton.className = 'lb-lightbox-nav lb-lightbox-prev';
      this.prevButton.innerHTML = '&#10094;';
      this.prevButton.setAttribute('aria-label', 'Previous image');

      this.nextButton = document.createElement('button');
      this.nextButton.className = 'lb-lightbox-nav lb-lightbox-next';
      this.nextButton.innerHTML = '&#10095;';
      this.nextButton.setAttribute('aria-label', 'Next image');

      this.closeButton = document.createElement('button');
      this.closeButton.className = 'lb-lightbox-close';
      this.closeButton.innerHTML = '&times;';
      this.closeButton.setAttribute('aria-label', 'Close lightbox');

      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'lb-lightbox-loading';
      this.loadingIndicator.style.display = 'none';

      this.container.appendChild(this.image);
      this.contentWrapper.appendChild(this.container);
      this.contentWrapper.appendChild(this.prevButton);
      this.contentWrapper.appendChild(this.nextButton);
      this.contentWrapper.appendChild(this.closeButton);
      this.contentWrapper.appendChild(this.loadingIndicator);

      this.overlay.appendChild(this.contentWrapper);

      document.body.appendChild(this.overlay);
    }

    bindEvents() {
      document.addEventListener('click', this.handleImageClick.bind(this), true);
      this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
      this.prevButton.addEventListener('click', this.showPreviousImage.bind(this));
      this.nextButton.addEventListener('click', this.showNextImage.bind(this));
      this.closeButton.addEventListener('click', this.close.bind(this));
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.overlay.addEventListener('wheel', this.handleWheel.bind(this));
      this.overlay.addEventListener('touchstart', this.handleTouchStart.bind(this));
      this.overlay.addEventListener('touchmove', this.handleTouchMove.bind(this));
      this.overlay.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleImageClick(event) {
      const clickedImage = event.target.closest('img');
      if (clickedImage && !this.isOpen) {
        event.preventDefault();
        event.stopPropagation();
        this.images = Array.from(document.querySelectorAll('.markdown-body img'));
        this.currentIndex = this.images.indexOf(clickedImage);
        this.open();
      }
    }

    handleOverlayClick(event) {
      if (event.target === this.overlay && this.options.closeOnOverlayClick) {
        this.close();
      } else if (!event.target.closest('.lb-lightbox-container')) {
        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        if (elementBelow) {
          elementBelow.click();
        }
      }
    }

    handleKeyDown(event) {
      if (!this.isOpen) return;

      switch (event.key) {
        case 'ArrowLeft':
          this.showPreviousImage();
          break;
        case 'ArrowRight':
          this.showNextImage();
          break;
        case 'Escape':
          this.close();
          break;
        case 'Tab':
          event.preventDefault();
          const focusableElements = this.overlay.querySelectorAll('button');
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
            } else {
              (document.activeElement.previousElementSibling || lastElement).focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
            } else {
              (document.activeElement.nextElementSibling || firstElement).focus();
            }
          }
          break;
      }
    }

    handleWheel(event) {
      event.preventDefault();
      clearTimeout(this.wheelTimer);

      this.wheelTimer = setTimeout(() => {
        const delta = Math.sign(event.deltaY);
        if (delta > 0) {
          this.showNextImage();
        } else {
          this.showPreviousImage();
        }
      }, 50);
    }

    handleTouchStart(event) {
      if (event.touches.length === 2) {
        this.initialPinchDistance = this.getPinchDistance(event);
      } else {
        this.touchStartX = event.touches[0].clientX;
      }
    }

    handleTouchMove(event) {
      if (event.touches.length === 2) {
        const currentPinchDistance = this.getPinchDistance(event);
        const scale = currentPinchDistance / this.initialPinchDistance;
        this.zoom(scale - 1);
      } else {
        this.touchEndX = event.touches[0].clientX;
      }
    }

    handleTouchEnd() {
      if (this.touchStartX && this.touchEndX) {
        const difference = this.touchStartX - this.touchEndX;
        if (Math.abs(difference) > 50) {
          if (difference > 0) {
            this.showNextImage();
          } else {
            this.showPreviousImage();
          }
        }
      }
      this.touchStartX = 0;
      this.touchEndX = 0;
    }

    getPinchDistance(event) {
      return Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
    }

    open() {
      this.isOpen = true;
      this.overlay.style.zIndex = '10000';
      this.overlay.classList.add('active');
      this.showImage();
      this.overlay.style.opacity = '1';
      document.body.style.overflow = 'hidden';
      if (typeof this.options.onOpen === 'function') {
        this.options.onOpen();
      }
    }

    close() {
      this.isOpen = false;
      this.overlay.style.opacity = '0';
      this.overlay.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => {
        this.image.style.transform = '';
        this.zoomLevel = 1;
        this.isZoomed = false;
        setTimeout(() => {
          this.overlay.style.zIndex = '-1';
        }, 50);
      }, this.options.animationDuration);
      if (typeof this.options.onClose === 'function') {
        this.options.onClose();
      }
    }

    showPreviousImage() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.showImage();
      }
    }

    showNextImage() {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++;
        this.showImage();
      }
    }
    showImage() {
      const imgSrc = this.images[this.currentIndex].src;
      this.image.style.opacity = '0';
      this.showLoadingIndicator();
      
      const newImage = new Image();
      newImage.src = imgSrc;
      newImage.onload = () => {
        this.hideLoadingIndicator();
        this.image.src = imgSrc;
        this.image.style.opacity = '1';
      };

      this.prevButton.style.display = this.currentIndex > 0 ? '' : 'none';
      this.nextButton.style.display = this.currentIndex < this.images.length - 1 ? '' : 'none';

      if (typeof this.options.onNavigate === 'function') {
        this.options.onNavigate(this.currentIndex);
      }

      this.preloadImages();
    }

    zoom(factor) {
      const targetZoom = Math.max(1, Math.min(this.zoomLevel + factor, 3));
      const animate = () => {
        this.zoomLevel += (targetZoom - this.zoomLevel) * 0.1;
        this.image.style.transform = `scale(${this.zoomLevel})`;
        if (Math.abs(targetZoom - this.zoomLevel) > 0.01) {
          requestAnimationFrame(animate);
        } else {
          this.zoomLevel = targetZoom;
          this.image.style.transform = `scale(${this.zoomLevel})`;
        }
      };
      requestAnimationFrame(animate);
      this.isZoomed = this.zoomLevel !== 1;
    }

    preloadImages() {
      const preloadNext = (this.currentIndex + 1) % this.images.length;
      const preloadPrev = (this.currentIndex - 1 + this.images.length) % this.images.length;
      new Image().src = this.images[preloadNext].src;
      new Image().src = this.images[preloadPrev].src;
    }

    showLoadingIndicator() {
      this.loadingIndicator.style.display = 'block';
    }

    hideLoadingIndicator() {
      this.loadingIndicator.style.display = 'none';
    }
  }

  // 将 Lightbox 类添加到全局对象
  window.Lightbox = Lightbox;

  // 自动初始化
  document.addEventListener('DOMContentLoaded', () => {
    new Lightbox();
  });
})();
