const cloudinary = require('../config/cloudinary');
const { sendResponse, sendError } = require('../utils/sendResponse');
const streamifier = require('streamifier');

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No image file provided.');
    }

    // Use streamifier to upload directly from memory buffer
    const streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'btg_v3_products',
            // If it's a product image, we don't necessarily apply transformations here
            // Cloudinary URL builder handles them on-the-fly, but we can set a max size if needed.
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req);

    return sendResponse(res, 200, 'Image uploaded successfully.', {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return sendError(res, 500, 'Failed to upload image to Cloudinary.');
  }
};
