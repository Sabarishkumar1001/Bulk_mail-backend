const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/passkey", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// Define Schema
const credentialSchema = new mongoose.Schema(
  {
    user: String,
    pass: String,
  },
  { collection: "bulkmail" }
);

const Credential = mongoose.model("Credential", credentialSchema);

app.post("/sendmail", async (req, res) => {
  try {
    let { msg, email, emailList } = req.body;

    if (!msg.trim()) {
      return res.status(400).send("Message cannot be empty.");
    }

    // Combine single email with uploaded emails
    let recipients = [];
    if (email) recipients.push(email);
    if (emailList && emailList.length > 0) recipients = recipients.concat(emailList);

    if (recipients.length === 0) {
      return res.status(400).send("No recipient email provided.");
    }

    console.log("\n📩 **Received Email Request**");
    console.log(`📨 Message: ${msg}`);
    console.log(`📬 Sending to ${recipients.length} recipients...`);

    const data = await Credential.findOne();
    if (!data) {
      console.error("❌ No credentials found in DB!");
      return res.status(500).send("No email credentials found.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || data.user,
        pass: process.env.EMAIL_PASS || data.pass, // Use environment variables
      },
    });

    let failedEmails = [];
    for (const recipientEmail of recipients) {
      try {
        await transporter.sendMail({
          from: data.user,
          to: recipientEmail,
          subject: "📢 You got a message from your app!",
          text: msg,
        });
        console.log(`✅ Email Sent to: ${recipientEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${recipientEmail}:`, emailError);
        failedEmails.push(recipientEmail);
      }
    }

    if (failedEmails.length) {
      return res.status(500).json({ success: false, failedEmails });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).send("An error occurred.");
  }
});

const PORT = 5016;
app.listen(PORT, () => {
  console.log(`🚀 Server Started on port ${PORT}...`);
});

