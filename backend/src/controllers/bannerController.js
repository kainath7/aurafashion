import Banner from '../models/Banner.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { broadcastEvent } from '../sockets/socketHandler.js';

// @desc    Get active banners (for homepage / promotions)
// @route   GET /api/banners
// @access  Public
export const getActiveBanners = async (req, res, next) => {
  try {
    const { position } = req.query;
    const filter = { isActive: true };
    if (position) filter.position = position;

    const banners = await Banner.find(filter).sort({ displayOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      banners
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: get all banners
// @route   GET /api/banners/admin
// @access  Private (Admin)
export const adminGetAllBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json({
      success: true,
      banners
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: create banner
// @route   POST /api/banners
// @access  Private (Admin)
export const createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, linkUrl, buttonText, position, displayOrder, isActive } = req.body;

    let imageUrl = req.body.imageUrl || '';
    let public_id = '';

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'aura_fashion/banners');
      imageUrl = uploadResult.url;
      public_id = uploadResult.public_id;
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    const banner = await Banner.create({
      title,
      subtitle: subtitle || '',
      imageUrl,
      public_id,
      linkUrl: linkUrl || '/shop',
      buttonText: buttonText || 'Shop Collection',
      position: position || 'HERO',
      displayOrder: displayOrder ? Number(displayOrder) : 0,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true
    });

    broadcastEvent('banner_updated', banner);

    res.status(201).json({
      success: true,
      banner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: update banner
// @route   PUT /api/banners/:id
// @access  Private (Admin)
export const updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const { title, subtitle, linkUrl, buttonText, position, displayOrder, isActive } = req.body;

    if (title) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (linkUrl !== undefined) banner.linkUrl = linkUrl;
    if (buttonText !== undefined) banner.buttonText = buttonText;
    if (position) banner.position = position;
    if (displayOrder !== undefined) banner.displayOrder = Number(displayOrder);
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'aura_fashion/banners');
      banner.imageUrl = uploadResult.url;
      banner.public_id = uploadResult.public_id;
    } else if (req.body.imageUrl) {
      banner.imageUrl = req.body.imageUrl;
    }

    await banner.save();

    broadcastEvent('banner_updated', banner);

    res.json({
      success: true,
      banner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: delete banner
// @route   DELETE /api/banners/:id
// @access  Private (Admin)
export const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    await banner.deleteOne();

    broadcastEvent('banner_updated', { bannerId: req.params.id, deleted: true });

    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
