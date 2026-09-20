const express = require('express');
const router = express.Router();
const { isAuthenticated, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');

// All admin routes require admin role
router.use(isAuthenticated, requireRole('admin'));

// Helper to determine status and days remaining
function calculateMembershipStatus(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'EXPIRED', daysRemaining: 0 };
  } else if (diffDays <= 7) {
    return { status: 'EXPIRING SOON', daysRemaining: Math.max(0, diffDays) };
  } else {
    return { status: 'ACTIVE', daysRemaining: diffDays };
  }
}

// GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalTrainers = await User.countDocuments({ role: 'trainer' });
    const members = await User.find({ role: 'member' }).lean();
    const totalMembers = members.length;

    // Today's Attendance count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayAttendanceCount = await Attendance.countDocuments({
      date: { $gte: startOfToday, $lte: endOfToday }
    });

    // Fetch all memberships with member and plan populated
    const memberships = await Membership.find()
      .populate('memberId')
      .populate('planId')
      .populate('trainerId')
      .sort({ expiryDate: 1 })
      .lean();

    let activeMembersCount = 0;
    let expiredMembersCount = 0;
    const expiringSoonList = [];

    // Map each membership with calculated status
    memberships.forEach(m => {
      if (!m.memberId || !m.planId) return;
      const { status, daysRemaining } = calculateMembershipStatus(m.expiryDate);
      m.computedStatus = status;
      m.daysRemaining = daysRemaining;

      if (status === 'EXPIRED') {
        expiredMembersCount++;
      } else {
        activeMembersCount++;
        if (status === 'EXPIRING SOON') {
          expiringSoonList.push({
            memberName: m.memberId.name,
            memberEmail: m.memberId.email,
            planName: m.planId.name,
            expiryDate: new Date(m.expiryDate).toLocaleDateString(),
            daysRemaining
          });
        }
      }
    });

    // Plan-wise Member Count
    const plans = await MembershipPlan.find().lean();
    const planCounts = plans.map(p => {
      const count = memberships.filter(
        m => m.planId && m.planId._id.toString() === p._id.toString()
      ).length;
      return {
        name: p.name,
        duration: p.duration,
        price: p.price,
        count
      };
    });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - Gym Management',
      stats: {
        totalMembers,
        activeMembers: activeMembersCount,
        expiredMembers: expiredMembersCount,
        todayAttendance: todayAttendanceCount,
        totalTrainers
      },
      expiringSoonList,
      planCounts
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Error loading dashboard: ' + err.message);
  }
});

// GET /admin/plans - Manage plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await MembershipPlan.find().sort({ price: 1 }).lean();
    res.render('admin/plans', {
      title: 'Membership Plans - Gym Management',
      plans
    });
  } catch (err) {
    console.error('Plans page error:', err);
    res.status(500).send('Error loading plans: ' + err.message);
  }
});

// POST /admin/plans - Create new plan
router.post('/plans', async (req, res) => {
  try {
    const { name, duration, price } = req.body;
    if (!name || !duration || !price) {
      return res.redirect('/admin/plans?error=' + encodeURIComponent('All fields are required'));
    }

    const newPlan = new MembershipPlan({
      name: name.trim(),
      duration: parseInt(duration, 10),
      price: parseFloat(price)
    });

    await newPlan.save();
    res.redirect('/admin/plans?success=' + encodeURIComponent('Membership plan created successfully!'));
  } catch (err) {
    console.error('Create plan error:', err);
    res.redirect('/admin/plans?error=' + encodeURIComponent('Error creating plan: ' + err.message));
  }
});

// GET /admin/members - Manage Members, Assign Plan & Trainer
router.get('/members', async (req, res) => {
  try {
    const members = await User.find({ role: 'member' }).sort({ createdAt: -1 }).lean();
    const trainers = await User.find({ role: 'trainer' }).sort({ name: 1 }).lean();
    const plans = await MembershipPlan.find().sort({ price: 1 }).lean();

    // Get current membership records
    const memberships = await Membership.find()
      .populate('planId')
      .populate('trainerId')
      .lean();

    // Map memberships to members
    const memberData = members.map(member => {
      const membership = memberships.find(
        m => m.memberId.toString() === member._id.toString()
      );

      let statusInfo = { status: 'NO PLAN', daysRemaining: 0 };
      if (membership && membership.expiryDate) {
        statusInfo = calculateMembershipStatus(membership.expiryDate);
      }

      return {
        ...member,
        membership: membership || null,
        status: membership ? statusInfo.status : 'NO PLAN',
        daysRemaining: statusInfo.daysRemaining
      };
    });

    res.render('admin/members', {
      title: 'Manage Members - Gym Management',
      members: memberData,
      trainers,
      plans
    });
  } catch (err) {
    console.error('Members page error:', err);
    res.status(500).send('Error loading members: ' + err.message);
  }
});

// POST /admin/members/assign-plan
router.post('/members/assign-plan', async (req, res) => {
  try {
    const { memberId, planId, startDate } = req.body;
    if (!memberId || !planId) {
      return res.redirect('/admin/members?error=' + encodeURIComponent('Member and Plan are required'));
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      return res.redirect('/admin/members?error=' + encodeURIComponent('Selected plan not found'));
    }

    const start = startDate ? new Date(startDate) : new Date();
    // Calculate expiry date from plan duration (days)
    const expiry = new Date(start.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    const { status } = calculateMembershipStatus(expiry);

    // Update existing or create new membership
    let membership = await Membership.findOne({ memberId });
    if (membership) {
      membership.planId = planId;
      membership.startDate = start;
      membership.expiryDate = expiry;
      membership.status = status;
      await membership.save();
    } else {
      membership = new Membership({
        memberId,
        planId,
        startDate: start,
        expiryDate: expiry,
        status
      });
      await membership.save();
    }

    res.redirect('/admin/members?success=' + encodeURIComponent('Membership plan assigned successfully!'));
  } catch (err) {
    console.error('Assign plan error:', err);
    res.redirect('/admin/members?error=' + encodeURIComponent('Error assigning plan: ' + err.message));
  }
});

// POST /admin/members/assign-trainer
router.post('/members/assign-trainer', async (req, res) => {
  try {
    const { memberId, trainerId } = req.body;
    if (!memberId || !trainerId) {
      return res.redirect('/admin/members?error=' + encodeURIComponent('Member and Trainer are required'));
    }

    let membership = await Membership.findOne({ memberId });
    if (!membership) {
      // Create a pending membership if not already existing
      membership = new Membership({
        memberId,
        trainerId,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        status: 'ACTIVE'
      });
    } else {
      membership.trainerId = trainerId;
    }
    await membership.save();

    res.redirect('/admin/members?success=' + encodeURIComponent('Trainer assigned successfully!'));
  } catch (err) {
    console.error('Assign trainer error:', err);
    res.redirect('/admin/members?error=' + encodeURIComponent('Error assigning trainer: ' + err.message));
  }
});

module.exports = router;
