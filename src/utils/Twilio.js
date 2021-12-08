const twilio = require('twilio');
const { config } = require('firebase-functions');
const accountSid = config().api.twilio_account_sid;
const authToken = config().api.twilio_auth_token;
const from = config().api.twilio_phone_number;
const client = twilio(accountSid, authToken);

export const sendSMSMessage = async (text, number) => {
  try {
    const { status } = await client.messages.create({ body: text, from, to: number });
    return status;
  } catch (e) {
    throw e;
  }
};
