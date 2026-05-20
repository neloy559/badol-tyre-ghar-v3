/**
 * 🖼️ Optimized Cloudinary Utility for BTG V3
 * Handles dynamic transformations to ensure high performance, auto-formats (AVIF/WebP),
 * and consistent 1:1 aspect ratio padding.
 */

export const CLOUDINARY_PRESETS = {
  CARD:  { width: 400, square: true, quality: 'auto' }, // Product Grid
  THUMB: { width: 150, square: true, quality: 'auto' }, // Gallery Thumbnails / Cart
  HERO:  { width: 800, square: true, quality: 'auto' }, // Product Detail Main
  RAW:   { quality: 'auto' },                            // Original size, optimized
  BLUR:  { width: 20, square: true, quality: 10 },       // Tiny blur placeholder
};

/**
 * Generates a transformed Cloudinary URL.
 * @param {string} url - Original URL from database.
 * @param {Object} options - Transformation options (width, square, quality).
 */
export const getCloudinaryUrl = (url, options = CLOUDINARY_PRESETS.CARD) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const baseUrl = url.substring(0, uploadIndex + 8); 
  const imagePath = url.substring(uploadIndex + 8);

  const transforms = [];

  // Use f_auto to let Cloudinary choose AVIF > WebP > JPG based on browser
  transforms.push('f_auto');
  
  // Smart crop with white padding to ensure 1:1 ratio
  if (options.square) {
    transforms.push('c_pad');
    transforms.push('b_white'); 
  }

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  
  // Always use q_auto for intelligent compression
  transforms.push(options.quality ? `q_${options.quality}` : 'q_auto');

  const transformString = transforms.length > 0 ? transforms.join(',') + '/' : '';

  return `${baseUrl}${transformString}${imagePath}`;
};

/**
 * Generates a tiny blurred Cloudinary URL for the blur-up technique.
 * Returns a 20px wide, quality-10 version with heavy blur applied.
 * @param {string} url - Original URL from database.
 */
export const getBlurUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;

  const baseUrl = url.substring(0, uploadIndex + 8);
  const imagePath = url.substring(uploadIndex + 8);

  // Tiny, heavily blurred, low quality placeholder
  return `${baseUrl}f_auto,c_pad,b_white,w_20,q_10,e_blur:500/${imagePath}`;
};

export default getCloudinaryUrl;
