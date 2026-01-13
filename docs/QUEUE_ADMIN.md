# Queue administration (BullMQ)

This doc covers basic admin tasks for the Redis/BullMQ queue `kmz-processing` used to process KMZ uploads.

Quick access
- Dev UI (Bull Board): http://localhost:3003/admin/queues (dev only - `docker-compose -f docker-compose.dev.yml up bull-board`)

Inspect queue with redis-cli
```bash
# list keys
docker-compose exec -T redis redis-cli keys "*kmz-processing*"
# check list length and counts (via bull-board is easiest)
```

Common actions
- Retry a failed job: use Bull Board UI -> locate queue -> failed jobs -> retry
- Requeue a job manually (psql):
```sql
UPDATE kmz_files SET status = 'queued' WHERE id = <id>;
```
then re-add the job via the queue UI or API.

Notifications
- If jobs permanently fail (exceeded attempts), a webhook will be POSTed to the URL in `JOB_ALERT_WEBHOOK` (see `.env.example`). Payload: { text, kmzId, filename, error }.
- The webhook can be a Slack incoming webhook URL or any HTTP endpoint that accepts JSON.

Useful commands
```bash
# Inspect queue length
docker-compose exec -T redis redis-cli llen bull:kmz-processing:wait
# Tail queue worker logs
docker-compose logs -f worker
# Check worker health
curl http://localhost:3002/health
```

Security note
- Bull Board is dev-only and should not be exposed in production without auth. The service is added to `docker-compose.dev.yml` only.

Troubleshooting notifications
- If you don't receive webhook alerts, check worker logs for `Failed to send job failure notification` and ensure `JOB_ALERT_WEBHOOK` is reachable from the Docker network.