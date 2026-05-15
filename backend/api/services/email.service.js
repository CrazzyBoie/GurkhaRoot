import nodemailer from 'nodemailer';

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: parseInt(process.env.SMTP_PORT) === 465, // true only for port 465; STARTTLS for 587
  requireTLS: parseInt(process.env.SMTP_PORT) === 587, // enforce STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000, // 10s
  greetingTimeout:   10000,
  socketTimeout:     15000,
});

const getEmailStyles = () => `
  <style>
    body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1a1a1a; padding: 30px; text-align: center; }
    .header h1 { color: #c8a96e; margin: 0; font-family: 'Bebas Neue', Arial, sans-serif; font-size: 32px; letter-spacing: 2px; }
    .header p { color: #f5f5f0; margin: 10px 0 0; font-size: 14px; }
    .content { padding: 40px 30px; }
    .footer { background: #1a1a1a; padding: 30px; text-align: center; color: #888; font-size: 12px; }
    .btn { display: inline-block; background: #c8a96e; color: #1a1a1a; padding: 12px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; }
    .order-item { border-bottom: 1px solid #e0e0e0; padding: 15px 0; }
    .order-item:last-child { border-bottom: none; }
    .text-gold { color: #c8a96e; }
  </style>
`;

const getEmailHeader = (title) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${getEmailStyles()}
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>GURKHA ROOTS</h1>
        <p>Roots Run Deep</p>
      </div>
      <div class="content">
`;

const getEmailFooter = () => `
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Gurkha Roots. All rights reserved.</p>
        <p>Born between two flags — Nepal and Newzealand</p>
      </div>
    </div>
  </body>
  </html>
`;

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail({
      from: `"Gurkha Roots" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  } finally {
    transporter.close();
  }
};

