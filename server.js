const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

// --- Config: replace with your real secrets ---
const PASSWORD = 'YourSecretPassword123';
const RECAPTCHA_SECRET = 'your_google_recaptcha_secret_key';
const MAIN_WEBHOOK_URL = 'https://discord.com/api/webhooks/your_main_webhook_id/your_main_webhook_token';
const ATTACHMENTS_WEBHOOK_URL = 'https://discord.com/api/webhooks/your_attachments_webhook_id/your_attachments_webhook_token';
const DISCORD_CLIENT_ID = 'your_discord_client_id';
const DISCORD_CLIENT_SECRET = 'your_discord_client_secret';
const DISCORD_REDIRECT_URI = 'https://yourdomain.com/oauth/callback'; // adjust to your domain
const ALLOWED_ADMIN_IDS = ['123456789012345678']; // Discord user IDs allowed to access admin

// Session setup for OAuth login
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
}));

// Helper: Verify reCAPTCHA token
async function verifyRecaptcha(token) {
  const res = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: `secret=${RECAPTCHA_SECRET}&response=${token}`
  });
  const data = await res.json();
  return data.success;
}

// POST /submit — handle report + optional file upload
app.post('/submit', upload.single('file'), async (req, res) => {
  try {
    const { accessKey, reporter, victim, suspect, description, evidence, recaptcha } = req.body;

    if (!recaptcha) return res.status(400).send('Captcha missing.');
    if (accessKey !== PASSWORD) return res.status(401).send('Invalid password.');
    const captchaOk = await verifyRecaptcha(recaptcha);
    if (!captchaOk) return res.status(403).send('Captcha failed.');

    // Send the main report to MAIN_WEBHOOK_URL
    const reportPayload = {
      username: 'AE Report Bot',
      embeds: [{
        title: '🛡️ New Extortion Report',
        color: 14423100,
        fields: [
          { name: 'Reporter', value: reporter || 'N/A' },
          { name: 'Victim', value: victim || 'Same as reporter' },
          { name: 'Suspect', value: suspect || 'Unknown' },
          { name: 'Description', value: description || 'No description provided' },
          { name: 'Evidence', value: evidence || 'None' }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    await fetch(MAIN_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportPayload)
    });

    // If file uploaded, send it to ATTACHMENTS_WEBHOOK_URL
    if (req.file) {
      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path), req.file.originalname);
      form.append('payload_json', JSON.stringify({
        username: 'AE Report Bot - Attachments',
        content: `Attachment from report by ${reporter || 'Unknown'}`
      }));

      await fetch(ATTACHMENTS_WEBHOOK_URL, {
        method: 'POST',
        headers: form.getHeaders(),
        body: form
      });

      // Delete the file after upload
      fs.unlink(req.file.path, err => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }

    res.status(200).send('Report submitted');
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).send('Server error');
  }
});
