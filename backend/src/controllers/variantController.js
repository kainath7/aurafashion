import ProductVariant from '../models/ProductVariant.js';
import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';

// @desc    Get all variants for inventory management (with search, low stock filter)
// @route   GET /api/variants/inventory
// @access  Private (Admin)
export const getInventoryList = async (req, res, next) => {
  try {
    const { keyword, lowStockOnly, outOfStockOnly, category, page = 1, limit = 50 } = req.query;

    const query = {};

    if (lowStockOnly === 'true') {
      query.stockQuantity = { $gt: 0, $lte: 5 };
    } else if (outOfStockOnly === 'true') {
      query.stockQuantity = { $lte: 0 };
    }

    if (keyword) {
      query.$or = [
        { sku: { $regex: keyword, $options: 'i' } },
        { size: { $regex: keyword, $options: 'i' } },
        { color: { $regex: keyword, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalVariants = await ProductVariant.countDocuments(query);
    const variants = await ProductVariant.find(query)
      .populate({
        path: 'product',
        select: 'name slug images basePrice discountPrice category isActive',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ stockQuantity: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Filter by category if requested
    let filteredVariants = variants;
    if (category) {
      filteredVariants = variants.filter(
        (v) => v.product?.category?._id?.toString() === category
      );
    }

    res.json({
      success: true,
      count: filteredVariants.length,
      totalVariants,
      currentPage: pageNum,
      totalPages: Math.ceil(totalVariants / limitNum),
      variants: filteredVariants
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update variant stock (manual adjustment)
// @route   PUT /api/variants/:id/stock
// @access  Private (Admin)
export const adjustVariantStock = async (req, res, next) => {
  try {
    const { newStock, reason } = req.body;
    const variant = await ProductVariant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }

    const previousStock = variant.stockQuantity;
    const stockVal = Math.max(0, parseInt(newStock, 10));
    const quantityDelta = stockVal - previousStock;

    variant.stockQuantity = stockVal;
    await variant.save();

    // Log transaction
    const transaction = await InventoryTransaction.create({
      product: variant.product,
      variant: variant._id,
      sku: variant.sku,
      type: 'MANUAL_ADJUSTMENT',
      quantityDelta,
      previousStock,
      newStock: stockVal,
      reason: reason || 'Manual stock override via Admin Inventory',
      performedBy: req.admin?.name || 'Admin'
    });

    res.json({
      success: true,
      variant,
      transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add variant to existing product
// @route   POST /api/variants
// @access  Private (Admin)
export const addVariant = async (req, res, next) => {
  try {
    const { productId, size, color, colorCode, sku, stockQuantity, additionalPrice } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const generatedSku =
      sku || `AF-${product.slug.slice(0, 4).toUpperCase()}-${color.slice(0, 3).toUpperCase()}-${size.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const variant = await ProductVariant.create({
      product: product._id,
      size,
      color,
      colorCode: colorCode || '#000000',
      sku: generatedSku,
      stockQuantity: Number(stockQuantity || 0),
      additionalPrice: Number(additionalPrice || 0)
    });

    if (variant.stockQuantity > 0) {
      await InventoryTransaction.create({
        product: product._id,
        variant: variant._id,
        sku: variant.sku,
        type: 'INITIAL_STOCK',
        quantityDelta: variant.stockQuantity,
        previousStock: 0,
        newStock: variant.stockQuantity,
        reason: 'New variant added to product',
        performedBy: req.admin?.name || 'Admin'
      });
    }

    res.status(201).json({
      success: true,
      variant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete variant
// @route   DELETE /api/variants/:id
// @access  Private (Admin)
export const deleteVariant = async (req, res, next) => {
  try {
    const variant = await ProductVariant.findById(req.params.id);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }

    await variant.deleteOne();

    res.json({
      success: true,
      message: 'Variant deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
