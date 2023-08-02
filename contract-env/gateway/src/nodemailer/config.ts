import nodemailer from 'nodemailer';

export const client = () => {
  return nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.MAIL,
      pass: process.env.GATEWAY_APP_PASSWORD,
    },
  });
};
