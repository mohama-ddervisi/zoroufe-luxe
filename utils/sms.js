const Kavenegar = require('kavenegar');

const api = Kavenegar.KavenegarApi({
  apikey: process.env.KAVENEGAR_API_KEY
});

function sendSms(phone, code) {
  return new Promise((resolve, reject) => {
    api.VerifyLookup({
      receptor: phone,
      token: code,
      template: 'zoroufeotp'
    }, function (response, status) {
      if (status === 200) {
        resolve(response);
      } else {
        reject(new Error('ارسال پیامک ناموفق بود - کد وضعیت: ' + status));
      }
    });
  });
}

module.exports = { sendSms };