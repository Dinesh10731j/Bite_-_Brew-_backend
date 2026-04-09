const NEWSLETTER_LOGO_URL =
  "https://res.cloudinary.com/dztcsje3w/image/upload/v1775622735/bite-brew/gallery/fd2hfqfyyppvym14fkgt.jpg";

type NewsletterWelcomeTemplateInput = {
  email: string;
};

export type NewsletterCampaignTemplateInput = {
  headline: string;
  intro?: string;
  offerTitle?: string;
  offerDescription?: string;
  events?: string[];
  couponCode?: string;
  validUntil?: string;
  ctaText?: string;
  ctaUrl?: string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeUrl = (value?: string): string => {
  if (!value) return "#";
  const trimmed = value.trim();
  if (!trimmed) return "#";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return "#";
  } catch (_error) {
    return "#";
  }
};

export const buildNewsletterWelcomeTemplate = ({ email }: NewsletterWelcomeTemplateInput): string => {
  const safeEmail = escapeHtml(email);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to Bite Brew Cafe</title>
  </head>
  <body style="margin:0;padding:0;background:#f6efe7;font-family:Arial,Helvetica,sans-serif;color:#2d1f17;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6efe7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8dccf;">
            <tr>
              <td style="background:linear-gradient(135deg,#3a2a1f,#7a4a2a);padding:28px 24px;text-align:center;">
                <img src="${NEWSLETTER_LOGO_URL}" alt="Bite Brew Cafe" width="92" height="92" style="display:block;margin:0 auto 14px auto;border-radius:50%;border:3px solid #f4d9b7;object-fit:cover;" />
                <h1 style="margin:0;color:#ffe9d1;font-size:28px;line-height:1.2;letter-spacing:0.4px;">Bite Brew Cafe</h1>
                <p style="margin:8px 0 0 0;color:#f7dbc1;font-size:14px;line-height:1.6;">Fresh Brews, Warm Meals, Cozy Moments</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 26px 14px 26px;">
                <p style="margin:0 0 10px 0;font-size:14px;color:#8a5a3b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">You are in</p>
                <h2 style="margin:0 0 14px 0;font-size:26px;line-height:1.25;color:#2d1f17;">Welcome to our newsletter</h2>
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#4b3428;">
                  Thanks for subscribing with <strong>${safeEmail}</strong>. You will now receive weekly updates with seasonal specials,
                  chef picks, coffee stories, and members-only offers from Bite Brew Cafe.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;background:#fff7ef;border:1px solid #ecdcca;border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 8px 0;font-size:15px;font-weight:bold;color:#5a3828;">What you will get</p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#4f3b2f;">New menu highlights, weekend event alerts, and surprise coupon drops.</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:14px;line-height:1.8;color:#614737;">
                  We are excited to have you in our cafe circle.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 26px 30px 26px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#7a4a2a;border-radius:10px;">
                      <a href="#" style="display:inline-block;padding:12px 18px;color:#fff7ef;font-size:14px;font-weight:bold;text-decoration:none;">See Today's Specials</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0;font-size:12px;color:#8e6d57;line-height:1.6;">
                  This email was sent by Bite Brew Cafe Newsletter.
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

export const buildNewsletterCampaignTemplate = (input: NewsletterCampaignTemplateInput): string => {
  const headline = escapeHtml(input.headline);
  const intro = escapeHtml(input.intro || "Fresh updates from Bite Brew Cafe are here for you.");
  const offerTitle = escapeHtml(input.offerTitle || "Special Offer");
  const offerDescription = escapeHtml(input.offerDescription || "Enjoy handcrafted coffee, fresh food, and cozy moments.");
  const couponCode = input.couponCode ? escapeHtml(input.couponCode) : "";
  const validUntil = input.validUntil ? escapeHtml(input.validUntil) : "";
  const ctaText = escapeHtml(input.ctaText || "Grab This Offer");
  const ctaUrl = normalizeUrl(input.ctaUrl);
  const events = Array.isArray(input.events)
    ? input.events.map((event) => escapeHtml(event)).filter((event) => event.length > 0).slice(0, 8)
    : [];

  const eventRows = events
    .map(
      (event) => `
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#4a342a;line-height:1.6;">- ${event}</td>
        </tr>`,
    )
    .join("");

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${headline}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6efe7;font-family:Arial,Helvetica,sans-serif;color:#2d1f17;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6efe7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8dccf;">
            <tr>
              <td style="background:linear-gradient(135deg,#20130d,#8a4d27);padding:26px 22px;text-align:center;">
                <img src="${NEWSLETTER_LOGO_URL}" alt="Bite Brew Cafe" width="88" height="88" style="display:block;margin:0 auto 14px auto;border-radius:50%;border:3px solid #f4d9b7;object-fit:cover;" />
                <h1 style="margin:0;color:#ffe9d1;font-size:30px;line-height:1.25;">${headline}</h1>
                <p style="margin:10px 0 0 0;color:#f7dbc1;font-size:14px;line-height:1.7;">Bite Brew Cafe Promotions</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px 10px 24px;">
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.8;color:#4b3428;">${intro}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ef;border-radius:14px;border:1px solid #ecdcca;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 6px 0;font-size:18px;line-height:1.4;font-weight:700;color:#6c3f24;">${offerTitle}</p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#4f3b2f;">${offerDescription}</p>
                      ${couponCode ? `<p style="margin:12px 0 0 0;font-size:13px;color:#3d2a20;"><strong>Coupon:</strong> ${couponCode}</p>` : ""}
                      ${validUntil ? `<p style="margin:8px 0 0 0;font-size:13px;color:#3d2a20;"><strong>Valid Till:</strong> ${validUntil}</p>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${
              events.length > 0
                ? `<tr>
              <td style="padding:8px 24px 0 24px;">
                <p style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#6c3f24;">Upcoming Events</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${eventRows}
                </table>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:22px 24px 30px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#7a4a2a;border-radius:10px;">
                      <a href="${ctaUrl}" style="display:inline-block;padding:12px 20px;color:#fff7ef;font-size:14px;font-weight:bold;text-decoration:none;">${ctaText}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0;font-size:12px;color:#8e6d57;line-height:1.6;">
                  You received this because you subscribed to Bite Brew Cafe or registered an account with us.
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
