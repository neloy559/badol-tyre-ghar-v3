const jwt  = require('jsonwebtoken');
const User = require('../modules/users/user.model');

module.exports = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.btg_token) {
      token = req.cookies.btg_token;
    }

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (user && !user.isDeleted) req.user = user;
  } catch (_) {}
  next();
};
