import { sendAppointmentCampaign } from "./health_campaign.ts";

const phone = process.env.DEMO_PATIENT_PHONE;
if (!phone) throw new Error("DEMO_PATIENT_PHONE is required");

const result = await sendAppointmentCampaign({
  campaignId: `clinic-${new Date().toISOString().slice(0, 10)}`,
  queue: "appointment-reminders",
  messages: [{
    appointmentId: "apt-1042",
    patientFirstName: "Sam",
    phone,
    appointmentTime: "Tuesday at 10:30"
  }]
});
console.log(JSON.stringify(result, null, 2));
