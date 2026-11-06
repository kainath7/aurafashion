import StoreSettings from '../models/StoreSettings.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { broadcastEvent } from '../sockets/socketHandler.js';

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
      socialLinks
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
