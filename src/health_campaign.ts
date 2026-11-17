import { z } from "zod";
import { infrai } from "./infrai.ts";

export const appointmentCampaignSchema = z.object({
  campaignId: z.string().min(1),
  queue: z.string().min(1),
  messages: z.array(z.object({
    appointmentId: z.string().min(1),
    patientFirstName: z.string().min(1),
    phone: z.string().min(7),
    appointmentTime: z.string().min(1)
  })).min(1)
});

export type AppointmentCampaign = z.infer<typeof appointmentCampaignSchema>;

export function buildReminder(message: AppointmentCampaign["messages"][number]): string {
  return `Hi ${message.patientFirstName}, this is a reminder for appointment ${message.appointmentId} at ${message.appointmentTime}. Reply to your clinic if you need help.`;
}

export async function sendAppointmentCampaign(input: unknown) {
  const campaign = appointmentCampaignSchema.parse(input);
  const batch = campaign.messages.map((message) => ({ to: message.phone, body: buildReminder(message) }));
  const sent = await infrai.sms.batch.send({ messages: batch }, `campaign-${campaign.campaignId}`);
  await infrai.queue.publish_batch({
    queue: campaign.queue,
    messages: sent.messages.map((message) => ({ message_id: message.message_id, campaign_id: campaign.campaignId }))
  }, `queue-${campaign.campaignId}`);

  const statuses = await Promise.all(sent.messages.map(async (message) => ({
    message_id: message.message_id,
    to: message.to,
    ...(await infrai.sms.events(message.message_id, `status-${message.message_id}`))
  })));
  return { campaignId: campaign.campaignId, statuses };
}
