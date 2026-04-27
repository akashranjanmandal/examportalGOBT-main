import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const BASE_STYLE = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f5; color: #18181b; }
    .wrapper { max-width: 560px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
    .body { padding: 40px 44px; }
    p { font-size: 15px; line-height: 1.7; color: #3f3f46; margin-bottom: 16px; }
    .name { font-size: 16px; color: #18181b; font-weight: 600; margin-bottom: 20px; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 28px 0; }
    .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #a1a1aa; margin-bottom: 3px; }
    .field-value { font-size: 15px; color: #18181b; font-weight: 500; margin-bottom: 16px; }
    .code-block { background-color: #f4f4f5; border-radius: 6px; padding: 18px 24px; text-align: center; margin: 24px 0; }
    .code { font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #18181b; }
    .sign-off { font-size: 15px; color: #3f3f46; margin-top: 28px; }
  </style>
`;

export async function sendAccessCodeEmail(params: {
  to: string;
  name: string;
  accessCode: string;
  examDate: string;
  examTime: string;
  duration: string;
}) {
  const { to, name, accessCode, examDate, examTime, duration } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>${BASE_STYLE}</head>
<body>
<div class="wrapper">
  <div class="body">
    <p class="name">Dear ${name},</p>
    <p>You have been selected to appear for the GOBT Developer Assessment. Please find your login details below.</p>
    <hr class="divider" />
    <div class="field-label">Access Code</div>
    <div class="code-block"><span class="code">${accessCode}</span></div>
    <div class="field-label">Portal</div>
    <div class="field-value">exam.gobt.in</div>
    <div class="field-label">Date</div>
    <div class="field-value">${examDate}</div>
    <div class="field-label">Time</div>
    <div class="field-value">${examTime}</div>
    <div class="field-label">Duration</div>
    <div class="field-value">${duration}</div>
    <hr class="divider" />
    <p>Please use your registered email address along with the access code above to log in. The exam must be taken on a desktop or laptop using Google Chrome.</p>
    <p class="sign-off">Regards,<br/>GOBT Team</p>
  </div>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `GOBT Developer Assessment – Login Details`,
    html,
  });
}

export async function sendVerificationStatusEmail(params: {
  to: string;
  name: string;
  status: "verified" | "rejected" | "submitted";
  marks?: number;
}) {
  const { to, name, status, marks } = params;
  const isVerified = status === "verified";
  const isSubmitted = status === "submitted";

  const html = `
<!DOCTYPE html>
<html>
<head>${BASE_STYLE}</head>
<body>
<div class="wrapper">
  <div class="body">
    <p class="name">Dear ${name},</p>
    ${isVerified
      ? `<p>We are pleased to inform you that you have successfully cleared the GOBT Developer Assessment.${marks !== undefined ? ` Your total score is <strong>${marks} points</strong>.` : ''}</p>
         <p>Our team will be in touch with you shortly regarding the next steps.</p>`
      : isSubmitted
        ? `<p>Thank you for appearing in the GOBT Developer Assessment. We have received your submission.${marks !== undefined ? ` Your total score is <strong>${marks} points</strong>.` : ''}</p>
         <p>Our team is currently reviewing your performance and will get back to you soon with the results.</p>`
        : `<p>Thank you for appearing in the GOBT Developer Assessment.</p>
         <p>After reviewing your submission, we regret to inform you that we will not be moving forward at this time. We appreciate the effort you put in and encourage you to apply for future opportunities.</p>`
    }
    <p class="sign-off">Regards,<br/>GOBT Team</p>
  </div>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: isVerified ? `GOBT Developer Assessment – Result` : isSubmitted ? `GOBT Developer Assessment – Submission Received` : `GOBT Developer Assessment – Update`,
    html,
  });
}

export async function sendExamReminderEmail(params: {
  to: string;
  name: string;
  examDate: string;
  examTime: string;
}) {
  const { to, name, examDate, examTime } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>${BASE_STYLE}</head>
<body>
<div class="wrapper">
  <div class="body">
    <p class="name">Dear ${name},</p>
    <p>This is a reminder that your GOBT Developer Assessment is scheduled for <strong>${examDate}</strong> at <strong>${examTime}</strong>.</p>
    <p>Please log in to <strong>exam.gobt.in</strong> using your registered email and access code at the scheduled time. Use a desktop or laptop with Google Chrome.</p>
    <p><b>Note:<b>Make sure have Python/Java installed in your laptop<p>
    <p class="sign-off">Regards,<br/>GOBT Team</p>
  </div>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `GOBT Developer Assessment – Reminder`,
    html,
  });
}
