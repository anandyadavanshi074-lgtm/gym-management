const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPlan',
    required: true
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRING SOON', 'EXPIRED'],
    default: 'ACTIVE'
  }
}, { timestamps: true });

// Dynamic status calculator helper
membershipSchema.methods.getCalculatedStatus = function () {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'EXPIRED', daysRemaining: 0 };
  } else if (diffDays <= 7) {
    return { status: 'EXPIRING SOON', daysRemaining: diffDays };
  } else {
    return { status: 'ACTIVE', daysRemaining: diffDays };
  }
};

module.exports = mongoose.model('Membership', membershipSchema);
