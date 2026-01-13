const axios = require('axios');

async function sendJobFailureNotification({ kmzId, filename, error }) {
  const webhook = process.env.JOB_ALERT_WEBHOOK;
  if (!webhook) return false;

  const payload = {
    text: `KMZ job failed permanently for kmzId=${kmzId}, filename=${filename || 'n/a'}`,
    kmzId,
    filename,
    error: (error && (error.message || error.toString())) || 'unknown'
  };

  try {
    await axios.post(webhook, payload, { timeout: 5000 });
    return true;
  } catch (e) {
    console.warn('Failed to send job failure notification', e.message || e);
    return false;
  }
}

module.exports = { sendJobFailureNotification };
