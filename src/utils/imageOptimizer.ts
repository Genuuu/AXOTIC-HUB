/**
 * Lightweight Client-Side Image Optimization Utility
 * Performs client-side resizing and format conversion (WebP/JPEG)
 * on uploaded images before saving to reduce data transfer payloads.
 */

export interface OptimizeImageOptions {
  /** Maximum width/height boundary (default 640px) */
  maxBounds?: number;
  /** Image compression quality from 0.1 to 1.0 (default 0.65) */
  quality?: number;
  /** Target image format (default 'image/webp') */
  format?: 'image/webp' | 'image/jpeg';
}

/**
 * Optimizes an image File or Data URL asynchronously using HTML5 Canvas.
 * Downscales dimensions to maxBounds (640px) and converts to compressed WebP data URL.
 */
export async function optimizeImage(
  fileOrDataUrl: File | string,
  options: OptimizeImageOptions = {}
): Promise<string> {
  const { maxBounds = 640, quality = 0.65, format = 'image/webp' } = options;

  return new Promise((resolve, reject) => {
    const processImg = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxBounds) {
            height = Math.round((height * maxBounds) / width);
            width = maxBounds;
          }
        } else {
          if (height > maxBounds) {
            width = Math.round((width * maxBounds) / height);
            height = maxBounds;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP data URL (or fallback to JPEG if webp isn't produced)
        let dataUrl = canvas.toDataURL(format, quality);
        if (format === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    if (fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImg(img);
        img.onerror = () => reject(new Error("Failed to load image file."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(fileOrDataUrl);
    } else if (typeof fileOrDataUrl === 'string') {
      const img = new Image();
      img.onload = () => processImg(img);
      img.onerror = () => reject(new Error("Failed to load image string."));
      img.src = fileOrDataUrl;
    } else {
      reject(new Error("Invalid image input provided."));
    }
  });
}
