const { Redirect } = require('../modules/ops/models');

module.exports = async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  try {
    const redirect = await Redirect.findOne({ oldPath: req.path });
    if (redirect) {
      return res.redirect(redirect.statusCode, redirect.newPath);
    }
  } catch (_) {}
  next();
};
