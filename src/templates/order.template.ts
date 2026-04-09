import { PaymentMethod } from "../constant/enum.constant";

type SupportedOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export type OrderConfirmationTemplateInput = {
  customerName: string;
  orderId: string;
  orderType: SupportedOrderType;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  itemCount: number;
  tableNumber?: string;
  deliveryAddress?: string;
};

const BRAND_NAME = "Bite Brew Cafe";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatOrderType = (orderType: SupportedOrderType): string => {
  switch (orderType) {
    case "DINE_IN":
      return "Dine In";
    case "TAKEAWAY":
      return "Takeaway";
    case "DELIVERY":
      return "Delivery";
    default:
      return orderType;
  }
};

const formatPaymentMethod = (value: PaymentMethod): string => {
  switch (value) {
    case PaymentMethod.CARD:
      return "Card";
    case PaymentMethod.UPI:
      return "UPI";
    default:
      return "Cash";
  }
};

const formatCurrency = (amount: number): string => `Rs ${amount.toFixed(2)}`;

const getEmotionLine = (orderType: SupportedOrderType): string => {
  switch (orderType) {
    case "DINE_IN":
      return "Your table experience is being prepared with care and attention.";
    case "TAKEAWAY":
      return "Your pickup order is locked in, and we are already moving on it.";
    case "DELIVERY":
      return "Your delivery order is confirmed, and we will bring comfort right to your door.";
    default:
      return "Your order is confirmed and in trusted hands.";
  }
};

const getNextStepLine = (input: OrderConfirmationTemplateInput): string => {
  switch (input.orderType) {
    case "DINE_IN":
      return input.tableNumber
        ? `Table ${escapeHtml(input.tableNumber)} is noted for your service.`
        : "Our team will guide your table service smoothly.";
    case "TAKEAWAY":
      return "Keep this order ID ready at pickup for a faster handoff.";
    case "DELIVERY":
      return input.deliveryAddress
        ? `Delivery location: ${escapeHtml(input.deliveryAddress)}`
        : "Our rider will deliver to your shared address.";
    default:
      return "";
  }
};

export const buildOrderConfirmationTemplate = (input: OrderConfirmationTemplateInput): string => {
  const customerName = escapeHtml(input.customerName || "Customer");
  const orderId = escapeHtml(input.orderId);
  const orderType = formatOrderType(input.orderType);
  const paymentMethod = formatPaymentMethod(input.paymentMethod);
  const emotionLine = getEmotionLine(input.orderType);
  const nextStepLine = getNextStepLine(input);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your order is confirmed</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe8;font-family:Arial,Helvetica,sans-serif;color:#2b1d14;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4efe8;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #eadbc8;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#2b1d14,#7a4a2a);padding:28px 24px;text-align:center;">
                <h1 style="margin:0;color:#ffe8cc;font-size:30px;line-height:1.2;">${BRAND_NAME}</h1>
                <p style="margin:8px 0 0 0;color:#f9dcb8;font-size:14px;line-height:1.7;">Order Confirmation</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px 8px 24px;">
                <p style="margin:0 0 8px 0;font-size:16px;line-height:1.7;">Hi ${customerName},</p>
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.8;color:#4a3529;">
                  Your order is successfully placed. ${escapeHtml(emotionLine)}
                </p>
                <p style="margin:0;font-size:14px;line-height:1.8;color:#5b4030;">
                  Small certainty lowers waiting stress: your order ID is <strong>#${orderId}</strong>, and our team is on it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #eadbc8;border-radius:12px;background:#fff8f1;">
                  <tr>
                    <td style="padding:14px 16px;font-size:14px;line-height:1.8;color:#3f2c20;">
                      <strong>Order Type:</strong> ${orderType}<br/>
                      <strong>Items:</strong> ${input.itemCount}<br/>
                      <strong>Payment:</strong> ${paymentMethod}<br/>
                      <strong>Total:</strong> ${formatCurrency(input.totalPrice)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 24px 24px 24px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.8;color:#4a3529;">
                  <strong>What happens next:</strong> ${nextStepLine}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#7a5f4d;">
                  Thank you for trusting ${BRAND_NAME}. We look forward to making this meal a good moment in your day.
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

