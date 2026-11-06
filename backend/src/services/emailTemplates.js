// Reusable email templates for Aura Fashion Clothing E-Commerce
const BRAND_COLOR = '#832729'; // Deep Wine / Royal Crimson
const ACCENT_GOLD = '#D4AF37'; // Gold
const BG_LIGHT = '#FAF9F6'; // Warm Cream
const SHOP_PHONE = '+91 7022018850';
const SHOP_EMAIL = 'shoppe.aurafashion@gmail.com';
const SHOP_LOCATION = 'Bengaluru, Karnataka, India';

// Base layout wrapper with luxury styling
const baseLayout = ({ title, preheader = '', content, clientUrl = 'http://localhost:5173' }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${BG_LIGHT}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: ${BRAND_COLOR}; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 12px !important; }
      .stack-col { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_LIGHT};">
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px;">
    ${preheader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${BG_LIGHT}; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table class="container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e7e5e4;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: ${BRAND_COLOR}; padding: 32px 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; letter-spacing: 4px; color: #ffffff; text-transform: uppercase; display: block;">
                      AURA FASHION
                    </span>
                    <span style="font-size: 10px; font-weight: 600; letter-spacing: 3px; color: ${ACCENT_GOLD}; text-transform: uppercase; margin-top: 6px; display: block;">
                      Bengaluru • Curated Elegance
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold Accent Border Line -->
          <tr>
            <td style="background: linear-gradient(90deg, ${ACCENT_GOLD} 0%, #F5E6AB 50%, ${ACCENT_GOLD} 100%); height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f4; padding: 24px 32px; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #44403c;">
                Aura Fashion Bengaluru Studio
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #78716c; line-height: 18px;">
                Customer Support: <a href="tel:${SHOP_PHONE}" style="color: ${BRAND_COLOR}; font-weight: 600;">${SHOP_PHONE}</a> | WhatsApp Available<br>
                Email: <a href="mailto:${SHOP_EMAIL}" style="color: ${BRAND_COLOR}; font-weight: 600;">${SHOP_EMAIL}</a><br>
                Location: ${SHOP_LOCATION}
              </p>
              <p style="margin: 0; font-size: 11px; color: #a8a29e;">
                &copy; ${new Date().getFullYear()} Aura Fashion. All rights reserved. Handcrafted fashion and luxury apparel.
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

// Helper: Format price in INR
const formatCurrency = (amt) => `₹${Number(amt || 0).toLocaleString('en-IN')}`;

// Helper: Order Items Table
const renderOrderItemsTable = (items = []) => {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 20px; border: 1px solid #e7e5e4; border-radius: 10px; overflow: hidden;">
      <tr style="background-color: #fafaf9; border-bottom: 1px solid #e7e5e4;">
        <th align="left" style="padding: 12px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716c;">Item</th>
        <th align="center" style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716c;">Variant</th>
        <th align="center" style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716c;">Qty</th>
        <th align="right" style="padding: 12px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716c;">Total</th>
      </tr>
      ${items
        .map(
          (item) => `
        <tr style="border-bottom: 1px solid #f5f5f4;">
          <td style="padding: 14px; font-size: 13px; color: #1c1917;">
            <strong>${item.productName}</strong>
            ${item.sku ? `<div style="font-size: 11px; color: #a8a29e; margin-top: 2px;">SKU: ${item.sku}</div>` : ''}
          </td>
          <td align="center" style="padding: 14px; font-size: 12px; color: #57534e;">
            <span style="background: #f5f5f4; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Size: ${item.size}</span>
            <div style="margin-top: 4px; font-size: 11px; color: #78716c;">${item.color}</div>
          </td>
          <td align="center" style="padding: 14px; font-size: 13px; color: #1c1917; font-weight: 600;">
            ${item.quantity}
          </td>
          <td align="right" style="padding: 14px; font-size: 13px; font-weight: bold; color: ${BRAND_COLOR};">
            ${formatCurrency(item.subtotal)}
          </td>
        </tr>
      `
        )
        .join('')}
    </table>
  `;
};

// Helper: Pricing Summary Box
const renderPricingSummary = (pricing = {}, paymentMethod = 'COD') => {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 18px; background-color: #fafaf9; border-radius: 10px; padding: 14px 18px; border: 1px solid #e7e5e4;">
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #57534e;">Items Subtotal</td>
        <td align="right" style="padding: 4px 0; font-size: 13px; color: #1c1917; font-weight: 600;">${formatCurrency(pricing.itemsTotal)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #57534e;">Delivery Fee</td>
        <td align="right" style="padding: 4px 0; font-size: 13px; color: ${pricing.deliveryCharge === 0 ? '#15803d' : '#1c1917'}; font-weight: 600;">
          ${pricing.deliveryCharge === 0 ? 'FREE' : formatCurrency(pricing.deliveryCharge)}
        </td>
      </tr>
      ${
        pricing.discountAmount > 0
          ? `
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #15803d;">Coupon Discount ${pricing.couponCode ? `(${pricing.couponCode})` : ''}</td>
        <td align="right" style="padding: 4px 0; font-size: 13px; color: #15803d; font-weight: 600;">-${formatCurrency(pricing.discountAmount)}</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td colspan="2" style="padding: 8px 0 6px 0;"><div style="border-top: 1px solid #e7e5e4;"></div></td>
      </tr>
      <tr>
        <td style="font-size: 15px; font-weight: bold; color: #1c1917;">Grand Total</td>
        <td align="right" style="font-size: 17px; font-weight: bold; color: ${BRAND_COLOR};">${formatCurrency(pricing.grandTotal)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top: 6px; font-size: 11px; color: #78716c;">
          Payment Method: <strong>${paymentMethod === 'RAZORPAY' ? 'Prepaid Online (Razorpay)' : 'Cash on Delivery (COD)'}</strong>
        </td>
      </tr>
    </table>
  `;
};

// Helper: Delivery Address Card
const renderAddressCard = (addr = {}) => {
  return `
    <div style="margin-top: 20px; background-color: #fafaf9; border-radius: 10px; padding: 14px 18px; border: 1px solid #e7e5e4;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #78716c; margin-bottom: 6px;">
        Shipping Destination
      </div>
      <div style="font-size: 13px; font-weight: bold; color: #1c1917;">${addr.fullName || ''}</div>
      <div style="font-size: 12px; color: #57534e; line-height: 18px; margin-top: 3px;">
        ${addr.houseNo ? `${addr.houseNo}, ` : ''}${addr.street || ''}<br>
        ${addr.landmark ? `Landmark: ${addr.landmark}<br>` : ''}
        ${addr.city || ''}, ${addr.state || ''} - <strong>${addr.pincode || ''}</strong><br>
        Phone: <strong>${addr.phone || ''}</strong>
      </div>
    </div>
  `;
};

// 1. WELCOME EMAIL
export const welcomeEmailTemplate = ({ customerName, clientUrl = 'http://localhost:5173' }) => {
  const content = `
    <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1c1917; margin: 0 0 12px 0;">
      Welcome to Aura Fashion, ${customerName}!
    </h2>
    <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 20px 0;">
      Thank you for joining our community of discerning fashion lovers. At Aura Fashion, we take immense pride in crafting exquisite, handpicked garments from our Bengaluru studio — blending modern aesthetics with regal craftsmanship.
    </p>

    <div style="background-color: #FAF9F6; border-left: 4px solid ${BRAND_COLOR}; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #44403c; line-height: 20px;">
        ✨ <strong>New Member Benefit:</strong> Use code <strong style="color: ${BRAND_COLOR};">AURA10</strong> at checkout to enjoy <strong>10% OFF</strong> on your very first order!
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${clientUrl}/shop" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 14px 32px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px; box-shadow: 0 4px 12px rgba(131, 39, 41, 0.25);">
        Explore Collections
      </a>
    </div>
  `;

  return {
    subject: 'Welcome to Aura Fashion | Curated Luxury Apparel',
    html: baseLayout({ title: 'Welcome to Aura Fashion', preheader: 'Welcome to Aura Fashion! Enjoy 10% off your first order.', content, clientUrl }),
    text: `Welcome to Aura Fashion, ${customerName}!\n\nThank you for joining our community. Use code AURA10 at checkout to enjoy 10% off on your first order.\n\nShop collections: ${clientUrl}/shop\n\nCustomer Support: ${SHOP_PHONE} | ${SHOP_EMAIL}`
  };
};

// 2. ORDER CONFIRMATION / PLACED EMAIL
export const orderConfirmationTemplate = ({ order, clientUrl = 'http://localhost:5173' }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        Order Placed Successfully
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1c1917; margin: 12px 0 4px 0;">
        Thank You, ${order.customerInfo?.name}!
      </h2>
      <p style="font-size: 13px; color: #78716c; margin: 0;">
        Order #${order.orderNumber} • ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>

    <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 16px 0;">
      We have received your order and our Bengaluru studio team is already preparing your garments with the utmost care. Below is your complete order summary.
    </p>

    ${renderOrderItemsTable(order.items)}
    ${renderPricingSummary(order.pricing, order.paymentMethod)}
    ${renderAddressCard(order.shippingAddress)}

    <div style="text-align: center; margin: 32px 0 10px 0;">
      <a href="${clientUrl}/orders" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        Track Your Order
      </a>
    </div>
  `;

  return {
    subject: `Order Confirmed: #${order.orderNumber} - Aura Fashion`,
    html: baseLayout({ title: `Order Confirmation #${order.orderNumber}`, preheader: `Your Aura Fashion order #${order.orderNumber} has been placed successfully.`, content, clientUrl }),
    text: `Order Confirmed: #${order.orderNumber}\n\nThank you, ${order.customerInfo?.name}!\nTotal: ${formatCurrency(order.pricing?.grandTotal)}\nTrack your order at: ${clientUrl}/orders\n\nCustomer Support: ${SHOP_PHONE}`
  };
};

// 3. PAYMENT CONFIRMATION EMAIL (Razorpay)
export const paymentConfirmationTemplate = ({ order, clientUrl = 'http://localhost:5173' }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        Payment Received ✓
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1c1917; margin: 12px 0 4px 0;">
        Payment Verified & Received
      </h2>
      <p style="font-size: 13px; color: #78716c; margin: 0;">
        Amount: <strong>${formatCurrency(order.pricing?.grandTotal)}</strong> • Order #${order.orderNumber}
      </p>
    </div>

    <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 16px 0;">
      Dear ${order.customerInfo?.name}, your online payment via Razorpay has been successfully processed and verified. Your invoice is now ready.
    </p>

    <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 12px; color: #57534e; line-height: 20px;">
      Transaction Reference: <strong>${order.paymentInfo?.razorpayPaymentId || order.paymentInfo?.razorpayOrderId || 'Verified'}</strong><br>
      Paid At: <strong>${new Date(order.paymentInfo?.paidAt || Date.now()).toLocaleString('en-IN')}</strong><br>
      Payment Gateway: <strong>Razorpay Secure Payments</strong>
    </div>

    ${renderOrderItemsTable(order.items)}
    ${renderPricingSummary(order.pricing, order.paymentMethod)}

    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${clientUrl}/orders" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        View Order & Invoice
      </a>
    </div>
  `;

  return {
    subject: `Payment Successful for Order #${order.orderNumber} - Aura Fashion`,
    html: baseLayout({ title: `Payment Confirmation #${order.orderNumber}`, preheader: `Payment of ${formatCurrency(order.pricing?.grandTotal)} successfully received for Order #${order.orderNumber}.`, content, clientUrl }),
    text: `Payment Received for Order #${order.orderNumber}\n\nAmount: ${formatCurrency(order.pricing?.grandTotal)}\nTransaction: ${order.paymentInfo?.razorpayPaymentId || 'Verified'}\n\nView details: ${clientUrl}/orders`
  };
};

// 4. ORDER STATUS UPDATE / SHIPPED / DELIVERED
export const orderStatusUpdateTemplate = ({ order, previousStatus, newStatus, trackingNumber, comment, clientUrl = 'http://localhost:5173' }) => {
  const statusDetails = {
    CONFIRMED: { label: 'Order Confirmed', color: '#b45309', bg: '#fef3c7', msg: 'Your order has been officially confirmed by our studio team.' },
    PROCESSING: { label: 'In Processing', color: '#0369a1', bg: '#e0f2fe', msg: 'Our artisans are tailoring and preparing your items with precision.' },
    PACKED: { label: 'Packed & Quality Checked', color: '#6d28d9', bg: '#ede9fe', msg: 'Your garments have passed luxury quality check and are securely packed.' },
    SHIPPED: { label: 'Dispatched & On The Way', color: '#1d4ed8', bg: '#dbeafe', msg: 'Your parcel has been handed over to our courier partner and is on its way!' },
    OUT_FOR_DELIVERY: { label: 'Out For Delivery Today', color: '#c2410c', bg: '#ffedd5', msg: 'Your package is out with the delivery executive and will arrive today.' },
    DELIVERED: { label: 'Successfully Delivered', color: '#15803d', bg: '#dcfce7', msg: 'Your Aura Fashion order has been delivered! We hope you love your new pieces.' }
  };

  const curr = statusDetails[newStatus] || {
    label: newStatus,
    color: BRAND_COLOR,
    bg: '#FAF9F6',
    msg: `Your order status has been updated to ${newStatus}.`
  };

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background: ${curr.bg}; color: ${curr.color}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        ${curr.label}
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1c1917; margin: 14px 0 4px 0;">
        Status Update on Order #${order.orderNumber}
      </h2>
      <p style="font-size: 13px; color: #78716c; margin: 0;">
        Updated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>

    <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 16px 0;">
      Dear ${order.customerInfo?.name},<br>${curr.msg}
    </p>

    ${comment ? `<div style="background-color: #fafaf9; border-left: 3px solid ${curr.color}; padding: 12px 16px; font-size: 12px; color: #44403c; margin: 16px 0; font-style: italic;">“${comment}”</div>` : ''}

    ${
      (trackingNumber || order.trackingNumber)
        ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin: 20px 0; text-align: center;">
        <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #15803d; display: block; margin-bottom: 4px;">
          Courier Tracking Number
        </span>
        <span style="font-family: monospace; font-size: 18px; font-weight: bold; color: #166534; letter-spacing: 2px;">
          ${trackingNumber || order.trackingNumber}
        </span>
      </div>
    `
        : ''
    }

    ${renderOrderItemsTable(order.items)}

    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${clientUrl}/orders" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        Track Live Status
      </a>
    </div>
  `;

  return {
    subject: `Update on Order #${order.orderNumber}: ${curr.label} - Aura Fashion`,
    html: baseLayout({ title: `Order #${order.orderNumber} Status: ${curr.label}`, preheader: `Your order #${order.orderNumber} is now: ${curr.label}.`, content, clientUrl }),
    text: `Order #${order.orderNumber} Status Update: ${curr.label}\n\n${curr.msg}\n${trackingNumber ? `Tracking Number: ${trackingNumber}\n` : ''}Track live at: ${clientUrl}/orders\n\nCustomer Support: ${SHOP_PHONE}`
  };
};

// 5. ORDER CANCELLED EMAIL
export const orderCancelledTemplate = ({ order, reason, clientUrl = 'http://localhost:5173' }) => {
  const isPrepaid = order.paymentMethod === 'RAZORPAY';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        Order Cancelled
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1c1917; margin: 12px 0 4px 0;">
        Order #${order.orderNumber} Has Been Cancelled
      </h2>
    </div>

    <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 14px 0;">
      Dear ${order.customerInfo?.name}, as requested, your order #${order.orderNumber} has been cancelled and the inventory items have been safely restocked.
    </p>

    ${reason ? `<div style="background-color: #fafaf9; border-left: 3px solid #b91c1c; padding: 12px 16px; font-size: 12px; color: #44403c; margin: 14px 0;">Reason: <strong>${reason}</strong></div>` : ''}

    ${
      isPrepaid
        ? `
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; font-size: 13px; color: #065f46; margin: 18px 0; line-height: 20px;">
        <strong>Refund Status:</strong> Because you made a prepaid online payment, a refund of <strong>${formatCurrency(order.pricing?.grandTotal)}</strong> has been initiated and will reflect in your source account within 3–5 banking business days.
      </div>
    `
        : `
      <div style="background-color: #f5f5f4; border-radius: 8px; padding: 14px; font-size: 12px; color: #57534e; margin: 18px 0;">
        No payment was collected for this Cash on Delivery order.
      </div>
    `
    }

    ${renderOrderItemsTable(order.items)}

    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${clientUrl}/shop" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        Continue Shopping
      </a>
    </div>
  `;

  return {
    subject: `Order #${order.orderNumber} Cancelled - Aura Fashion`,
    html: baseLayout({ title: `Order Cancelled #${order.orderNumber}`, preheader: `Your order #${order.orderNumber} has been cancelled.`, content, clientUrl }),
    text: `Order #${order.orderNumber} Cancelled.\n\nDear ${order.customerInfo?.name}, your order has been cancelled.\n${isPrepaid ? `A refund of ${formatCurrency(order.pricing?.grandTotal)} has been initiated.` : ''}\n\nSupport: ${SHOP_PHONE}`
  };
};

// 6. REFUND PROCESSED EMAIL
export const refundProcessedTemplate = ({ order, refundAmount, clientUrl = 'http://localhost:5173' }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        Refund Processed
      </span>
      <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1c1917; margin: 12px 0 4px 0;">
        Refund Issued: ${formatCurrency(refundAmount || order.pricing?.grandTotal)}
      </h2>
      <p style="font-size: 13px; color: #78716c; margin: 0;">
        For Order #${order.orderNumber}
      </p>
    </div>

    <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 16px 0;">
      Dear ${order.customerInfo?.name}, we have processed your refund of <strong>${formatCurrency(refundAmount || order.pricing?.grandTotal)}</strong> back to your original payment method. Depending on your bank or card issuer, funds will appear in your account within 3–5 working days.
    </p>

    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${clientUrl}/orders" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        View Order Details
      </a>
    </div>
  `;

  return {
    subject: `Refund Processed for Order #${order.orderNumber} - Aura Fashion`,
    html: baseLayout({ title: `Refund Processed #${order.orderNumber}`, preheader: `Your refund of ${formatCurrency(refundAmount || order.pricing?.grandTotal)} has been processed.`, content, clientUrl }),
    text: `Refund Processed for Order #${order.orderNumber}.\n\nAmount: ${formatCurrency(refundAmount || order.pricing?.grandTotal)} back to your original payment method.\n\nSupport: ${SHOP_PHONE}`
  };
};

