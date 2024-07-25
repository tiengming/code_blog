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
      this.touchStartY = 0;
      this.wheelTimer = null;

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
          overflow: hidden;
        }
        .lb-lightbox-image-wrapper {
          max-height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(150, 150, 150, 0.5) transparent;
        }
        .lb-lightbox-image-wrapper::-webkit-scrollbar {
          width: 6px;
        }
        .lb-lightbox-image-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .lb-lightbox-image-wrapper::-webkit-scrollbar-thumb {
          background-color: rgba(150, 150, 150, 0.5);
          border-radius: 3px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .lb-lightbox-image {
          max-width: 100%;
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
        }
        .lb-lightbox-nav:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: translateY(-50%) scale(1.1);
        }
        .lb-lightbox-nav:active {
          transform: translateY(-50%) scale(0.9);
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
        }
        .lb-lightbox-close:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }
        .lb-lightbox-close:active {
          transform: scale(0.9);
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
          .lb-lightbox-image-wrapper::-webkit-scrollbar-thumb {
            background-color: rgba(200, 200, 200, 0.5);
          }
        }
      `;
      document.head.appendChild(style);
    }

    createLightbox() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'lb-lightbox-overlay';
      this.overlay.style.zIndex = '-1';

      this.contentWrapper = document.createElement('div');
      this.contentWrapper.className = 'lb-lightbox-content-wrapper';

      this.container = document.createElement('div');
      this.container.className = 'lb-lightbox-container';

      this.imageWrapper = document.createElement('div');
      this.imageWrapper.className = 'lb-lightbox-image-wrapper';

      this.image = document.createElement('img');
      this.image.className = 'lb-lightbox-image';

      this.prevButton = document.createElement('button');
      this.prevButton.className = 'lb-lightbox-nav lb-lightbox-prev';
      this.prevButton.innerHTML = '&#10094;';

      this.nextButton = document.createElement('button');
      this.nextButton.className = 'lb-lightbox-nav lb-lightbox-next';
      this.nextButton.innerHTML = '&#10095;';

      this.closeButton = document.createElement('button');
      this.closeButton.className = 'lb-lightbox-close';
      this.closeButton.innerHTML = '&times;';

      this.imageWrapper.appendChild(this.image);
      this.container.appendChild(this.imageWrapper);
      this.contentWrapper.appendChild(this.container);
      this.contentWrapper.appendChild(this.prevButton);
      this.contentWrapper.appendChild(this.nextButton);
      this.contentWrapper.appendChild(this.closeButton);

      this.overlay.appendChild(this.contentWrapper);

      document.body.appendChild(this.overlay);
      this.closeButton.addEventListener('click', this.close.bind(this));
    }

    bindEvents() {
      // 使用箭头函数简化this绑定
      document.addEventListener('click', this.handleImageClick.bind(this), true);
      this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
      this.prevButton.addEventListener('click', this.showPreviousImage.bind(this));
      this.nextButton.addEventListener('click', this.showNextImage.bind(this));
      this.closeButton.addEventListener('click', this.close.bind(this));
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.overlay.addEventListener('wheel', this.handleWheel.bind(this));
      // 触摸事件优化和解绑将在handleTouchEnd中实现
      this.overlay.addEventListener('touchstart', this.handleTouchStart.bind(this));
      this.overlay.addEventListener('touchmove', this.handleTouchMove.bind(this));
      this.overlay.addEventListener('touchend', this.handleTouchEnd.bind(this));
      // 无障碍性改进：设置按钮类型
      this.prevButton.setAttribute('type', 'button');
      this.nextButton.setAttribute('type', 'button');
      this.closeButton.setAttribute('type', 'button');
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
      this.touchStartX = event.touches[0].clientX;
    }

    handleTouchMove(event) {
      this.touchEndX = event.touches[0].clientX;
    }

    handleTouchEnd() {
      document.removeEventListener('touchmove', this.handleTouchMove);
      const difference = this.touchStartX - this.touchEndX;
      if (Math.abs(difference) > 50) {
        if (difference > 0) {
          this.showNextImage();
        } else {
          this.showPreviousImage();
        }
      }
    }

    handleImageScroll(event) {
      event.stopPropagation();
    }

    handleImageTouchStart(event) {
      this.touchStartY = event.touches[0].clientY;
    }

    handleImageTouchMove(event) {
      const touchEndY = event.touches[0].clientY;
      const deltaY = this.touchStartY - touchEndY;

      if (Math.abs(deltaY) > 5) {
        event.preventDefault();
        this.imageWrapper.scrollTop += deltaY;
        this.touchStartY = touchEndY;
      }
    }

    handleImageTouchEnd() {
      this.touchStartY = null;
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
      // 在关闭时解绑事件处理器以避免内存泄漏
      document.removeEventListener('click', this.handleImageClick, true);
      this.overlay.removeEventListener('click', this.handleOverlayClick);
      this.prevButton.removeEventListener('click', this.showPreviousImage);
      this.nextButton.removeEventListener('click', this.showNextImage);
      this.closeButton.removeEventListener('click', this.close);
      document.removeEventListener('keydown', this.handleKeyDown);
      this.overlay.removeEventListener('wheel', this.handleWheel);
      this.overlay.removeEventListener('touchstart', this.handleTouchStart);

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
      
      const newImage = new Image();
      newImage.src = imgSrc;
      newImage.onload = () => {
        this.image.src = imgSrc;
        this.image.style.opacity = '1';
        this.imageWrapper.scrollTop = 0;
        
        // 检查图片是否需要滚动
        setTimeout(() => {
          if (this.image.offsetHeight > this.imageWrapper.offsetHeight) {
            this.imageWrapper.style.overflowY = 'auto';
          } else {
            this.imageWrapper.style.overflowY = 'hidden';
          }
        }, 50);
      };

      this.prevButton.style.display = this.currentIndex > 0 ? '' : 'none';
      this.nextButton.style.display = this.currentIndex < this.images.length - 1 ? '' : 'none';

      if (typeof this.options.onNavigate === 'function') {
        this.options.onNavigate(this.currentIndex);
      }

      this.preloadImages();
    }

    preloadImages() {
      const preloadNext = (this.currentIndex + 1) % this.images.length;
      const preloadPrev = (this.currentIndex - 1 + this.images.length) % this.images.length;
      new Image().src = this.images[preloadNext].src;
      new Image().src = this.images[preloadPrev].src;
    }
  }

  // 将 Lightbox 类添加到全局对象
  window.Lightbox = Lightbox;

  // 自动初始化
  document.addEventListener('DOMContentLoaded', () => {
    new Lightbox();
  });
})();
