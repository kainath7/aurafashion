import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Coupon from '../models/Coupon.js';

// Helper to calculate populated cart totals
const formatCartResponse = (cart) => {
  let subtotal = 0;
  const items = cart.items.map((item) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return {
      _id: item._id,
      product: item.product,
      variant: item.variant,
      size: item.size,
      color: item.color,
      price: item.price,
      quantity: item.quantity,
      subtotal: itemTotal
    };
  });

  return {
    _id: cart._id,
    items,
    subtotal,
    coupon: cart.coupon,
    discountAmount: cart.coupon?.discountAmount || 0,
    grandTotal: Math.max(0, subtotal - (cart.coupon?.discountAmount || 0))
  };
};

// @desc    Validate and hydrate guest cart items against database
// @route   POST /api/cart/guest/validate
// @access  Public (Guest)
export const validateGuestCart = async (req, res, next) => {
  try {
    const { items = [] } = req.body;

    const validatedItems = [];
    let subtotal = 0;
    const errors = [];

    for (const item of items) {
      if (!item.variantId) continue;

      const variant = await ProductVariant.findById(item.variantId).populate({
        path: 'product',
        select: 'name slug images basePrice discountPrice isActive'
      });

      if (!variant || !variant.isActive || !variant.product || !variant.product.isActive) {
        errors.push(`An item in your cart is no longer available.`);
        continue;
      }

      // Check current available stock
      const requestedQty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const availableStock = variant.stockQuantity;

      if (availableStock <= 0) {
        errors.push(`${variant.product.name} (${variant.color}, ${variant.size}) is out of stock.`);
        continue;
      }

      const finalQty = Math.min(requestedQty, availableStock);
      if (finalQty < requestedQty) {
        errors.push(
          `Stock for ${variant.product.name} (${variant.size}) adjusted to available limit of ${availableStock}.`
        );
      }

      const currentPrice =
        (variant.product.discountPrice !== null && variant.product.discountPrice !== undefined
          ? variant.product.discountPrice
          : variant.product.basePrice) + (variant.additionalPrice || 0);

      const itemTotal = currentPrice * finalQty;
      subtotal += itemTotal;

      validatedItems.push({
        product: variant.product,
        variant: {
          _id: variant._id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          stockQuantity: variant.stockQuantity
        },
        size: variant.size,
        color: variant.color,
        price: currentPrice,
        quantity: finalQty,
        subtotal: itemTotal
      });
    }

    res.json({
      success: true,
      items: validatedItems,
      subtotal,
      errors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get authenticated customer's cart
// @route   GET /api/cart
// @access  Private (Customer)
export const getCustomerCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name slug images basePrice discountPrice isActive'
      })
      .populate({
        path: 'items.variant',
        select: 'sku size color stockQuantity isActive'
      });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.json({
      success: true,
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart (Customer)
// @route   POST /api/cart/items
// @access  Private (Customer)
export const addToCart = async (req, res, next) => {
  try {
    const { variantId, quantity = 1 } = req.body;

    const variant = await ProductVariant.findById(variantId).populate('product');
    if (!variant || !variant.isActive || !variant.product || !variant.product.isActive) {
      return res.status(404).json({ success: false, message: 'Variant not available' });
    }

    if (variant.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.stockQuantity} items available in stock`
      });
    }

    const currentPrice =
      (variant.product.discountPrice !== null && variant.product.discountPrice !== undefined
        ? variant.product.discountPrice
        : variant.product.basePrice) + (variant.additionalPrice || 0);

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if variant already in cart
    const existingIndex = cart.items.findIndex(
      (item) => item.variant.toString() === variant._id.toString()
    );

    if (existingIndex > -1) {
      const newTotalQty = cart.items[existingIndex].quantity + quantity;
      if (newTotalQty > variant.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Limit of ${variant.stockQuantity} reached in cart.`
        });
      }
      cart.items[existingIndex].quantity = newTotalQty;
      cart.items[existingIndex].price = currentPrice;
    } else {
      cart.items.push({
        product: variant.product._id,
        variant: variant._id,
        quantity,
        price: currentPrice,
        size: variant.size,
        color: variant.color
      });
    }

    await cart.save();
    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name slug images basePrice discountPrice')
      .populate('items.variant', 'sku size color stockQuantity');

    res.json({
      success: true,
      cart: formatCartResponse(populated)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quantity of cart item
// @route   PUT /api/cart/items/:itemId
// @access  Private (Customer)
export const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const variant = await ProductVariant.findById(item.variant);
    if (!variant || variant.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant ? variant.stockQuantity : 0} items available in stock`
      });
    }

    item.quantity = quantity;
    await cart.save();

    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name slug images basePrice discountPrice')
      .populate('items.variant', 'sku size color stockQuantity');

    res.json({
      success: true,
      cart: formatCartResponse(populated)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private (Customer)
export const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
    await cart.save();

    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name slug images basePrice discountPrice')
      .populate('items.variant', 'sku size color stockQuantity');

    res.json({
      success: true,
      cart: formatCartResponse(populated)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Merge guest cart into authenticated customer cart upon login/register
// @route   POST /api/cart/merge
// @access  Private (Customer)
export const mergeGuestCart = async (req, res, next) => {
  try {
    const { guestItems = [] } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    for (const gItem of guestItems) {
      if (!gItem.variantId) continue;

      const variant = await ProductVariant.findById(gItem.variantId).populate('product');
      if (!variant || !variant.isActive || variant.stockQuantity <= 0) continue;

      const currentPrice =
        (variant.product.discountPrice !== null && variant.product.discountPrice !== undefined
          ? variant.product.discountPrice
          : variant.product.basePrice) + (variant.additionalPrice || 0);

      const existingIndex = cart.items.findIndex(
        (item) => item.variant.toString() === variant._id.toString()
      );

      const requestedQty = Math.max(1, parseInt(gItem.quantity, 10) || 1);

      if (existingIndex > -1) {
        // Merge quantities, bounded by stock
        const combined = cart.items[existingIndex].quantity + requestedQty;
        cart.items[existingIndex].quantity = Math.min(combined, variant.stockQuantity);
        cart.items[existingIndex].price = currentPrice;
      } else {
        cart.items.push({
          product: variant.product._id,
          variant: variant._id,
          quantity: Math.min(requestedQty, variant.stockQuantity),
          price: currentPrice,
          size: variant.size,
          color: variant.color
        });
      }
    }

    await cart.save();

    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name slug images basePrice discountPrice')
      .populate('items.variant', 'sku size color stockQuantity');

    res.json({
      success: true,
      message: 'Guest cart merged successfully',
      cart: formatCartResponse(populated)
    });
  } catch (error) {
    next(error);
  }
};
