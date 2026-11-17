import assert from "node:assert/strict";
import { appointmentCampaignSchema, buildReminder } from "../src/health_campaign.ts";

const appointment = {
  appointmentId: "apt-1042",
  patientFirstName: "Sam",
  phone: "+15551234567",
  appointmentTime: "Tuesday at 10:30"
};

assert.equal(buildReminder(appointment), "Hi Sam, this is a reminder for appointment apt-1042 at Tuesday at 10:30. Reply to your clinic if you need help.");
assert.equal(appointmentCampaignSchema.safeParse({ campaignId: "clinic-1", queue: "appointment-reminders", messages: [appointment] }).success, true);
assert.equal(appointmentCampaignSchema.safeParse({ campaignId: "clinic-1", queue: "appointment-reminders", messages: [] }).success, false);
console.log("health campaign decision test passed");
