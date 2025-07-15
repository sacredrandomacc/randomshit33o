const express = require('express');
const app = express();
const fetch = require('node-fetch');

app.use(express.json());
app.use(express.static('public'));

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1394507578314067978/SFuDXBALvqEk7qRz43XIGTvIZB1mb9FBrGoolv0q2Se3fddvIKf5U73Aqt-dandq2x3Z';

app.post('/submit', async (req, res) => {
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(200).send('OK');
  } catch (e) {
    console.error('Webhook Error:', e);
    res.status(500).send('Webhook failed');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
