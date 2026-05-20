const mongoose = require('mongoose');
const { Schema } = mongoose;

const InquiryCartSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    variantSku: String,
    quantity:  { type: Number, default: 1 },
  }],
  status: {
    type: String,
    enum: ['active', 'inquired', 'replied', 'converted_to_sale', 'closed'],
    default: 'active',
  },
  saleDetails: { amount: Number, date: Date },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.InquiryCart || mongoose.model('InquiryCart', InquiryCartSchema);
