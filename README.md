# FitPulse &mdash; Gym Membership & Workout Plan Management System

A simple, fast, and robust web application MVP built for Gym Membership & Workout Plan Management.

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS (Server-Side Rendering)
- **Database**: MongoDB Atlas / Mongoose
- **Authentication**: Session-based (`express-session`, `bcryptjs`)
- **Styling**: Vanilla CSS (Responsive Fitness Theme)
- **Deployment**: Vercel & GitHub ready

---

## 👥 User Roles & Features

### 1. 🛡️ Admin
- **Dashboard**:
  - Total Members, Active Members, Expired Members
  - Today's Attendance Count
  - Total Trainers
  - **Plan-wise Member Breakdown** (Basic, Standard, Premium)
  - **Expiring Soon Members List** (Automatic detection for memberships expiring within 7 days)
- **Membership Plans Management**: Create plans with Name, Duration (in days), and Price.
- **Assign Membership**: Assigns a plan to a member with **automatic expiry date calculation**.
- **Assign Trainer**: Links a personal trainer to a member.

### 2. 🏋️ Trainer
- **Dashboard**: View assigned members, athlete count, and created routines.
- **Workout Plan Management**:
  - Create weekly workout plans for assigned members.
  - Set Exercise name, Sets, Reps, and Day of the Week (Monday &ndash; Sunday).
  - View full schedule of all assigned members.

### 3. 🏃 Member
- **Dashboard**:
  - Membership Status (`ACTIVE`, `EXPIRING SOON`, `EXPIRED`, `NO PLAN`)
  - Expiry Date & Remaining Days
  - Assigned Trainer Name & Email
  - Today's Workout Routine Overview
  - Attendance Status
- **Attendance**: 1-click daily attendance marking (prevents duplicate check-ins on the same day).
- **Weekly Workout Plan**: Full Monday &ndash; Sunday exercise routine.
- **Weight Progress Tracking**:
  - Log daily/weekly body weight measurements.
  - Interactive **Chart.js** line graph displaying weight progress over time.

---

## 🔑 Demo Login Credentials

The login screen includes **1-click autofill chips** for instant testing:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@gmail.com` | `admin123` |
| **Trainer** | `trainer@gmail.com` | `trainer123` |
| **Member** | `member@gmail.com` | `member123` |

---

## 💻 Local Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/anandyadavanshi074-lgtm/gym-management.git
cd gym-management
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gym_management
SESSION_SECRET=gym_super_secret_session_key_2024
```
*(Or use your MongoDB Atlas connection string)*

### 4. Seed Demo Data
```bash
npm run seed
```
*(Or visit `http://localhost:5000/seed` in your browser)*

### 5. Start Server
```bash
npm start
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## ☁️ Vercel Deployment

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
3. Import this repository.
4. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas URI
   - `SESSION_SECRET`: Your secret key
5. Click **Deploy**.
6. Visit `https://your-domain.vercel.app/seed` once to populate initial demo data.
