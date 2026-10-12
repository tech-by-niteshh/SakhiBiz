export interface OtpEmailOptions {
  otp: string;
  recipientName?: string;
  purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
  expiryMinutes?: number;
  senderEmail?: string;
}

export function generateOtpEmail(options: OtpEmailOptions): { subject: string; html: string; text: string } {
  const {
    otp,
    recipientName = 'उद्यमी (Entrepreneur)',
    purpose,
    expiryMinutes = 5,
    senderEmail = process.env.BREVO_SENDER_EMAIL || 'authentication@sakhibiz.xyz',
  } = options;

  const isReset = purpose === 'RESET_PASSWORD';
  const subject = isReset
    ? `[SakhiBiz] पासवर्ड रीसेट कोड (Password Reset Code): ${otp}`
    : `[SakhiBiz] ईमेल सत्यापन कोड (Email Verification Code): ${otp}`;

  const titleHi = isReset ? 'पासवर्ड रीसेट अनुरोध' : 'सखीबिज़ में आपका स्वागत है!';
  const titleEn = isReset ? 'Password Reset Request' : 'Welcome to SakhiBiz!';

  const descriptionHi = isReset
    ? 'आपने अपने सखीबिज़ खाते का पासवर्ड रीसेट करने का अनुरोध किया है। कृपया नीचे दिए गए 6-अंकीय सत्यापन कोड (OTP) का उपयोग करें:'
    : 'सखीबिज़ महिला उद्यमिता मंच पर आपका स्वागत है। अपने ईमेल पते की पुष्टि करने के लिए नीचे दिए गए 6-अंकीय सत्यापन कोड (OTP) का उपयोग करें:';

  const descriptionEn = isReset
    ? 'We received a request to reset your SakhiBiz account password. Please use the 6-digit verification code below:'
    : 'Welcome to the SakhiBiz women entrepreneurship platform. Please use the 6-digit verification code below to verify your email address:';

  const warningHi = isReset
    ? 'यदि आपने यह अनुरोध नहीं किया था, तो कृपया इस ईमेल को अनदेखा करें। आपका पासवर्ड सुरक्षित रहेगा।'
    : 'यदि आपने यह खाता नहीं बनाया था, तो कृपया इस ईमेल को अनदेखा करें।';

  const warningEn = isReset
    ? 'If you did not make this request, please ignore this email. Your password will remain secure.'
    : 'If you did not create this account, please disregard this email.';

  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f7f9f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D3748;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f9f6;
      padding: 30px 15px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px rgba(24, 57, 43, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #18392B 0%, #2D5A47 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      color: #F4F1DE;
    }
    .brand-tagline {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
      color: #ffffff;
      font-weight: 500;
    }
    .body {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #18392B;
      margin-bottom: 12px;
    }
    .text-p {
      font-size: 14px;
      color: #4A5568;
      margin-bottom: 12px;
    }
    .otp-container {
      margin: 28px 0;
      text-align: center;
      background-color: #FDFBF7;
      border: 2px dashed #E07A5F;
      border-radius: 16px;
      padding: 24px 16px;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #E07A5F;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #18392B;
      padding-left: 10px;
      display: inline-block;
    }
    .expiry-note {
      font-size: 12px;
      color: #718096;
      margin-top: 10px;
    }
    .expiry-badge {
      display: inline-block;
      background-color: #FFF5F2;
      color: #C53030;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
    }
    .security-notice {
      background-color: #F8FAFC;
      border-left: 4px solid #18392B;
      padding: 14px 16px;
      border-radius: 0 10px 10px 0;
      font-size: 12px;
      color: #4A5568;
      margin-top: 24px;
    }
    .footer {
      background-color: #FAFAFA;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #EDF2F7;
      font-size: 11px;
      color: #A0AEC0;
    }
    .footer a {
      color: #18392B;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="brand-name">SakhiBiz • सखीबिज़</h1>
        <div class="brand-tagline">महिला उद्यमिता और डिजिटल कौशल मंच</div>
      </div>
      <div class="body">
        <div class="greeting">नमस्ते, ${recipientName}</div>
        <div class="text-p"><strong>${titleHi}</strong></div>
        <div class="text-p">${descriptionHi}</div>
        <div class="text-p" style="font-size: 13px; color: #718096;"><em>${descriptionEn}</em></div>

        <div class="otp-container">
          <div class="otp-label">आपका सत्यापन कोड • Your OTP Code</div>
          <div class="otp-code">${otp}</div>
          <div class="expiry-note">
            <span class="expiry-badge">⏱️ ${expiryMinutes} मिनट के लिए मान्य (Valid for ${expiryMinutes} min)</span>
          </div>
        </div>

        <div class="security-notice">
          <strong>सुरक्षा निर्देश (Security Notice):</strong>
          <ul style="margin: 6px 0 0 18px; padding: 0;">
            <li>यह कोड किसी के साथ साझा न करें (Do not share this code).</li>
            <li>सखीबिज़ टीम आपसे कभी आपका OTP नहीं मांगेगी।</li>
            <li>${warningHi}</li>
            <li><em>${warningEn}</em></li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <div>© ${new Date().getFullYear()} SakhiBiz Platform. All rights reserved.</div>
        <div style="margin-top: 4px;">SakhiBiz Grassroots Entrepreneurship • contact: ${senderEmail}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `SakhiBiz • सखीबिज़
======================================
नमस्ते, ${recipientName}

${titleHi} / ${titleEn}
${descriptionHi}

>> आपका सत्यापन कोड (OTP): ${otp} <<

वैधता: यह कोड ${expiryMinutes} मिनट के लिए वैध है (Valid for ${expiryMinutes} minutes).

सुरक्षा निर्देश:
- यह OTP किसी के साथ भी साझा न करें।
- सखीबिज़ टीम आपसे कभी OTP नहीं मांगती।
- ${warningHi}

SakhiBiz Platform — ${senderEmail}
`;

  return { subject, html, text };
}
