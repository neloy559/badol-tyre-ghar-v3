const cloudinary = require('../../config/cloudinary');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

exports.uploadImage = async (req, res) => {
  try {
    let imagesToUpload = [];
    
    // 1. Check for files from Multer (multipart/form-data)
    if (req.files && req.files.length > 0) {
      imagesToUpload = req.files.map(file => {
        const b64 = file.buffer.toString('base64');
        return `data:${file.mimetype};base64,${b64}`;
      });
    } 
    // 2. Check for base64 strings in body (JSON) - More reliable for Vercel
    else if (req.body.images && Array.isArray(req.body.images)) {
      imagesToUpload = req.body.images;
    } 
    else if (req.body.image) {
      imagesToUpload = [req.body.image];
    }

    if (imagesToUpload.length === 0) {
      return sendError(res, 400, 'No image data provided.');
    }

    const uploadPromises = imagesToUpload.map((dataUri) => {
      // Detect if it's a PDF (data:application/pdf or data:application/octet-stream)
      const isPdf = dataUri.startsWith('data:application/pdf') || dataUri.includes('application/pdf');
      return cloudinary.uploader.upload(dataUri, {
        folder: isPdf ? 'btg_v3_catalogs' : 'btg_v3_products',
        resource_type: isPdf ? 'raw' : 'image',
        access_mode: 'public',
        type: 'upload',
      });
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map((r) => r.secure_url);

    return sendSuccess(res, 200, 'Images uploaded successfully.', {
      urls,
      url: urls[0], // backward compat
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return sendError(res, 500, `Failed to upload images to Cloudinary: ${error.message || 'Unknown error'}`);
  }
};
