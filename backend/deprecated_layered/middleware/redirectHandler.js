const { Redirect } = require('../models');

// Checks every incoming request against the Redirect collection
// If a match is found, responds with the configured status code
module.exports = async (req, res, next) => {
  try {
    const redirect = await Redirect.findOne({ oldPath: req.path });
    if (redirect) {
      return res.redirect(redirect.statusCode, redirect.newPath);
    }
  } catch (_) { /* never block on redirect lookup failure */ }
  next();
};
