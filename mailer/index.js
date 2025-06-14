const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();
const sendRoute = require("./routes/getRoutes");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cors());

// Create transporter object using Gmail - FIXED METHOD NAME
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "kxahoi12@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD || "frrs dbch nvas hdmi",
  },
});

// Email sending API endpoint
app.use("/send", sendRoute);
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html, from } = req.body;

    const mailOptions = {
      from: from || "code.adarsha@gmail.com",
      to: to || "kxahoi12@gmail.com",
      subject: subject || "Accident Detection Alert - Test Email",

      text:
        text ||
        `Hello,

This is a test email from your Accident Detection and Response System.

The system is functioning correctly and ready to detect accidents in real-time and send instant alerts.

Stay safe,
Team ADRS (Accident Detection and Response System)`,

      html:
        html ||
        `<h1>🚨 Accident Detection Alert</h1>
<p>This is a <b>test email</b> from your <b>Accident Detection and Response System</b>.</p>
<p>The system is working correctly and will send instant alerts if any accident is detected.</p>
<p>Stay safe,<br/><b>Team ADRS</b></p>`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully!");
    console.log("Response:", info.response);

    res.status(200).json({
      success: true,
      message: "Email sent successfully!",
      messageId: info.messageId,
      response: info.response,
    });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Server is running!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
