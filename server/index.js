// server.js
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const app = express();
const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const rewardsRoutes = require('./routes/rewardsRoutes');
const { seedRewards } = require('./seedRewards');

// Set default JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
  console.log('⚠️ Using default JWT_SECRET. Please set JWT_SECRET environment variable in production.');
}

// Allow localhost for local dev and Netlify for production
app.use(cors({
  origin: (origin, callback) => {
    const allowedLocal = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const allowedNetlify = origin && origin.includes('.netlify.app');
    const allowedRender = origin && origin.includes('.onrender.com');
    
    if (allowedLocal || allowedNetlify || allowedRender) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/rewards', rewardsRoutes);

// Database connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/urbanecho';
console.log('Connecting to MongoDB with URI:', mongoURI);

mongoose.connect(mongoURI)
.then(async () => {
  console.log('MongoDB connected successfully');
  await seedRewards();
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Server setup
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});