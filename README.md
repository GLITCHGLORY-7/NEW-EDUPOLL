# NEW-EDUPOLL
<div align="center">

# <img src="assets/edupoll-logo.png" alt="EduPoll Logo" width="150"/>

# EDUPOLL

### Smart Classroom Polling & Communication System

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-Backend-black?logo=express)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?logo=javascript)
![JWT](https://img.shields.io/badge/JWT-Secure-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

# 📖 About EduPoll

EduPoll is a modern **Smart Classroom Polling & Communication System** designed to simplify classroom interaction between **Administrators, Staff, and Students**.

The system enables faculty members to create classroom polls, collect student responses in real time, generate professional reports, and manage classroom communication through announcements and notifications.

EduPoll focuses on **speed, simplicity, security, and efficient storage management**.

---

# ✨ Features

| Feature | Status |
|----------|--------|
| Admin Dashboard | ✅ |
| Staff Dashboard | ✅ |
| Student Dashboard | ✅ |
| Classroom Management | ✅ |
| Poll Creation | ✅ |
| QR Code Poll Access | ✅ |
| Live Poll Results | ✅ |
| Poll Response Tracking | ✅ |
| Student Categorization | ✅ |
| Announcement System | ✅ |
| Notification System | ✅ |
| Messaging System | ✅ |
| Report Generation | ✅ |
| Mobile Friendly PDF Reports | ✅ |
| JWT Authentication | ✅ |
| Secure Password Encryption | ✅ |
| Automatic Storage Cleanup | ✅ |

---

# 👥 User Roles

## 👑 Administrator

- Manage Staff
- Manage Classrooms
- Manage Students
- Send Announcements
- Monitor System
- View Reports

---

## 👨‍🏫 Staff

- Create Polls
- Manage Students
- View Poll Results
- Download Reports
- Send Messages
- Receive Notifications

---

## 👨‍🎓 Student

- Join Classroom
- Participate in Polls
- View Announcements
- Receive Notifications
- Submit Responses

---

# 🛠 Technology Stack

## Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3

## Backend

- Node.js
- Express.js

## Database

- Supabase
- PostgreSQL

## Authentication

- JWT
- bcrypt

## PDF Libraries

- jsPDF
- jspdf-autotable
- html2canvas

---

# 📂 Project Structure

```text
EDUPOLLSYSTEMFINAL
│
├── client
│   ├── public
│   ├── src
│   ├── package.json
│   └── vite.config.js
│
├── server
│   ├── database
│   ├── middleware
│   ├── routes
│   ├── app.js
│   ├── index.js
│   └── package.json
│
└── README.md
```

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/EDUPOLLSYSTEMFINAL.git
```

```bash
cd EDUPOLLSYSTEMFINAL
```

---

## Frontend

```bash
cd client

npm install

npm run dev
```

---

## Backend

```bash
cd server

npm install

npm start
```

---

# 🔑 Environment Variables

## Backend (.env)

```env
SUPABASE_URL=

SUPABASE_KEY=

JWT_SECRET=

PORT=3000
```

---

## Frontend (.env)

```env
VITE_API_URL=

VITE_SUPABASE_URL=

VITE_SUPABASE_KEY=
```

---

# 🔒 Authentication

EduPoll uses

- JWT Authentication
- bcrypt Password Hashing
- Protected Routes
- Role-Based Access Control
- Secure API Authentication

---

# 🗄 Database Modules

- Users
- Students
- Staff
- Classrooms
- Polls
- Poll Responses
- Notifications
- Messages
- Reports

---

# 📊 Poll Workflow

```text
Staff Creates Poll
        │
        ▼
Students Receive Poll
        │
        ▼
Students Submit Response
        │
        ▼
Responses Stored in Supabase
        │
        ▼
Votes Categorized
        │
        ▼
Reports Generated
        │
        ▼
PDF Download
```

---

# 📄 Report Generation

The generated reports include:

- Poll Information
- Student Name
- Student SEC ID
- Selected Option
- Voted Students
- Not Voted Students
- Option-wise Categorization
- Vote Summary

Reports are available in both Desktop and Mobile formats.

---

# 💾 Storage Optimization

### Permanent Data

- Admin
- Staff
- Students
- Classrooms

### Temporary Data (Auto Deleted After 15 Days)

- Polls
- Messages
- Notifications
- Reports

This approach minimizes storage usage while preserving essential academic records.

---

# 🚀 Deployment

| Service | Platform |
|----------|----------|
| Frontend | Vercel |
| Backend | Render |
| Database | Supabase |

---

# 🔮 Future Enhancements

- AI Poll Analytics
- Attendance Integration
- Mobile Application
- Email Notifications
- Real-Time Dashboard
- Multi-language Support

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a Pull Request

---

# 📜 License

This project is licensed under the **MIT License**.

---

<div align="center">

# DEVELOPED BY

## **RAJESH S**

### **INFORMATION TECHNOLOGY**

### **SRI SAIRAM ENGINEERING COLLEGE**

⭐ If you found this project useful, please consider giving it a star.

</div>





