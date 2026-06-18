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

        const wasCompleted = assignment.status === "Completed";

        assignment.status = "Completed";
        assignment.icon = "fa-check";
        if (url) assignment.submissionUrl = url;
        if (notes) assignment.notes = notes;
        assignment.submittedAt = new Date();

        let earnedXp = 0;
        let unlockedBadges = [];

        if (!wasCompleted) {
            earnedXp = 150;
            user.xp = (user.xp || 0) + earnedXp;

            // Check and unlock "Project Submitter" badge
            const hasBadge = user.badges.some(b => b.name === "Project Submitter");
            if (!hasBadge) {
                const newBadge = { 
                    name: "Project Submitter", 
                    icon: "fa-upload", 
                    description: "Submitted your first assignment!", 
                    unlockedAt: new Date() 
                };
                user.badges.push(newBadge);
                unlockedBadges.push(newBadge);
            }

            // Also check for "Active Learner" badge if total XP hits 200+
            if (user.xp >= 200) {
                const hasActiveLearner = user.badges.some(b => b.name === "Active Learner");
                if (!hasActiveLearner) {
                    const newBadge = {
                        name: "Active Learner",
                        icon: "fa-fire",
                        description: "Earned over 200 XP!",
                        unlockedAt: new Date()
                    };
                    user.badges.push(newBadge);
                    unlockedBadges.push(newBadge);
                }
            }
        }

        await user.save();
        res.json({
            assignments: user.assignments,
            xp: user.xp,
            badges: user.badges,
            earnedXp,
            unlockedBadges
        });
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

        const oldProgress = course.progress || 0;
        const newProgress = Math.min(100, Math.max(0, parseInt(progress)));
        course.progress = newProgress;

        // Gamification: Calculate lessons completed and award XP
        const oldLessons = Math.floor(oldProgress / 25);
        const newLessons = Math.floor(newProgress / 25);
        const completedDiff = Math.max(0, newLessons - oldLessons);
        const earnedXp = completedDiff * 50;

        if (earnedXp > 0) {
            user.xp = (user.xp || 0) + earnedXp;
        }

        let unlockedBadges = [];
        const tryUnlockBadge = (name, icon, description) => {
            const hasBadge = user.badges.some(b => b.name === name);
            if (!hasBadge) {
                const newBadge = { name, icon, description, unlockedAt: new Date() };
                user.badges.push(newBadge);
                unlockedBadges.push(newBadge);
            }
        };

        // 1. "First Steps" badge: completed first lesson
        if (newProgress > 0) {
            tryUnlockBadge("First Steps", "fa-shoe-prints", "Completed your first lesson!");
        }

        // 2. "HTML Master" badge: HTML Masterclass course progress reaches 100%
        if (course.courseId === 'c1' && newProgress === 100) {
            tryUnlockBadge("HTML Master", "fa-code", "Completed HTML & CSS Masterclass!");
        }

        // 3. "JS Wizard" badge: JS Basics course progress reaches 100%
        if (course.courseId === 'c2' && newProgress === 100) {
            tryUnlockBadge("JS Wizard", "fa-wand-magic-sparkles", "Completed JavaScript Basics!");
        }

        // 4. "Active Learner" badge: total user XP reaches 200+
        if (user.xp >= 200) {
            tryUnlockBadge("Active Learner", "fa-fire", "Earned over 200 XP!");
        }

        await user.save();
        res.json({ 
            message: "Progress updated successfully", 
            enrolledCourses: user.enrolledCourses, 
            xp: user.xp,
            badges: user.badges,
            earnedXp,
            unlockedBadges
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// GET /api/dashboard/leaderboard
// Fetch top students ranked by XP, and the current user's rank
router.get("/leaderboard", auth, async (req, res) => {
    try {
        const allUsers = await User.find({})
            .select("name email dp xp badges")
            .sort({ xp: -1 });

        const leaderboard = allUsers.map((u, index) => ({
            rank: index + 1,
            id: u._id,
            name: u.name,
            email: u.email,
            dp: u.dp || null,
            xp: u.xp || 0,
            badgesCount: u.badges ? u.badges.length : 0
        }));

        const currentUserIndex = leaderboard.findIndex(u => u.id.toString() === req.user.id);
        const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : leaderboard.length + 1;
        const top10 = leaderboard.slice(0, 10);

        res.json({
            leaderboard: top10,
            userRank: currentUserRank,
            userXp: allUsers[currentUserIndex] ? (allUsers[currentUserIndex].xp || 0) : 0,
            userBadgesCount: allUsers[currentUserIndex] && allUsers[currentUserIndex].badges ? allUsers[currentUserIndex].badges.length : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// POST /api/dashboard/reset
// Reset user's dashboard data (courses, assignments, settings, and gamification state) to defaults
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
        user.xp = 0;
        user.badges = [];

        await user.save();
        res.json({ 
            message: "Dashboard data reset successfully", 
            enrolledCourses: user.enrolledCourses, 
            assignments: user.assignments, 
            settings: user.settings,
            xp: user.xp,
            badges: user.badges
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;

