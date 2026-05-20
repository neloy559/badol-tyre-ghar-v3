const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  phone:              { type: String, unique: true, required: true },
  password:           { type: String, required: true, select: false }, // Hashed (bcryptjs)
  role:               { type: String, enum: ['admin', 'editor', 'sales_partner', 'dealer', 'customer'], default: 'customer' },
  isVerified:         { type: Boolean, default: false }, // Manual Admin Approval for B2B
  isDeleted:          { type: Boolean, default: false }, // Soft Delete
  discountMultiplier: { type: Number, default: 1.0 },    // e.g., 0.95 = 5% extra off
  creditLimit:        { type: Number, default: 0 },      // B2B credit in BDT
  paymentTerms:       { type: String, default: 'Cash' }, // e.g., '7 Days', 'Net 30'
  verificationDetails: {
    tradeLicense: String, // ImgBB / Cloudinary URL
    shopImage:    String, // ImgBB / Cloudinary URL
    appliedAt:    Date,
  },
  profile: {
    name:      String,
    shopName:  String,
    address:   String,
    district:  String,
  },
  analytics: {
    deviceType: String, // 'premium', 'mid', 'budget'
    lastIp:     String,
    location:   Object,
    lastActive: Date,
  },
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
