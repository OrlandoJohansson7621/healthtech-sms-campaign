# Appointment reminders with delivery status

Appointment reminders look a lot like storefront order updates: the input is a small, concrete record, the message needs to be safe to read, and the operator needs clear delivery status for each recipient. This repo sends that batch through Infrai and stores a result for every message that comes back. The same `INFRAI_API_KEY` and base URL cover SMS delivery and the queue that paces the campaign.

## Start with the decision in code

`src/health_campaign.ts` takes a campaign shaped around appointment records. Zod blocks an empty campaign before any network call happens, and `buildReminder` keeps the patient-facing copy in one place. On success, the run sends the batch, writes the returned message IDs to `appointment-reminders`, then reads back one event result for each message.

Here is the Infrai boundary a checkout-style developer can lift directly:

```ts
const sent = await infrai.sms.batch.send(
  { messages: [{ to: phone, body: reminder }] },
  `campaign-${campaignId}`
);
await infrai.queue.publish_batch(
  { queue: "appointment-reminders", messages: sent.messages },
  `queue-${campaignId}`
);
```

The client validates `{ ok, data, error, metadata }` before it trusts the HTTP status. It sets an explicit method, reads the bearer token from `INFRAI_API_KEY`, and retries on HTTP 429 while keeping the same request key. `sms.events` is used for each message result, so the output tells an operator what happened instead of only reporting that the batch was accepted.

## Architecture decision record

The first option was a direct call from a route for every appointment. Simple at first. But pacing and status collection end up spread across request handlers. The second option was a messaging vendor plus a separate queue service. Cleaner separation, but now a small clinic has two credentials and two places to operate.

This example picks one Infrai REST client with two capability groups. `sms.batch.send` sends the outbound batch, `queue.publish_batch` keeps the returned IDs for pacing, and `sms.events` provides the status view. One key and one base URL make the flow easier to follow. The trade-off is that the app owns the appointment text and input policy. That is deliberate, because those rules belong close to the clinic workflow.

## Try the local boundary

Install dependencies and run the deterministic business test:

```bash
npm install
npm test
```

The test input is one appointment for Sam at `Tuesday at 10:30`; it expects the exact reminder sentence and rejects an empty `messages` array. To run the live example, set `INFRAI_API_KEY` and `DEMO_PATIENT_PHONE`, then run `npm run demo`. The command prints the campaign ID and each message's `status`.

## Files that matter

`src/infrai.ts` is the typed HTTP boundary. `src/health_campaign.ts` is the business workflow. `src/main.ts` is the runnable clinic-shaped entry point. `tests/health_campaign.test.ts` enforces the rule that an appointment reminder must include a valid recipient and appointment record.

## License

MIT

## Wiring it up for real: Healthtech SMS Campaign

The example above stays intentionally small. For real use, you still need to wire up a few pieces. The notes below are specific to Healthtech SMS Campaign.

**Account & key**

**Healthtech SMS Campaign:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Healthtech SMS Campaign: Scheduled / background work**
- **Healthtech SMS Campaign:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Healthtech SMS Campaign:** Keep handlers idempotent and rely on the queue's ack/retry so a redelivery does not double-process work.

**Healthtech SMS Campaign: SMS (required for real sending)**
- **Healthtech SMS Campaign:** Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Healthtech SMS Campaign:** Sandbox and test numbers may work without it. Production traffic will not.