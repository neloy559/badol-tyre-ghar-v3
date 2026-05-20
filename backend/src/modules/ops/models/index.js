const mongoose = require('mongoose');
const { Schema } = mongoose;

// Shop Schema
const ShopSchema = new Schema({
  branchName:  { type: String, required: true },
  managerName: String,
  phone:       { type: String, required: true },
  district:    String,
  address:     String,
  mapLink:     String, // Google Maps URL
  isMainBranch:{ type: Boolean, default: false },
}, { timestamps: true });

// Audit Log Schema
const AuditLogSchema = new Schema({
  adminId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action:   { type: String, required: true },
  targetId: Schema.Types.ObjectId,
  details: {
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
  },
}, { timestamps: true });

// Activity Log Schema
const ActivityLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: String,
  path:   String,
  ip:     String,
  meta:   Schema.Types.Mixed,
}, { timestamps: true });

// Redirect Schema
const RedirectSchema = new Schema({
  oldPath:    { type: String, unique: true, required: true },
  newPath:    { type: String, required: true },
  statusCode: { type: Number, default: 301 },
});

module.exports = {
  Shop:        mongoose.models.Shop        || mongoose.model('Shop', ShopSchema),
  AuditLog:     mongoose.models.AuditLog     || mongoose.model('AuditLog', AuditLogSchema),
  ActivityLog:  mongoose.models.ActivityLog  || mongoose.model('ActivityLog', ActivityLogSchema),
  Redirect:     mongoose.models.Redirect     || mongoose.model('Redirect', RedirectSchema),
};