// 7. PASSWORD RESET EMAIL
export const passwordResetTemplate = ({ customerName, resetUrl, expireMinutes = 20, clientUrl = 'http://localhost:5173' }) => {
  const content = `
    <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1c1917; margin: 0 0 12px 0;">
      Reset Your Aura Fashion Password
    </h2>
    <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 16px 0;">
      Hello ${customerName || 'Valued Customer'},<br>
      We received a request to reset your password for your Aura Fashion account. Click the button below to establish a new password:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 14px 32px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px; box-shadow: 0 4px 14px rgba(131, 39, 41, 0.3);">
        Reset Password
      </a>
    </div>

    <p style="font-size: 12px; color: #78716c; line-height: 18px; margin: 20px 0 10px 0;">
      ⏱️ For your security, this password reset link will expire in <strong>${expireMinutes} minutes</strong>. If you did not make this request, please disregard this email or contact support if you suspect unauthorized activity.
    </p>

    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f5f5f4; font-size: 11px; color: #a8a29e; word-break: break-all;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: ${BRAND_COLOR};">${resetUrl}</a>
    </div>
  `;

  return {
    subject: 'Password Reset Request - Aura Fashion',
    html: baseLayout({ title: 'Password Reset Request', preheader: `Reset your Aura Fashion account password. Link expires in ${expireMinutes} minutes.`, content, clientUrl }),
    text: `Password Reset Request - Aura Fashion\n\nClick the link below to reset your password (valid for ${expireMinutes} minutes):\n${resetUrl}\n\nIf you did not request this, please disregard.\nSupport: ${SHOP_PHONE}`
  };
};

