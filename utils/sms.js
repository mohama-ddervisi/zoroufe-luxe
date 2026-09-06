const Kavenegar = require('kavenegar');

const api = Kavenegar.KavenegarApi({
  apikey: process.env.KAVENEGAR_API_KEY
});

function sendSms(phone, code) {
  return new Promise((resolve, reject) => {
    api.Send({
      message: `کد تایید زوروفه: ${code}`,
      sender: '10004346',
      receptor: phone
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