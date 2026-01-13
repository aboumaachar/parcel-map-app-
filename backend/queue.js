const { Queue, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || { host: 'redis', port: 6379 });

// queue scheduler is required to make delayed jobs and retries work
const scheduler = new QueueScheduler('kmz-processing', { connection });

const queue = new Queue('kmz-processing', { connection });

module.exports = { queue, scheduler, connection };
