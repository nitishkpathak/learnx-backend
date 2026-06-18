const express = require("express");
const router = express.Router();
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");

// GET /api/dashboard/data
// Fetch all dashboard data for logged-in user
router.get("/data", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// PUT /api/dashboard/profile
// Update Profile (name, email, dp)
router.put("/profile", auth, async (req, res) => {
    try {
        const { name, email, dp } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (name) user.name = name;
        if (email) user.email = email;
        if (dp) user.dp = dp;

        await user.save();
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// PUT /api/dashboard/assignment/:id
// Mark Assignment as Completed
router.put("/assignment/:id", auth, async (req, res) => {
    try {
        const { url, notes } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const assignment = user.assignments.id(req.params.id);
        if (!assignment) return res.status(404).json({ message: "Assignment not found" });

        assignment.status = "Completed";
        assignment.icon = "fa-check";
        if (url) assignment.submissionUrl = url;
        if (notes) assignment.notes = notes;
        assignment.submittedAt = new Date();
        
        await user.save();
        res.json(user.assignments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// PUT /api/dashboard/settings
// Update settings
router.put("/settings", auth, async (req, res) => {
    try {
        const { emailNotif, pushNotif, theme } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.settings) {
            user.settings = { emailNotif: true, pushNotif: false, theme: 'light' };
        }

        if (emailNotif !== undefined) user.settings.emailNotif = emailNotif;
        if (pushNotif !== undefined) user.settings.pushNotif = pushNotif;
        if (theme !== undefined) user.settings.theme = theme;

        await user.save();
        res.json(user.settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// POST /api/dashboard/enroll
// Enroll in a new course
router.post("/enroll", auth, async (req, res) => {
    try {
        const { courseId, name, instructor, img } = req.body;
        if (!courseId || !name) {
            return res.status(400).json({ message: "Course ID and Name are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if already enrolled
        const alreadyEnrolled = user.enrolledCourses.some(c => c.courseId === courseId);
        if (alreadyEnrolled) {
            return res.status(400).json({ message: "You are already enrolled in this course" });
        }

        // Add to enrolledCourses
        user.enrolledCourses.push({
            courseId,
            name,
            progress: 0,
            instructor: instructor || "Unknown Instructor",
            img: img || ""
        });

        await user.save();
        res.json({ message: "Enrolled successfully", enrolledCourses: user.enrolledCourses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// PUT /api/dashboard/course/:id/progress
// Update progress of an enrolled course
router.put("/course/:id/progress", auth, async (req, res) => {
    try {
        const { progress } = req.body;
        if (progress === undefined) {
            return res.status(400).json({ message: "Progress value is required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const course = user.enrolledCourses.find(c => c.courseId === req.params.id);
        if (!course) return res.status(404).json({ message: "Course not found" });

        course.progress = Math.min(100, Math.max(0, parseInt(progress)));
        await user.save();
        res.json({ message: "Progress updated successfully", enrolledCourses: user.enrolledCourses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// POST /api/dashboard/reset
// Reset user's dashboard data (courses and assignments) to defaults
router.post("/reset", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const defaultCourses = [
            { courseId: 'c1', name: 'HTML & CSS Masterclass', progress: 10, instructor: 'Sarah Drasner', img: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=500&q=80' },
            { courseId: 'c2', name: 'JavaScript Basics', progress: 0, instructor: 'Gary Simon', img: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=500&q=80' }
        ];

        const defaultAssignments = [
            { title: 'HTML Portfolio Project', status: 'Pending', dueDate: 'Due in 2 days', icon: 'fa-clock' },
            { title: 'JS Basics Quiz', status: 'Pending', dueDate: 'Due Next Week', icon: 'fa-clock' }
        ];

        user.enrolledCourses = defaultCourses;
        user.assignments = defaultAssignments;
        user.settings = { emailNotif: true, pushNotif: false, theme: 'light' };

        await user.save();
        res.json({ message: "Dashboard data reset successfully", enrolledCourses: user.enrolledCourses, assignments: user.assignments, settings: user.settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;

