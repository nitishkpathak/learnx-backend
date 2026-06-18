const express = require("express");

const router = express.Router();

const Contact = require("../models/contact");

// POST CONTACT FORM
router.post("/", async (req, res) => {

    try {

        const { name, email, message } = req.body;

        const newContact = new Contact({
            name,
            email,
            message
        });

        await newContact.save();

        res.status(201).json({
            message: "Message Sent Successfully ✅"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error ❌"
        });

    }

});

module.exports = router;