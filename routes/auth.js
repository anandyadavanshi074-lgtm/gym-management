const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /login
router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'trainer') return res.redirect('/trainer/dashboard');
    if (role === 'member') return res.redirect('/member/dashboard');
  }
  res.render('login', { title: 'Login - Gym Management' });
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', {
        title: 'Login - Gym Management',
        error: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.render('login', {
        title: 'Login - Gym Management',
        error: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', {
        title: 'Login - Gym Management',
        error: 'Invalid email or password'
      });
    }

    // Set session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Role-based redirection
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'trainer') {
      return res.redirect('/trainer/dashboard');
    } else {
      return res.redirect('/member/dashboard');
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', {
      title: 'Login - Gym Management',
      error: 'An error occurred during login. Please try again.'
    });
  }
});

// GET /register
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register - Gym Management' });
});

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.render('register', {
        title: 'Register - Gym Management',
        error: 'All fields are required'
      });
    }

    const validRoles = ['admin', 'trainer', 'member'];
    const assignedRole = validRoles.includes(role) ? role : 'member';

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.render('register', {
        title: 'Register - Gym Management',
        error: 'An account with this email already exists'
      });
    }

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole
    });

    await newUser.save();

    return res.redirect('/login?success=' + encodeURIComponent('Registration successful! Please login.'));
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', {
      title: 'Register - Gym Management',
      error: 'Error registering user: ' + err.message
    });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/login?success=' + encodeURIComponent('You have been logged out.'));
  });
});

module.exports = router;
