import StoreSettings from '../models/StoreSettings.js';
import EmailLog from '../models/EmailLog.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { broadcastEvent } from '../sockets/socketHandler.js';
import { sendEmail, verifySmtpConnection } from '../services/emailService.js';

// @desc    Get public store settings (Shop info, policies, delivery rules, theme)
// @route   GET /api/settings
// @access  Public
export const getStoreSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({
        shopName: 'Aura Fashion',
        ownerName: 'Kainath',
        shopAddress: 'Bengaluru',
        shopLocation: 'Bengaluru, Karnataka, India',
        contactNumber: '7022018850',
        whatsappNumber: '7022018850',
        email: 'shoppe.aurafashion@gmail.com'
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update store settings (Admin only)
// @route   PUT /api/settings
// @access  Private (Admin)
export const updateStoreSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings();
    }

    const {
      shopName,
      ownerName,
      shopAddress,
      shopLocation,
      contactNumber,
      whatsappNumber,
      email,
      tagline,
      announcementText,
      deliveryCharge,
      freeDeliveryThreshold,
      codAvailable,
      codExtraCharge,
      primaryColor,
      accentColor,
      returnPolicy,
      exchangePolicy,
      refundPolicy,
      businessHours,
      socialLinks,
      notifications
    } = req.body;

    if (shopName) settings.shopName = shopName;
    if (ownerName) settings.ownerName = ownerName;
    if (shopAddress) settings.shopAddress = shopAddress;
    if (shopLocation) settings.shopLocation = shopLocation;
    if (contactNumber) settings.contactNumber = contactNumber;
    if (whatsappNumber) settings.whatsappNumber = whatsappNumber;
    if (email) settings.email = email;
    if (tagline !== undefined) settings.tagline = tagline;
    if (announcementText !== undefined) settings.announcementText = announcementText;
    if (deliveryCharge !== undefined) settings.deliveryCharge = Number(deliveryCharge);
    if (freeDeliveryThreshold !== undefined) settings.freeDeliveryThreshold = Number(freeDeliveryThreshold);
    if (codAvailable !== undefined) settings.codAvailable = codAvailable === 'true' || codAvailable === true;
    if (codExtraCharge !== undefined) settings.codExtraCharge = Number(codExtraCharge);
    if (primaryColor) settings.primaryColor = primaryColor;
    if (accentColor) settings.accentColor = accentColor;
    if (returnPolicy !== undefined) settings.returnPolicy = returnPolicy;
    if (exchangePolicy !== undefined) settings.exchangePolicy = exchangePolicy;
    if (refundPolicy !== undefined) settings.refundPolicy = refundPolicy;
    if (businessHours !== undefined) settings.businessHours = businessHours;

    if (socialLinks) {
      settings.socialLinks = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
    }

    if (notifications) {
      const parsedNotifications = typeof notifications === 'string' ? JSON.parse(notifications) : notifications;
      settings.notifications = {
        ...settings.notifications?.toObject(),
        ...parsedNotifications
      };
    }

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'aura_fashion/branding');
      settings.logoUrl = uploadResult.url;
    } else if (req.body.logoUrl) {
      settings.logoUrl = req.body.logoUrl;
    }

    await settings.save();

    broadcastEvent('store_settings_updated', settings);

    res.json({
      success: true,
      message: 'Store settings updated successfully',
      settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Send test email to verify SMTP configuration
// @route   POST /api/settings/test-email
// @access  Private (Admin)
export const sendTestEmailController = async (req, res, next) => {
  try {
    const { targetEmail } = req.body;
    const recipient = targetEmail || req.admin?.email || 'shoppe.aurafashion@gmail.com';

    // First verify SMTP connection
    const smtpCheck = await verifySmtpConnection();
    if (!smtpCheck.success) {
      return res.status(500).json({
        success: false,
        message: `SMTP Connection Check Failed: ${smtpCheck.message}`
      });
    }

    const testHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #1c1917;">
        <h2 style="color: #832729;">Aura Fashion SMTP Verification</h2>
        <p>This is a live test notification sent from your <strong>Aura Fashion</strong> backend system using Brevo SMTP.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Sender:</strong> ${process.env.EMAIL_FROM || 'Aura Fashion'}</p>
        <p>Your email notification system is configured properly and ready for production.</p>
      </div>
    `;

    const result = await sendEmail({
      to: recipient,
      subject: '✅ Aura Fashion - SMTP Verification Test Email',
      html: testHtml,
      text: 'Aura Fashion SMTP Verification Test Email. Your email system is working correctly.',
      emailType: 'TEST_EMAIL',
      metadata: { initiatedBy: req.admin?.name || 'Admin' }
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to deliver test email: ${result.error}`
      });
    }

    res.json({
      success: true,
      message: `Test email successfully sent to ${recipient}!`,
      messageId: result.messageId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get email delivery audit logs
// @route   GET /api/settings/email-logs
// @access  Private (Admin)
export const getEmailLogsController = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, emailType, status } = req.query;

    const query = {};
    if (emailType) query.emailType = emailType;
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalLogs = await EmailLog.countDocuments(query);
    const logs = await EmailLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      count: logs.length,
      totalLogs,
      currentPage: pageNum,
      totalPages: Math.ceil(totalLogs / limitNum),
      logs
    });
  } catch (error) {
    next(error);
  }
};
