jest.mock('axios');
const axios = require('axios');
const { sendJobFailureNotification } = require('../notify');

describe('sendJobFailureNotification', () => {
  it('returns false when no webhook configured', async () => {
    const res = await sendJobFailureNotification({ kmzId: 1, filename: 'x', error: 'boom' });
    expect(res).toBe(false);
  });

  it('posts to webhook when configured', async () => {
    process.env.JOB_ALERT_WEBHOOK = 'http://example.test/webhook';
    axios.post.mockResolvedValue({ status: 200 });

    const res = await sendJobFailureNotification({ kmzId: 2, filename: 'y', error: new Error('fail') });
    expect(res).toBe(true);
    expect(axios.post).toHaveBeenCalledWith('http://example.test/webhook', expect.objectContaining({ kmzId: 2 }), expect.any(Object));
  });
});
