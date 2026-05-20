const mongoose = require('mongoose');
const { Schema } = mongoose;

const CategorySchema = new Schema({
  name:        { type: String, required: true },
  slug:        { type: String, unique: true },
  parentId:    { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  icon:        String, // Lucide icon name
  description: String,
  order:       Number,
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);
