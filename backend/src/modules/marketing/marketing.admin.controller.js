const Campaign = require('./campaign.model');
const { AuditLog } = require('../ops/models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

const audit = (adminId, action, targetId, oldValue, newValue) =>
  AuditLog.create({ adminId, action, targetId, details: { oldValue, newValue } });

exports.createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);
    await audit(req.user._id, 'CREATE_CAMPAIGN', campaign._id, null, req.body);
    sendSuccess(res, 201, 'Campaign created.', campaign);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    sendSuccess(res, 200, 'Campaigns fetched.', campaigns);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) return sendError(res, 404, 'Campaign not found.');
    await audit(req.user._id, 'UPDATE_CAMPAIGN', campaign._id, null, req.body);
    sendSuccess(res, 200, 'Campaign updated.', campaign);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
