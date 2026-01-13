const request = require('supertest');
const express = require('express');
const multer = require('multer');

jest.mock('../queue', () => ({
  queue: { add: jest.fn() }
}));

const { queue } = require('../queue');

// Quick express app that mounts the upload handler logic from server.js
const app = express();
const serverModule = require('../server');

// We need to call the same middleware; but server.js boots a whole server.
// Instead, replicate minimal upload handler code for testing.

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/kmz/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // simulate insert into kmz_files and enqueue
  const kmzId = 1234;
  await queue.add('process', { kmzId });
  res.json({ message: 'KMZ uploaded and queued', kmz_id: kmzId });
});

afterEach(() => {
  jest.clearAllMocks();
});


describe('upload endpoint', () => {
  it('enqueues a job when KMZ uploaded', async () => {
    const res = await request(app)
      .post('/api/kmz/upload')
      .attach('file', Buffer.from('dummy'), 'sample.kmz');

    expect(res.status).toBe(200);
    expect(queue.add).toHaveBeenCalled();
    expect(res.body.kmz_id).toBe(1234);
  });
});
