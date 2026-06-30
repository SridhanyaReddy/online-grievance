const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.log('WARNING: Email settings are missing in your environment. NodeMailer will run in simulated development console-log mode.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail', // or custom SMTP settings
    auth: { user, pass }
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"Grievance Redressal Portal" <${process.env.EMAIL_USER || 'no-reply@grievance.gov'}>`,
    to,
    subject,
    text: text || 'This is an automated notification from the Grievance Redressal Portal.',
    html
  };

  if (!transporter) {
    console.log('\n--- SIMULATED OUTGOING EMAIL ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text || html.replace(/<[^>]*>/g, '')}`);
    console.log('--------------------------------\n');
    return { messageId: 'simulated-id-' + Date.now() };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    // Return simulated response instead of crashing
    return { error: error.message };
  }
};

module.exports = { sendEmail };
