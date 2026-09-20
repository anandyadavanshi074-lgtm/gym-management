require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const trainerRoutes = require('./routes/trainer');
const memberRoutes = require('./routes/member');
const { exposeUser } = require('./middleware/auth');
const seedData = require('./seed');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gym_management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing & Static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'gym_management_super_secret_key_college_project_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Expose user & flash messages to all EJS views
app.use(exposeUser);

// Root route
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'trainer') return res.redirect('/trainer/dashboard');
    if (role === 'member') return res.redirect('/member/dashboard');
  }
  res.redirect('/login');
});

// Quick seed route for demo convenience
app.get('/seed', async (req, res) => {
  try {
    await seedData();
    res.redirect('/login?success=' + encodeURIComponent('Demo database re-seeded successfully!'));
  } catch (err) {
    console.error('Manual seed route error:', err);
    res.redirect('/login?error=' + encodeURIComponent('Seed failed: ' + err.message));
  }
});

// Mount Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/trainer', trainerRoutes);
app.use('/member', memberRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('login', {
    title: 'Page Not Found',
    error: 'Requested page not found (404)'
  });
});

// Start Server locally if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`FitPulse Gym Management server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
