    /*
 * Clickable Transparency Library
 * --------------------------------
 * This script enables non-transparent parts of an image to be clickable.
 * It works for both <img> elements and any element with a background image.
 * For any element with the "alpha-mask-events" class:
 *  - It changes the mouse cursor to 'pointer' over non-transparent areas and 'default' over transparent areas.
 *  - It prevents click propagation if a transparent area is clicked.
 *
 * Usage:
 * 1. Add the "alpha-mask-events" class to your elements.
 *    For <img> elements, use the src attribute.
 *    For other elements, set a background-image in CSS.
 *
 * Example for <img>:
 * <img src="your-image.png" alt="Your Image" class="alpha-mask-events">
 *
 * Example for a background element:
 * <div class="HYPE_element alpha-mask-events"
 *      style="background-image: url('your-image.png'); background-size: 100% 100%; width: 253px; height: 226px;">
 * </div>
 * Note: this is meant for Tumult Hype. 
 */

// Threshold for “transparent enough” (α ≤ 0.1)
const TRANSPARENCY_THRESHOLD = 0.999;

(function() {
  const registry = [];

  // Note: The CanvasSettings object also has a willReadFrequently boolean.
  // When a CanvasSettings object's willReadFrequently is true, the user agent
  // may optimize the canvas for readback operations.
  //
  // We pass { willReadFrequently: true } to getContext so that reading pixels
  // back (via getImageData) is as efficient as possible.
  
  // 1) Gather every .alpha-mask-events and build its off‑screen canvas:
  document.querySelectorAll('.alpha-mask-events').forEach(el => {
    let src, natW, natH;

    if (el.tagName === 'IMG') {
      src  = el.src;
      natW = el.naturalWidth;
      natH = el.naturalHeight;
    } else {
      const bg = getComputedStyle(el).backgroundImage.match(/url\(([^)]+)\)/);
      if (!bg) return;
      src = bg[1].replace(/['"]/g,'');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const w = natW || img.naturalWidth;
      const h = natH || img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      // create context optimized for frequent readbacks:
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      registry.push({ el, canvas, ctx });
    };
  });

  // 2) On every pointer/touch event, sample the pixel and toggle pointer-events:
  function hitTest(e) {
    const x = e.clientX, y = e.clientY;
    registry.forEach(({ el, canvas, ctx }) => {
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
        // outside → restore normal behavior
        el.style.pointerEvents = 'auto';
        return;
      }
      // inside → map to canvas pixels
      const px = Math.floor((x - r.left) * canvas.width  / r.width);
      const py = Math.floor((y - r.top ) * canvas.height / r.height);
      const alpha = ctx.getImageData(px, py, 1, 1).data[3] / 255;

      if (alpha <= TRANSPARENCY_THRESHOLD) {
        el.style.pointerEvents = 'none';   // click falls through
      } else {
        el.style.pointerEvents = 'auto';   // click catches here
      }
    });
  }

  // 3) Use Pointer Events where supported (covers mouse/touch), else fall back:
  if (window.PointerEvent) {
    document.addEventListener('pointermove', hitTest, { passive: true });
    document.addEventListener('pointerdown', hitTest, { passive: true });
  } else {
    document.addEventListener('touchmove', hitTest, { passive: true });
    document.addEventListener('touchstart', hitTest, { passive: true });
  }
})();