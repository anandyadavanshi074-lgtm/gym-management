require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const MembershipPlan = require('./models/MembershipPlan');
const Membership = require('./models/Membership');
const WorkoutPlan = require('./models/WorkoutPlan');
const Attendance = require('./models/Attendance');
const WeightLog = require('./models/WeightLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gym_management';

async function seedData() {
  try {
    console.log('Connecting to MongoDB at:', MONGO_URI.includes('@') ? MONGO_URI.replace(/:([^@]+)@/, ':****@') : MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected!');

    // Clear existing data for fresh demo
    await User.deleteMany({});
    await MembershipPlan.deleteMany({});
    await Membership.deleteMany({});
    await WorkoutPlan.deleteMany({});
    await Attendance.deleteMany({});
    await WeightLog.deleteMany({});

    console.log('Cleared existing collections.');

    // 1. Create Users
    // Admin
    const admin = new User({
      name: 'System Admin',
      email: 'admin@gmail.com',
      password: 'admin123',
      role: 'admin'
    });
    await admin.save();

    // Trainers
    const trainer1 = new User({
      name: 'Alex Hunter',
      email: 'trainer@gmail.com',
      password: 'trainer123',
      role: 'trainer'
    });
    await trainer1.save();

    const trainer2 = new User({
      name: 'Sarah Connor',
      email: 'sarah.trainer@gmail.com',
      password: 'trainer123',
      role: 'trainer'
    });
    await trainer2.save();

    // Members
    const member1 = new User({
      name: 'John Doe',
      email: 'member@gmail.com',
      password: 'member123',
      role: 'member'
    });
    await member1.save();

    const member2 = new User({
      name: 'Rahul Sharma',
      email: 'rahul@gmail.com',
      password: 'member123',
      role: 'member'
    });
    await member2.save();

    const member3 = new User({
      name: 'Priya Patel',
      email: 'priya@gmail.com',
      password: 'member123',
      role: 'member'
    });
    await member3.save();

    console.log('Users created: 1 Admin, 2 Trainers, 3 Members.');

    // 2. Create 3 Membership Plans
    const planBasic = await MembershipPlan.create({
      name: 'Basic',
      duration: 30, // 30 days
      price: 999
    });

    const planStandard = await MembershipPlan.create({
      name: 'Standard',
      duration: 90, // 90 days
      price: 2499
    });

    const planPremium = await MembershipPlan.create({
      name: 'Premium',
      duration: 180, // 180 days
      price: 4499
    });

    console.log('Membership plans created: Basic, Standard, Premium.');

    // 3. Create Memberships
    // Member 1 (John): Active Standard Plan with Alex Trainer (Expires in 60 days)
    const now = new Date();
    await Membership.create({
      memberId: member1._id,
      planId: planStandard._id,
      trainerId: trainer1._id,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    });

    // Member 2 (Rahul): Expiring Soon Basic Plan with Alex Trainer (Expires in 4 days)
    await Membership.create({
      memberId: member2._id,
      planId: planBasic._id,
      trainerId: trainer1._id,
      startDate: new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      status: 'EXPIRING SOON'
    });

    // Member 3 (Priya): Expired Basic Plan with Sarah Trainer (Expired 5 days ago)
    await Membership.create({
      memberId: member3._id,
      planId: planBasic._id,
      trainerId: trainer2._id,
      startDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      status: 'EXPIRED'
    });

    console.log('Memberships created: 1 Active, 1 Expiring Soon, 1 Expired.');

    // 4. Create Workout Plans for Member 1
    const workouts = [
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Bench Press', sets: 4, reps: '10-12', dayOfWeek: 'Monday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Push Ups', sets: 3, reps: '15', dayOfWeek: 'Monday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Barbell Squats', sets: 4, reps: '12', dayOfWeek: 'Tuesday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Lunges', sets: 3, reps: '12 each leg', dayOfWeek: 'Tuesday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Active Recovery / Rest', sets: 1, reps: '30 mins walk', dayOfWeek: 'Wednesday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Pull Ups', sets: 4, reps: '8-10', dayOfWeek: 'Thursday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Deadlifts', sets: 3, reps: '8', dayOfWeek: 'Friday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'HIIT Cardio & Abs', sets: 4, reps: '20 mins', dayOfWeek: 'Saturday' },
      { memberId: member1._id, trainerId: trainer1._id, exercise: 'Rest & Full Recovery', sets: 1, reps: 'Hydrate & Sleep', dayOfWeek: 'Sunday' }
    ];
    await WorkoutPlan.insertMany(workouts);
    console.log('Workout plans created for member.');

    // 5. Create Attendance Records
    // Today's attendance for member 1
    await Attendance.create({
      memberId: member1._id,
      date: new Date(),
      status: 'Present'
    });
    // Past attendance records
    for (let i = 1; i <= 7; i++) {
      await Attendance.create({
        memberId: member1._id,
        date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        status: 'Present'
      });
    }
    // Member 2 today attendance
    await Attendance.create({
      memberId: member2._id,
      date: new Date(),
      status: 'Present'
    });
    console.log('Attendance records created.');

    // 6. Create Weight Logs for Member 1 (For Chart.js progress!)
    const weightData = [
      { daysAgo: 30, weight: 78.5 },
      { daysAgo: 24, weight: 77.8 },
      { daysAgo: 18, weight: 77.0 },
      { daysAgo: 12, weight: 76.2 },
      { daysAgo: 6, weight: 75.8 },
      { daysAgo: 0, weight: 75.2 }
    ];

    for (const log of weightData) {
      await WeightLog.create({
        memberId: member1._id,
        weight: log.weight,
        date: new Date(now.getTime() - log.daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    console.log('Weight progress logs created for demo.');

    console.log('=============================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Demo Logins:');
    console.log('Admin:   admin@gmail.com   / admin123');
    console.log('Trainer: trainer@gmail.com / trainer123');
    console.log('Member:  member@gmail.com  / member123');
    console.log('=============================================');

    return true;
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  }
}

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedData;
