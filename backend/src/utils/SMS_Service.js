/**
 * 📱 SMS Service Placeholder
 * Currently logs to console. Integrated with future providers (e.g., ElitBuzz, Twilio).
 */
const SMS_Service = {
  /**
   * Send an OTP to a phone number
   * @param {string} phone - Target phone number
   * @param {string} otp - The OTP code
   */
  sendOTP: async (phone, otp) => {
    console.log(`[SMS_Service] SENDING OTP to ${phone}: Your BTG verification code is ${otp}`);
    // Future integration:
    // await axios.post(ELITBUZZ_API, { to: phone, msg: `Code: ${otp}` });
    return true;
  },

  /**
   * Send a generic message
   */
  sendMessage: async (phone, message) => {
    console.log(`[SMS_Service] SENDING MSG to ${phone}: ${message}`);
    return true;
  }
};

module.exports = SMS_Service;
