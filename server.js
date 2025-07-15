const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('public'));
app.use(express.json());

// *** Replace these with your actual secrets here ***
const PASSWORD = 'YourSecretPassword123';
const RECAPTCHA_SECRET = '6Lf_IIMrAAAAAALiolF4F8Tv_mCokoXStRB6IDNS';
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1394507578314067978/SFuDXBALvqEk7qRz43XIGTvIZB1mb9FBrGoolv0q2Se3fddvIKf5U73Aqt-dandq2x3Z';

app.post('/submit', async (req, res) => {
  const { username, embeds, log, recaptcha, accessKey } = req.body;

  if (!recaptcha) return res.status(400).send('Captcha missing.');
  if (accessKey !== PASSWORD) return res.status(401).send('Invalid password.');

  // Verify reCAPTCHA with Google
  const captchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${RECAPTCHA_SECRET}&response=${recaptcha}`
  });
  const captchaJson = await captchaRes.json();
  if (!captchaJson.success) return res.status(403).send('Captcha failed.');

  // Log the submission to logs.json (creates the file if it doesn't exist)
  const logEntry = {
    time: new Date().toISOString(),
    reporter: embeds[0]?.fields[0]?.value || 'Unknown',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    referrer: log?.referrer || 'N/A'
  };

  const logPath = path.join(__dirname, 'logs.json');
  let logs = [];

  try {
    if (fs.existsSync(logPath)) {
      const data = fs.readFileSync(logPath, 'utf-8');
      logs = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read logs.json:', e);
  }

  logs.push(logEntry);

  try {
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error('Failed to write logs.json:', e);
  }

  // Send data to Discord webhook
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, embeds })
    });
  } catch (e) {
    console.error('Failed to send webhook:', e);
  }

  res.status(200).send('Report submitted');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
