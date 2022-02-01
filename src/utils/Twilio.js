const { config } = require('firebase-functions');
const from = config().api.twilio_phone_number;
import { twilioClient } from '../server';

export const sendSMSMessage = async (text, number) => {
  try {
    const { status } = await twilioClient.messages.create({ body: text, from, to: number });
    return status;
  } catch (e) {
    throw e;
  }
};
