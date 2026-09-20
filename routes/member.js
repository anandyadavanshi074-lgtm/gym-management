const express = require('express');
const router = express.Router();
const { isAuthenticated, requireRole } = require('../middleware/auth');
const Membership = require('../models/Membership');
const WorkoutPlan = require('../models/WorkoutPlan');
const Attendance = require('../models/Attendance');
const WeightLog = require('../models/WeightLog');

// All member routes require member role
router.use(isAuthenticated, requireRole('member'));

// Helper for status and days remaining
function calculateMembershipStatus(expiryDate) {
  if (!expiryDate) return { status: 'NO PLAN', daysRemaining: 0 };
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

// GET /member/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const memberId = req.session.user._id;

    // 1. Membership info
    const membership = await Membership.findOne({ memberId })
      .populate('planId')
      .populate('trainerId')
      .lean();

    const statusInfo = membership
      ? calculateMembershipStatus(membership.expiryDate)
      : { status: 'NO PLAN', daysRemaining: 0 };

    // 2. Attendance status for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.findOne({
      memberId,
      date: { $gte: startOfToday, $lte: endOfToday }
    }).lean();

    // 3. Today's day of week & workout
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = daysOfWeek[new Date().getDay()];

    const todaysWorkouts = await WorkoutPlan.find({
      memberId,
      dayOfWeek: currentDay
    }).lean();

    // 4. Latest body weight
    const latestWeightLog = await WeightLog.findOne({ memberId })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // 5. Total attendance count for member
    const totalAttendance = await Attendance.countDocuments({ memberId });

    res.render('member/dashboard', {
      title: 'Member Dashboard - Gym Management',
      membership,
      membershipStatus: statusInfo.status,
      daysRemaining: statusInfo.daysRemaining,
      trainer: membership ? membership.trainerId : null,
      todayAttendance: !!todayAttendance,
      currentDay,
      todaysWorkouts,
      currentWeight: latestWeightLog ? latestWeightLog.weight : null,
      totalAttendance
    });
  } catch (err) {
    console.error('Member dashboard error:', err);
    res.status(500).send('Error loading member dashboard: ' + err.message);
  }
});

// POST /member/attendance - Mark today's attendance
router.post('/attendance', async (req, res) => {
  try {
    const memberId = req.session.user._id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Check if already marked for today
    const existing = await Attendance.findOne({
      memberId,
      date: { $gte: startOfToday, $lte: endOfToday }
    });

    if (existing) {
      return res.redirect('/member/dashboard?error=' + encodeURIComponent("Attendance already marked for today!"));
    }

    const attendance = new Attendance({
      memberId,
      date: new Date(),
      status: 'Present'
    });

    await attendance.save();
    res.redirect('/member/dashboard?success=' + encodeURIComponent("Today's attendance marked successfully!"));
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.redirect('/member/dashboard?error=' + encodeURIComponent('Error marking attendance: ' + err.message));
  }
});

// GET /member/workout - View assigned workout plan
router.get('/workout', async (req, res) => {
  try {
    const memberId = req.session.user._id;

    const workoutPlans = await WorkoutPlan.find({ memberId })
      .populate('trainerId')
      .lean();

    // Group workouts by day of week
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const groupedWorkouts = {};
    daysOrder.forEach(day => {
      groupedWorkouts[day] = [];
    });

    workoutPlans.forEach(wp => {
      if (groupedWorkouts[wp.dayOfWeek]) {
        groupedWorkouts[wp.dayOfWeek].push(wp);
      }
    });

    res.render('member/workout', {
      title: 'My Workout Plan - Gym Management',
      daysOrder,
      groupedWorkouts,
      workoutPlans
    });
  } catch (err) {
    console.error('Member workout error:', err);
    res.status(500).send('Error loading workouts: ' + err.message);
  }
});

// GET /member/weight - View weight history & Chart.js graph
router.get('/weight', async (req, res) => {
  try {
    const memberId = req.session.user._id;

    const weightLogs = await WeightLog.find({ memberId })
      .sort({ date: 1 })
      .lean();

    // Prepare JSON data for Chart.js
    const chartLabels = weightLogs.map(log => new Date(log.date).toLocaleDateString());
    const chartData = weightLogs.map(log => log.weight);

    res.render('member/weight', {
      title: 'Weight Log & Progress - Gym Management',
      weightLogs: [...weightLogs].reverse(), // display newest first in table
      chartLabels: JSON.stringify(chartLabels),
      chartData: JSON.stringify(chartData)
    });
  } catch (err) {
    console.error('Member weight error:', err);
    res.status(500).send('Error loading weight logs: ' + err.message);
  }
});

// POST /member/weight - Log body weight
router.post('/weight', async (req, res) => {
  try {
    const memberId = req.session.user._id;
    const { weight, date } = req.body;

    if (!weight) {
      return res.redirect('/member/weight?error=' + encodeURIComponent('Please enter a valid weight'));
    }

    const logDate = date ? new Date(date) : new Date();

    const newLog = new WeightLog({
      memberId,
      weight: parseFloat(weight),
      date: logDate
    });

    await newLog.save();
    res.redirect('/member/weight?success=' + encodeURIComponent('Weight logged successfully!'));
  } catch (err) {
    console.error('Log weight error:', err);
    res.redirect('/member/weight?error=' + encodeURIComponent('Error logging weight: ' + err.message));
  }
});

module.exports = router;