export const sendWelcomeEmail = async (user) => {
  const html = `
    ${getEmailHeader('Welcome to Gurkha Roots')}
      <h2>Welcome to the Family, ${user.name}!</h2>
      <p>Thank you for joining Gurkha Roots. We're excited to have you as part of our community.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/shop" class="btn">Start Shopping</a>
      </p>
      <p>Stay connected with us for exclusive offers, new arrivals, and stories from our roots.</p>
      <p>Roots Run Deep,<br>The Gurkha Roots Team</p>
    ${getEmailFooter()}
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to Gurkha Roots - Roots Run Deep',
    html,
  });
};

export const sendOrderConfirmation = async (order, user, items) => {
  const itemsHtml = items.map(item => `
    <div class="order-item">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="80">
            <img src="${item.image}" alt="${item.name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px;">
          </td>
          <td style="padding-left: 15px;">
            <strong>${item.name}</strong><br>
            <span style="color: #888; font-size: 13px;">Size: ${item.size} | Color: ${item.color}</span><br>
            <span style="color: #888; font-size: 13px;">Qty: ${item.quantity} × $${item.price.toFixed(2)}</span>
          </td>
          <td align="right" valign="top">
            <strong>$${(item.quantity * item.price).toFixed(2)}</strong>
          </td>
        </tr>
      </table>
    </div>
  `).join('');

  const html = `
    ${getEmailHeader('Order Confirmation - Gurkha Roots')}
      <h2>Order Confirmed!</h2>
      <p>Thank you for your order, ${user.name}. We've received your order and are preparing it for shipment.</p>
      
      <div style="background: #f5f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Order Number:</strong> <span class="text-gold">${order.orderNumber}</span></p>
        <p style="margin: 10px 0 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      
      <h3>Order Items</h3>
      ${itemsHtml}
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; border-top: 2px solid #1a1a1a; padding-top: 20px;">
        <tr>
          <td>Subtotal:</td>
          <td align="right">$${(order.total + order.discount).toFixed(2)}</td>
        </tr>
        ${order.discount > 0 ? `
        <tr>
          <td>Discount:</td>
          <td align="right" style="color: #28a745;">-$${order.discount.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr>
          <td>Shipping:</td>
          <td align="right">Free</td>
        </tr>
        <tr style="font-size: 18px; font-weight: bold;">
          <td style="padding-top: 10px;">Total:</td>
          <td align="right" style="padding-top: 10px;">$${order.total.toFixed(2)}</td>
        </tr>
      </table>
      
      <h3 style="margin-top: 30px;">Shipping Address</h3>
      <p>
        ${order.shippingSnap.fullName}<br>
        ${order.shippingSnap.line1}<br>
        ${order.shippingSnap.line2 ? order.shippingSnap.line2 + '<br>' : ''}
        ${order.shippingSnap.city}, ${order.shippingSnap.state} ${order.shippingSnap.postalCode}<br>
        ${order.shippingSnap.country}
      </p>
      
      <p style="margin-top: 30px;">We'll send you another email when your order ships.</p>
      
      <p>Roots Run Deep,<br>The Gurkha Roots Team</p>
    ${getEmailFooter()}
  `;

  return sendEmail({
    to: user.email || order.guestEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html,
  });
};

export const sendOrderStatusUpdate = async (order, user) => {
  const statusMessages = {
    PENDING:    'Your order has been received and is awaiting processing.',
    PROCESSING: 'Your order is being prepared for shipment.',
    SHIPPED:    'Your order has been shipped and is on its way!',
    DELIVERED:  'Your order has been delivered. Enjoy!',
    CANCELLED:  'Your order has been cancelled.',
  };

  const recipientEmail = user?.email || order.guestEmail;
  if (!recipientEmail) {
    console.error(`❌ sendOrderStatusUpdate: no recipient email for order ${order.orderNumber}`);
    return { success: false, error: 'No recipient email address available' };
  }

  const html = `
    ${getEmailHeader(`Order ${order.status} - Gurkha Roots`)}
      <h2>Order Update</h2>
      <p>Hi ${user.name},</p>
      <p>${statusMessages[order.status] || 'Your order status has been updated.'}</p>
      
      <div style="background: #f5f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Order Number:</strong> <span class="text-gold">${order.orderNumber}</span></p>
        <p style="margin: 10px 0 0;"><strong>Status:</strong> <span style="color: #c8a96e; font-weight: bold;">${order.status}</span></p>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/profile" class="btn">View Order Details</a>
      </p>
      
      <p>Roots Run Deep,<br>The Gurkha Roots Team</p>
    ${getEmailFooter()}
  `;

  return sendEmail({
    to: recipientEmail,
    subject: `Order ${order.status} - ${order.orderNumber}`,
    html,
  });
};

export const sendAdminOrderNotification = async (order, user, items) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.size}</td>
      <td>${item.color}</td>
      <td>${item.quantity}</td>
      <td>$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    ${getEmailHeader('New Order Received - Gurkha Roots Admin')}
      <h2>New Order Alert!</h2>
      <p>A new order has been placed on Gurkha Roots.</p>
      
      <div style="background: #f5f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Order Number:</strong> <span class="text-gold">${order.orderNumber}</span></p>
        <p style="margin: 10px 0 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p style="margin: 10px 0 0;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        <p style="margin: 10px 0 0;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      </div>
      
      <h3>Customer Information</h3>
      <p>
        <strong>Name:</strong> ${user?.name || 'Guest'}<br>
        <strong>Email:</strong> ${user?.email || order.guestEmail}<br>
        <strong>Phone:</strong> ${user?.phone || order.shippingSnap.phone || 'N/A'}
      </p>
      
      <h3>Order Items</h3>
      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr style="background: #1a1a1a; color: #f5f5f0;">
            <th align="left">Product</th>
            <th align="left">Size</th>
            <th align="left">Color</th>
            <th align="left">Qty</th>
            <th align="left">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <h3 style="margin-top: 30px;">Shipping Address</h3>
      <p>
        ${order.shippingSnap.fullName}<br>
        ${order.shippingSnap.line1}<br>
        ${order.shippingSnap.line2 ? order.shippingSnap.line2 + '<br>' : ''}
        ${order.shippingSnap.city}, ${order.shippingSnap.state} ${order.shippingSnap.postalCode}<br>
        ${order.shippingSnap.country}
      </p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/admin/orders" class="btn">View in Admin</a>
      </p>
    ${getEmailFooter()}
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `New Order - ${order.orderNumber}`,
    html,
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const html = `
    ${getEmailHeader('Password Reset - Gurkha Roots')}
      <h2>Reset Your Password</h2>
      <p>Hi ${user.name},</p>
      <p>We received a request to reset your password. Click the button below:</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </p>
      
      <p style="font-size: 13px; color: #888;">This link will expire in 1 hour.</p>
      
      <p>Roots Run Deep,<br>The Gurkha Roots Team</p>
    ${getEmailFooter()}
  `;

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request - Gurkha Roots',
    html,
  });
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendAdminOrderNotification,
  sendPasswordResetEmail,
};