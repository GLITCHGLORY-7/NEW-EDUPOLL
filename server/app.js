const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth.routes');
const staffRoutes = require('./routes/staff.routes');
const classroomsRoutes = require('./routes/classrooms.routes');
const studentsRoutes = require('./routes/students.routes');
const pollsRoutes = require('./routes/polls.routes');
const studentAppRoutes = require('./routes/student.routes');
const aiRoutes = require('./routes/ai.routes');
const messagesRoutes = require('./routes/messages.routes');
const announcementsRoutes = require('./routes/announcements.routes');

const app = express();

const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, 'http://localhost:5173'] 
  : ['http://localhost:5173'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/classrooms', classroomsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/student', studentAppRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/announcements', announcementsRoutes);

module.exports = app;
