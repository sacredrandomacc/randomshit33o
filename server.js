const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' }); // temp folder for uploads

// ========== CONFIG - REPLACE THESE VALUES ==========
const ACCESS_PASSWORD = '*&Ah8At8%ACV*7C^VB';  // form password
const RECAPTCHA_SECRET = '6LcCIoMrAAAAADpxOadR9Up1WuotLQ8Qf55becbF';
const MAIN_WEBHOOK_URL = 'https://discord.com/api/webhooks/1394507578314067978/SFuDXBALvqEk7qRz43XIGTvIZB1mb9FBrGoolv0q2Se3fddvIKf5U73Aqt-dandq2x3Z';
const ATTACHMENTS_WEBHOOK_URL = 'https://discord.com/api/webhooks/1394517942078804058/EYYt_HGAwBjiFOeCAksY7dup8hbXLA5JMt4vTP1QqI_4qeWivBcTaXbxs369x96XzBsK';
// ===================================================

// Serve static files (your index.html etc)
app.use(express.static('public'));

// Middleware to parse JSON bodies (not needed for form-data uploads)
app.use(express.json());

// POST /submit route with file upload support
app.post('/submit', upload.single('file'), async (req, res) => {
  try {
    const { accessKey, reporter, victim, suspect, description, evidence, recaptcha } = req.body;

    if (!recaptcha) return res.status(400).send('Captcha missing.');
    if (accessKey !== ACCESS_PASSWORD) return res.status(401).send('Invalid password.');

    // Verify captcha with Google
    const captchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET}&response=${recaptcha}`
    });

    const captchaData = await captchaRes.json();

    if (!captchaData.success) return res.status(403).send('Captcha failed.');

    // Prepare the Discord embed for the main report
    const embed = {
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
    };

    // Send main report webhook
    await fetch(MAIN_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'AE Report Bot', embeds: [embed] })
    });

    // If file uploaded, send it to attachments webhook
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

      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(200).send('Report submitted successfully');
  } catch (err) {
    console.error('Error in /submit:', err);
    res.status(500).send('Server error');
  }
});

// Start the server on Render port or 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
