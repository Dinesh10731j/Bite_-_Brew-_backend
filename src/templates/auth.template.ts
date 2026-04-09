type ResetPasswordTemplateInput = {
  name: string;
  resetUrl: string;
  appName?: string;
  supportEmail?: string;
  expiresInMinutes?: number;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildResetPasswordTemplate = ({
  name,
  resetUrl,
  appName = "Bite Brew Cafe",
  supportEmail = "support@bitebrew.local",
  expiresInMinutes = 60,
}: ResetPasswordTemplateInput): string => {
  const safeName = escapeHtml(name || "User");
  const safeAppName = escapeHtml(appName);
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeResetUrl = escapeHtml(resetUrl);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;padding:0;background:#f6efe7;font-family:Arial,Helvetica,sans-serif;color:#2d1f17;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6efe7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e8dccf;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px;background:linear-gradient(135deg,#2b1b13,#7a4a2a);text-align:center;">
                <h1 style="margin:0;color:#ffe9d1;font-size:24px;line-height:1.3;">${safeAppName}</h1>
                <p style="margin:8px 0 0 0;color:#f7dbc1;font-size:14px;">Password Reset Request</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;">Hello ${safeName},</p>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">
                  We received a request to reset your password. Click the button below to set a new one.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;">
                  <tr>
                    <td style="background:#7a4a2a;border-radius:10px;">
                      <a href="${safeResetUrl}" style="display:inline-block;padding:12px 18px;color:#fff7ef;font-size:14px;font-weight:bold;text-decoration:none;">Reset Password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.7;color:#5a463a;">
                  This link expires in ${expiresInMinutes} minutes.
                </p>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.7;color:#5a463a;">
                  If the button does not work, copy and paste this URL into your browser:
                </p>
                <p style="margin:0 0 18px 0;font-size:12px;line-height:1.6;word-break:break-all;color:#4a342a;">
                  <a href="${safeResetUrl}" style="color:#7a4a2a;">${safeResetUrl}</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:#7d6352;">
                  If you did not request this, you can ignore this email. Need help? Contact ${safeSupportEmail}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

export const buildResetPasswordTextTemplate = ({
  name,
  resetUrl,
  appName = "Bite Brew Cafe",
  supportEmail = "support@bitebrew.local",
  expiresInMinutes = 60,
}: ResetPasswordTemplateInput): string => {
  return [
    `Hello ${name || "User"},`,
    "",
    `We received a password reset request for your ${appName} account.`,
    `Use the link below to reset your password (valid for ${expiresInMinutes} minutes):`,
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
    `Support: ${supportEmail}`,
  ].join("\n");
};

