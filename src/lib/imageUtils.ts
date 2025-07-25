// Image utilities for quiz application
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  compressedDataUrl?: string;
  originalSize: number;
  compressedSize?: number;
}

export interface ImageCompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxSizeKB: number;
  format: 'webp' | 'jpeg' | 'png';
}

export const DEFAULT_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxWidth: 1200,
  maxHeight: 800,
  quality: 0.8,
  maxSizeKB: 500, // 500KB max
  format: 'webp'
};

export const OPTION_IMAGE_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxWidth: 400,
  maxHeight: 300,
  quality: 0.85,
  maxSizeKB: 100, // 100KB max for option images
  format: 'webp'
};

/**
 * Validates and compresses an image file
 */
export const validateAndCompressImage = async (
  file: File,
  options: ImageCompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<ImageValidationResult> => {
  try {
    // Basic file validation
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        error: 'File must be an image',
        originalSize: file.size,
      };
    }

    const originalSizeKB = file.size / 1024;
    
    // Check if file is already small enough
    if (originalSizeKB <= options.maxSizeKB) {
      const dataUrl = await fileToDataUrl(file);
      return {
        isValid: true,
        compressedDataUrl: dataUrl,
        originalSize: file.size,
        compressedSize: file.size,
      };
    }

    // Compress the image
    const compressedDataUrl = await compressImage(file, options);
    const compressedSize = getDataUrlSize(compressedDataUrl);
    const compressedSizeKB = compressedSize / 1024;

    // Check if compression was successful
    if (compressedSizeKB > options.maxSizeKB * 1.1) { // Allow 10% tolerance
      return {
        isValid: false,
        error: `Image is too large (${Math.round(compressedSizeKB)}KB). Maximum allowed is ${options.maxSizeKB}KB.`,
        originalSize: file.size,
        compressedSize,
      };
    }

    return {
      isValid: true,
      compressedDataUrl,
      originalSize: file.size,
      compressedSize,
    };

  } catch (error) {
    console.error('Image validation/compression error:', error);
    return {
      isValid: false,
      error: 'Failed to process image. Please try a different image.',
      originalSize: file.size,
    };
  }
};

/**
 * Compresses an image file
 */
export const compressImage = (
  file: File,
  options: ImageCompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not supported'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const { width: newWidth, height: newHeight } = calculateNewDimensions(
        img.width,
        img.height,
        options.maxWidth,
        options.maxHeight
      );

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw and compress
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to desired format
      const mimeType = `image/${options.format}`;
      const compressedDataUrl = canvas.toDataURL(mimeType, options.quality);

      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Convert file to data URL for loading
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a file to data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Calculates new dimensions while maintaining aspect ratio
 */
export const calculateNewDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Scale down if necessary
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Gets the approximate size of a data URL in bytes
 */
export const getDataUrlSize = (dataUrl: string): number => {
  // Remove the data URL prefix to get just the base64 data
  const base64Data = dataUrl.split(',')[1] || '';
  
  // Calculate size: each base64 character represents 6 bits, so 4 chars = 3 bytes
  // Add padding compensation
  const padding = (base64Data.match(/=/g) || []).length;
  return Math.floor((base64Data.length * 3) / 4) - padding;
};

/**
 * Validates image dimensions
 */
export const validateImageDimensions = (
  width: number,
  height: number,
  maxWidth: number = 2000,
  maxHeight: number = 2000
): { isValid: boolean; error?: string } => {
  if (width > maxWidth || height > maxHeight) {
    return {
      isValid: false,
      error: `Image dimensions too large (${width}x${height}). Maximum allowed is ${maxWidth}x${maxHeight}.`,
    };
  }

  if (width < 10 || height < 10) {
    return {
      isValid: false,
      error: 'Image is too small. Minimum size is 10x10 pixels.',
    };
  }

  return { isValid: true };
};

/**
 * Preloads an image to check if it's valid
 */
export const preloadImage = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

/**
 * Creates a thumbnail from an image
 */
export const createThumbnail = async (
  imageDataUrl: string,
  size: number = 100
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not supported'));
      return;
    }

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;

      // Draw image to fit in square, maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio > 1) {
        drawHeight = size / aspectRatio;
        offsetY = (size - drawHeight) / 2;
      } else {
        drawWidth = size * aspectRatio;
        offsetX = (size - drawWidth) / 2;
      }

      // Fill background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // Draw image
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
    img.src = imageDataUrl;
  });
};

/**
 * Batch process multiple images
 */
export const batchProcessImages = async (
  files: File[],
  options: ImageCompressionOptions = DEFAULT_COMPRESSION_OPTIONS,
  onProgress?: (completed: number, total: number) => void
): Promise<ImageValidationResult[]> => {
  const results: ImageValidationResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await validateAndCompressImage(files[i], options);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return results;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get image info from data URL
 */
export const getImageInfo = (dataUrl: string): Promise<{
  width: number;
  height: number;
  size: number;
  format: string;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = getDataUrlSize(dataUrl);
      const format = dataUrl.split(';')[0].split('/')[1] || 'unknown';
      
      resolve({
        width: img.width,
        height: img.height,
        size,
        format,
      });
    };
    img.onerror = () => reject(new Error('Failed to get image info'));
    img.src = dataUrl;
  });
}; 