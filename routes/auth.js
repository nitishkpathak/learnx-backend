const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is missing.");
    process.exit(1);
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
    try {
        console.log("BODY:", req.body); // 🔥 DEBUG

        const { name, email, phone, password, education, category } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate Student ID
        const studentId = 'STU' + Math.floor(10000 + Math.random() * 90000);

        // Default Courses & Assignments for new users
        const defaultCourses = [
            { courseId: 'c1', name: 'HTML & CSS Masterclass', progress: 10, instructor: 'Sarah Drasner', img: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=500&q=80' },
            { courseId: 'c2', name: 'JavaScript Basics', progress: 0, instructor: 'Gary Simon', img: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=500&q=80' }
        ];

        const defaultAssignments = [
            { title: 'HTML Portfolio Project', status: 'Pending', dueDate: 'Due in 2 days', icon: 'fa-clock' },
            { title: 'JS Basics Quiz', status: 'Pending', dueDate: 'Due Next Week', icon: 'fa-clock' }
        ];

        // Create new user
        const user = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            education,
            category,
            studentId,
            enrolledCourses: defaultCourses,
            assignments: defaultAssignments,
            settings: { emailNotif: true, pushNotif: false, theme: 'light' }
        });

        await user.save();

        res.status(201).json({ message: "User Registered Successfully" });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Error saving user" });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
            expiresIn: "1h"
        });

        // Send response with token and user data
        res.status(200).json({
            message: "Login Successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                education: user.education,
                studentId: user.studentId,
                dp: user.dp || null,
                joined: new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
    try {
        const { email, phone } = req.body;
        
        let user;
        if (email) {
            user = await User.findOne({ email });
        } else if (phone) {
            user = await User.findOne({ phone });
        }

        if (!user) {
            // For security, don't reveal if user exists or not, just return success
            return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
        }

        // Mock sending email/SMS
        console.log(`Reset link sent to ${email || phone} for user ${user.name}`);

        res.status(200).json({ message: "Reset link sent successfully" });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;