// 8. ADMIN: NEW ORDER ALERT
export const adminNewOrderTemplate = ({ order, adminUrl = 'http://localhost:5174' }) => {
  const content = `
    <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
      <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #92400e; letter-spacing: 1px;">
        Admin Alert: New Customer Order Received
      </span>
    </div>

    <h2 style="font-family: Georgia, serif; font-size: 20px; color: #1c1917; margin: 0 0 8px 0;">
      Order #${order.orderNumber} • ${formatCurrency(order.pricing?.grandTotal)}
    </h2>
    <p style="font-size: 13px; color: #57534e; margin: 0 0 16px 0;">
      Placed by <strong>${order.customerInfo?.name}</strong> (${order.customerInfo?.email}, ${order.customerInfo?.phone})<br>
      Payment: <strong>${order.paymentMethod}</strong> (${order.paymentInfo?.status})
    </p>

    ${renderOrderItemsTable(order.items)}
    ${renderPricingSummary(order.pricing, order.paymentMethod)}
    ${renderAddressCard(order.shippingAddress)}

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${adminUrl}/orders" style="display: inline-block; background-color: #1c1917; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        Open in Admin Portal
      </a>
    </div>
  `;

  return {
    subject: `🚨 [New Order] #${order.orderNumber} from ${order.customerInfo?.name} - ${formatCurrency(order.pricing?.grandTotal)}`,
    html: baseLayout({ title: `Admin Alert: Order #${order.orderNumber}`, preheader: `New order #${order.orderNumber} received for ${formatCurrency(order.pricing?.grandTotal)}.`, content, clientUrl: adminUrl }),
    text: `New Order Received: #${order.orderNumber}\nCustomer: ${order.customerInfo?.name} (${order.customerInfo?.phone})\nTotal: ${formatCurrency(order.pricing?.grandTotal)}\nMethod: ${order.paymentMethod}\n\nOpen admin: ${adminUrl}/orders`
  };
};

