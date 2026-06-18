const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    password: { type: String, required: true },
    education: String,
    category: String,
    // Dashboard Data
    studentId: String,
    dp: String,
    xp: { type: Number, default: 0 },
    badges: [{
        name: { type: String, required: true },
        icon: { type: String, required: true },
        description: { type: String, required: true },
        unlockedAt: { type: Date, default: Date.now }
    }],
    enrolledCourses: [{
        courseId: String,
        name: String,
        progress: { type: Number, default: 0 },
        instructor: String,
        img: String
    }],
    assignments: [{
        title: String,
        status: { type: String, enum: ['Pending', 'Completed', 'Overdue'], default: 'Pending' },
        dueDate: String,
        icon: String,
        submissionUrl: String,
        notes: String,
        submittedAt: Date
    }],
    settings: {
        emailNotif: { type: Boolean, default: true },
        pushNotif: { type: Boolean, default: false },
        theme: { type: String, enum: ['light', 'dark'], default: 'light' }
    }
});

module.exports = mongoose.model("User", userSchema);