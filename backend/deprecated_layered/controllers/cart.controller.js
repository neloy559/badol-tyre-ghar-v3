const { InquiryCart } = require('../models');
const { sendSuccess, sendError } = require('../utils/sendResponse');

// GET /api/v1/cart
exports.getCart = async (req, res) => {
  try {
    let cart = await InquiryCart.findOne({ userId: req.user._id, status: 'active' })
      .populate('items.productId', 'name slug media commonSpecs variants brand');
    if (!cart) cart = { items: [] };
    sendSuccess(res, 200, 'Cart fetched.', cart);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// POST /api/v1/cart/add
exports.addToCart = async (req, res) => {
  try {
    const { productId, variantSku, quantity = 1 } = req.body;
    if (!productId || !variantSku) return sendError(res, 400, 'productId and variantSku required.');

    let cart = await InquiryCart.findOne({ userId: req.user._id, status: 'active' });
    if (!cart) cart = await InquiryCart.create({ userId: req.user._id, items: [] });

    const existing = cart.items.find(
      (i) => i.productId.toString() === productId && i.variantSku === variantSku
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ productId, variantSku, quantity });
    }
    cart.updatedAt = new Date();
    await cart.save();

    sendSuccess(res, 200, 'Item added to quote list.', cart);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// DELETE /api/v1/cart/remove
exports.removeFromCart = async (req, res) => {
  try {
    const { productId, variantSku } = req.body;
    const cart = await InquiryCart.findOne({ userId: req.user._id, status: 'active' });
    if (!cart) return sendError(res, 404, 'Cart not found.');

    cart.items = cart.items.filter(
      (i) => !(i.productId.toString() === productId && i.variantSku === variantSku)
    );
    cart.updatedAt = new Date();
    await cart.save();
    sendSuccess(res, 200, 'Item removed.', cart);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// POST /api/v1/cart/submit  ← User confirms WhatsApp sent
exports.submitInquiry = async (req, res) => {
  try {
    const { productId, variantSku } = req.body;
    let cart = await InquiryCart.findOne({ userId: req.user._id, status: 'active' });

    // Fallback: If cart is empty but user clicked "Order Now" on a specific product detail page
    if (!cart && productId && variantSku) {
      cart = await InquiryCart.create({
        userId: req.user._id,
        items: [{ productId, variantSku, quantity: 1 }],
        status: 'active'
      });
    }

    if (!cart || cart.items.length === 0) return sendError(res, 400, 'Cart is empty.');

    cart.status    = 'inquired';
    cart.updatedAt = new Date();
    await cart.save();

    // Increment inquiry meta on each product
    const { Product } = require('../models');
    const ids = cart.items.map((i) => i.productId);
    await Product.updateMany({ _id: { $in: ids } }, { $inc: { 'meta.inquiries': 1 } });

    sendSuccess(res, 200, 'Inquiry submitted successfully.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