// 9. ADMIN: LOW STOCK ALERT
export const adminLowStockTemplate = ({ product, variant, currentStock, adminUrl = 'http://localhost:5174' }) => {
  const content = `
    <div style="background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
      <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #b91c1c; letter-spacing: 1px;">
        ⚠️ Low Stock Inventory Alert
      </span>
    </div>

    <h2 style="font-family: Georgia, serif; font-size: 20px; color: #1c1917; margin: 0 0 8px 0;">
      ${product.name}
    </h2>
    <p style="font-size: 13px; color: #57534e; margin: 0 0 20px 0;">
      The stock for this garment variant has reached critical inventory threshold.
    </p>

    <table width="100%" cellpadding="10" cellspacing="0" style="background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; font-size: 13px;">
      <tr>
        <td style="color: #78716c;">SKU:</td>
        <td style="font-family: monospace; font-weight: bold; color: #1c1917;">${variant.sku}</td>
      </tr>
      <tr>
        <td style="color: #78716c;">Size:</td>
        <td style="font-weight: bold; color: #1c1917;">${variant.size}</td>
      </tr>
      <tr>
        <td style="color: #78716c;">Color:</td>
        <td style="font-weight: bold; color: #1c1917;">${variant.color}</td>
      </tr>
      <tr>
        <td style="color: #78716c;">Remaining Units:</td>
        <td style="font-size: 16px; font-weight: bold; color: #b91c1c;">${currentStock} unit(s) remaining</td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${adminUrl}/inventory" style="display: inline-block; background-color: #1c1917; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        Restock in Admin Portal
      </a>
    </div>
  `;

  return {
    subject: `⚠️ [Low Stock Alert] ${product.name} (${variant.size} / ${variant.color}) - Only ${currentStock} left!`,
    html: baseLayout({ title: 'Low Stock Alert', preheader: `Low stock alert for ${product.name} - SKU: ${variant.sku}.`, content, clientUrl: adminUrl }),
    text: `Low Stock Alert: ${product.name}\nSKU: ${variant.sku}\nVariant: ${variant.size} / ${variant.color}\nUnits Remaining: ${currentStock}\n\nRestock at: ${adminUrl}/inventory`
  };
};

