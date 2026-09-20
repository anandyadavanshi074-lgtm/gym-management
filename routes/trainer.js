const express = require('express');
const router = express.Router();
const { isAuthenticated, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Membership = require('../models/Membership');
const WorkoutPlan = require('../models/WorkoutPlan');

// All trainer routes require trainer role
router.use(isAuthenticated, requireRole('trainer'));

// GET /trainer/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const trainerId = req.session.user._id;

    // Find all memberships assigned to this trainer
    const assignedMemberships = await Membership.find({ trainerId })
      .populate('memberId')
      .populate('planId')
      .lean();

    // Filter valid members
    const assignedMembers = assignedMemberships
      .filter(m => m.memberId)
      .map(m => m.memberId);

    const assignedMemberIds = assignedMembers.map(m => m._id);

    // Workout plans created by this trainer
    const workoutPlans = await WorkoutPlan.find({ trainerId })
      .populate('memberId')
      .sort({ createdAt: -1 })
      .lean();

    res.render('trainer/dashboard', {
      title: 'Trainer Dashboard - Gym Management',
      assignedMembers,
      assignedCount: assignedMembers.length,
      workoutPlansCount: workoutPlans.length,
      workoutPlans
    });
  } catch (err) {
    console.error('Trainer dashboard error:', err);
    res.status(500).send('Error loading trainer dashboard: ' + err.message);
  }
});

// GET /trainer/workout-plan
router.get('/workout-plan', async (req, res) => {
  try {
    const trainerId = req.session.user._id;
    const selectedMemberId = req.query.memberId;

    // Find members assigned to this trainer
    const assignedMemberships = await Membership.find({ trainerId })
      .populate('memberId')
      .lean();

    const assignedMembers = assignedMemberships
      .filter(m => m.memberId)
      .map(m => m.memberId);

    // Get workout plans for selected member or all assigned members
    let query = { trainerId };
    if (selectedMemberId) {
      query.memberId = selectedMemberId;
    }

    const workoutPlans = await WorkoutPlan.find(query)
      .populate('memberId')
      .sort({ dayOfWeek: 1, createdAt: -1 })
      .lean();

    res.render('trainer/workout-plan', {
      title: 'Workout Plans - Trainer',
      assignedMembers,
      selectedMemberId: selectedMemberId || '',
      workoutPlans
    });
  } catch (err) {
    console.error('Workout plan page error:', err);
    res.status(500).send('Error loading workout plans: ' + err.message);
  }
});

// POST /trainer/workout-plan
router.post('/workout-plan', async (req, res) => {
  try {
    const trainerId = req.session.user._id;
    const { memberId, exercise, sets, reps, dayOfWeek } = req.body;

    if (!memberId || !exercise || !sets || !reps || !dayOfWeek) {
      return res.redirect('/trainer/workout-plan?error=' + encodeURIComponent('All fields are required'));
    }

    const newPlan = new WorkoutPlan({
      memberId,
      trainerId,
      exercise: exercise.trim(),
      sets: parseInt(sets, 10),
      reps: reps.toString().trim(),
      dayOfWeek
    });

    await newPlan.save();
    res.redirect(`/trainer/workout-plan?memberId=${memberId}&success=` + encodeURIComponent('Workout plan added successfully!'));
  } catch (err) {
    console.error('Create workout plan error:', err);
    res.redirect('/trainer/workout-plan?error=' + encodeURIComponent('Error creating workout plan: ' + err.message));
  }
});

module.exports = router;
