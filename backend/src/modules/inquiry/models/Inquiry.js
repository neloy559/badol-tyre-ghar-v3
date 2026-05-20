const mongoose = require('mongoose');
const { Schema } = mongoose;

const InquirySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Null for guests
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: {
      sku:         String,
      ply:         String,
      designModel: String,
      price:       Number,
    },
    quantity: { type: Number, default: 1 },
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['inquired', 'replied', 'converted_to_sale', 'closed'], 
    default: 'inquired' 
  },
  saleDetails: {
    amount: { type: Number },
    date:   { type: Date },
  },
  meta: {
    ip:        String,
    userAgent: String,
    platform:  { type: String, default: 'whatsapp' }
  }
}, { timestamps: true });

module.exports = mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema);