// 10. ADMIN: CUSTOMER CANCELLATION ALERT
export const adminOrderCancelledAlertTemplate = ({ order, reason, adminUrl = 'http://localhost:5174' }) => {
  const content = `
    <div style="background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
      <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #b91c1c; letter-spacing: 1px;">
        Order Cancelled by Customer
      </span>
    </div>

    <h2 style="font-family: Georgia, serif; font-size: 20px; color: #1c1917; margin: 0 0 8px 0;">
      Order #${order.orderNumber}
    </h2>
    <p style="font-size: 13px; color: #57534e; margin: 0 0 16px 0;">
      Customer: <strong>${order.customerInfo?.name}</strong> (${order.customerInfo?.phone})<br>
      Total Value: <strong>${formatCurrency(order.pricing?.grandTotal)}</strong><br>
      Reason: <em>${reason || 'No reason specified'}</em>
    </p>

    <div style="text-align: center; margin: 24px 0 10px 0;">
      <a href="${adminUrl}/orders" style="display: inline-block; background-color: #1c1917; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px;">
        Manage in Admin Portal
      </a>
    </div>
  `;

  return {
    subject: `⚠️ [Order Cancelled] #${order.orderNumber} by ${order.customerInfo?.name}`,
    html: baseLayout({ title: `Order Cancelled #${order.orderNumber}`, preheader: `Customer ${order.customerInfo?.name} cancelled order #${order.orderNumber}.`, content, clientUrl: adminUrl }),
    text: `Order #${order.orderNumber} cancelled by customer ${order.customerInfo?.name}.\nReason: ${reason || 'None'}\n\nAdmin: ${adminUrl}/orders`
  };
};
