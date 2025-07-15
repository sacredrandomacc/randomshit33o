const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(express.json());

const PASSWORD = process.env.ACCESS_PASSWORD;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

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

  // Log the submission
  const logData = {
    time: new Date().toISOString(),
    reporter: embeds[0].fields[0]?.value,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    referrer: log?.referrer || 'N/A'
  };
  fs.appendFileSync(path.join(__dirname, 'logs.json'), JSON.stringify(logData) + ',\n');

  // Send to Discord webhook
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, embeds })
  });

  res.status(200).send('Report submitted');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
