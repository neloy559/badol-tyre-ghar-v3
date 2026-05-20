import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'b2b', 'customer', 'guest'], 
    default: 'customer' 
  },
  isVerified: { type: Boolean, default: false }, // For B2B verification
  shopName: String,
  district: String,
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  brand: String,
  size: String,
  spec: String,
  image: String,
  retailPrice: { type: Number, default: 0 },
  wholesalePrice: { type: Number, default: 0 }, // For carton-wise B2B
  stock: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  ctaType: { type: String, default: 'wa' },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
