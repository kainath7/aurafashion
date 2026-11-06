import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import StoreSettings from '../models/StoreSettings.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import { getRazorpayInstance, verifyRazorpaySignature } from '../config/razorpay.js';
import { getIO } from '../sockets/socketHandler.js';
import PDFDocument from 'pdfkit';
import {
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderCancelledEmail,
  sendRefundProcessedEmail,
  sendAdminNewOrderAlert,
  sendAdminLowStockAlert,
  sendAdminOrderCancelledAlert
} from '../services/emailService.js';

// Helper to generate unique human-readable order number: AF-YYYYMMDD-XXXX
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `AF-${dateStr}-${randomStr}`;
};

// @desc    Create new order (with stock locking & Razorpay/COD checkout)
// @route   POST /api/orders
// @access  Private (Customer)
export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your order must contain at least one item' });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.houseNo || !shippingAddress.street || !shippingAddress.city || !shippingAddress.pincode) {
      return res.status(400).json({ success: false, message: 'Please provide a complete delivery address (Full Name, Phone, House/Flat, Street, City, and PIN code are required).' });
    }

    const cleanPincode = shippingAddress.pincode.toString().trim();
    if (cleanPincode.length < 5 || cleanPincode.length > 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid PIN code.' });
    }

    const cleanPhone = shippingAddress.phone.toString().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    let lat = null;
    let lng = null;
    if (shippingAddress.latitude !== undefined && shippingAddress.latitude !== null && shippingAddress.latitude !== '') {
      const parsedLat = parseFloat(shippingAddress.latitude);
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        lat = parsedLat;
      }
    }
    if (shippingAddress.longitude !== undefined && shippingAddress.longitude !== null && shippingAddress.longitude !== '') {
      const parsedLng = parseFloat(shippingAddress.longitude);
      if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        lng = parsedLng;
      }
    }

    if (!['RAZORPAY', 'COD'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // Load store settings for delivery rules
    const settings = (await StoreSettings.findOne()) || {
      deliveryCharge: 99,
      freeDeliveryThreshold: 1499,
      codAvailable: true
    };

    if (paymentMethod === 'COD' && !settings.codAvailable) {
      return res.status(400).json({ success: false, message: 'Cash on Delivery is currently unavailable' });
    }

    // Server-side validation of products, variants, verified prices, and stock
    let itemsTotal = 0;
    const validatedOrderItems = [];
    const stockDeltasToApply = [];

    for (const item of items) {
      const variant = await ProductVariant.findById(item.variantId).populate('product');
      if (!variant || !variant.isActive || !variant.product || !variant.product.isActive) {
        return res.status(400).json({
          success: false,
          message: `One of the items in your order is no longer available.`
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid item quantity' });
      }

      if (variant.stockQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${variant.product.name} (${variant.color}, ${variant.size}). Available: ${variant.stockQuantity}`
        });
      }

      const unitPrice =
        (variant.product.discountPrice !== null && variant.product.discountPrice !== undefined
          ? variant.product.discountPrice
          : variant.product.basePrice) + (variant.additionalPrice || 0);

      const subtotal = unitPrice * qty;
      itemsTotal += subtotal;

      const primaryImage =
        variant.product.images.find((img) => img.isPrimary)?.url ||
        variant.product.images[0]?.url ||
        '';

      validatedOrderItems.push({
        product: variant.product._id,
        variant: variant._id,
        productName: variant.product.name,
        productImage: primaryImage,
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        price: unitPrice,
        quantity: qty,
        subtotal
      });

      stockDeltasToApply.push({
        variant,
        qty
      });
    }

    // Calculate delivery charge
    let deliveryCharge = itemsTotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryCharge;
    if (paymentMethod === 'COD' && settings.codExtraCharge) {
      deliveryCharge += settings.codExtraCharge;
    }

    // Coupon verification
    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        expiryDate: { $gte: new Date() }
      });

      if (coupon && itemsTotal >= (coupon.minOrderValue || 0)) {
        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = (itemsTotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
          }
        } else {
          discountAmount = Math.min(coupon.discountValue, itemsTotal);
        }
        appliedCoupon = coupon;
      }
    }

    const grandTotal = Math.max(0, itemsTotal + deliveryCharge - discountAmount);
    const orderNumber = generateOrderNumber();

    // Deduct stock safely and record inventory transactions
    for (const { variant, qty } of stockDeltasToApply) {
      const prevStock = variant.stockQuantity;
      variant.stockQuantity = prevStock - qty;
      await variant.save();

      await InventoryTransaction.create({
        product: variant.product._id,
        variant: variant._id,
        sku: variant.sku,
        type: 'PURCHASE',
        quantityDelta: -qty,
        previousStock: prevStock,
        newStock: variant.stockQuantity,
        reason: `Order ${orderNumber}`,
        performedBy: req.user.name
      });
    }

    // If coupon used, increment coupon usedCount
    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }

    // Order status initialization
    const initialStatus = paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING';
    const statusHistory = [
      {
        status: initialStatus,
        timestamp: new Date(),
        comment: paymentMethod === 'COD' ? 'Order placed with Cash on Delivery' : 'Order initialized awaiting payment',
        updatedBy: req.user.name
      }
    ];

    let razorpayOrderDetails = null;
    let razorpayOrderId = '';

    // Initialize Razorpay order if online payment
    if (paymentMethod === 'RAZORPAY') {
      const razorpay = getRazorpayInstance();
      if (razorpay) {
        try {
          const rzpOrder = await razorpay.orders.create({
            amount: Math.round(grandTotal * 100), // amount in paise
            currency: 'INR',
            receipt: orderNumber,
            notes: {
              customerEmail: req.user.email,
              customerPhone: shippingAddress.phone
            }
          });
          razorpayOrderId = rzpOrder.id;
          razorpayOrderDetails = rzpOrder;
        } catch (rzpErr) {
          console.error('[Razorpay Order Creation Error]:', rzpErr);
          // Allow fallback/sandbox handling if test credentials
          razorpayOrderId = `test_order_${Date.now()}`;
        }
      } else {
        // Fallback for demo/testing without credentials
        razorpayOrderId = `test_order_${Date.now()}`;
      }
    }

    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      customerInfo: {
        name: req.user.name,
        email: req.user.email,
        phone: shippingAddress.phone || req.user.phone || ''
      },
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        phone: shippingAddress.phone.trim(),
        houseNo: shippingAddress.houseNo.trim(),
        street: shippingAddress.street.trim(),
        area: (shippingAddress.area || '').trim(),
        landmark: (shippingAddress.landmark || '').trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state ? shippingAddress.state.trim() : 'Karnataka',
        pincode: cleanPincode,
        deliveryInstructions: shippingAddress.deliveryInstructions || '',
        latitude: lat,
        longitude: lng,
        formattedAddress: shippingAddress.formattedAddress || '',
        addressSource: ['GPS', 'MANUAL', 'MAP_PICKER'].includes(shippingAddress.addressSource)
          ? shippingAddress.addressSource
          : lat && lng
          ? 'GPS'
          : 'MANUAL'
      },
      items: validatedOrderItems,
      pricing: {
        itemsTotal,
        deliveryCharge,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        discountAmount,
        grandTotal
      },
      paymentMethod,
      paymentInfo: {
        razorpayOrderId,
        status: paymentMethod === 'COD' ? 'PENDING' : 'PENDING'
      },
      orderStatus: initialStatus,
      statusHistory
    });

    // Clear user cart in DB after successful order creation
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], coupon: null });

    // Real-time broadcast to Admin room via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.to('admin_room').emit('new_order', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customerInfo.name,
          grandTotal: order.pricing.grandTotal,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt
        });
      }
    } catch (socketErr) {
      console.warn('[Socket Error]:', socketErr.message);
    }

    // Asynchronous Email Notifications (Customer Confirmation & Admin Alert)
    try {
      sendOrderConfirmationEmail(order).catch((e) => console.warn('[Email Warning]:', e.message));
      sendAdminNewOrderAlert(order).catch((e) => console.warn('[Email Warning]:', e.message));

      // Check for low inventory stock threshold
      for (const { variant } of stockDeltasToApply) {
        if (variant.stockQuantity <= 5) {
          sendAdminLowStockAlert({
            product: variant.product,
            variant,
            currentStock: variant.stockQuantity
          }).catch((e) => console.warn('[Low Stock Alert Warning]:', e.message));
        }
      }
    } catch (emailErr) {
      console.warn('[Email Dispatch Warning]:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      order,
      razorpayOrder: razorpayOrderDetails,
      razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_AURAFASHION123'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay online payment signature
// @route   POST /api/orders/:id/verify-payment
// @access  Private (Customer)
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let isValid = false;
    try {
      isValid = verifyRazorpaySignature({
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        signature: razorpay_signature
      });
    } catch (sigErr) {
      // In development mode with dummy keys, allow verification if flagged
      if (process.env.NODE_ENV !== 'production' && razorpay_payment_id) {
        isValid = true;
      }
    }

    if (!isValid) {
      order.paymentInfo.status = 'FAILED';
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    order.paymentInfo.razorpayOrderId = razorpay_order_id;
    order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
    order.paymentInfo.razorpaySignature = razorpay_signature;
    order.paymentInfo.status = 'COMPLETED';
    order.paymentInfo.paidAt = new Date();
    order.orderStatus = 'CONFIRMED';
    order.statusHistory.push({
      status: 'CONFIRMED',
      timestamp: new Date(),
      comment: `Payment received successfully via Razorpay (Txn: ${razorpay_payment_id})`,
      updatedBy: 'Razorpay Webhook/Verification'
    });

    await order.save();

    // Broadcast to Admin and Customer rooms
    try {
      const io = getIO();
      if (io) {
        io.to('admin_room').emit('order_status_updated', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentInfo.status
        });
        io.to(`order_${order._id}`).emit('status_change', {
          orderId: order._id,
          status: order.orderStatus,
          paymentStatus: order.paymentInfo.status
        });
      }
    } catch (e) {}

    // Dispatch payment confirmation email
    sendPaymentConfirmationEmail(order).catch((e) => console.warn('[Payment Email Warning]:', e.message));

    res.json({
      success: true,
      message: 'Payment verified and order confirmed successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's orders
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private (Customer / Admin)
export const getOrderById = async (req, res, next) => {
  try {
    let order;
    if (req.admin) {
      order = await Order.findById(req.params.id).populate('user', 'name email phone');
    } else {
      order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer cancel eligible order
// @route   PUT /api/orders/:id/cancel
// @access  Private (Customer)
export const cancelMyOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only allow cancellation if order is PENDING or CONFIRMED
    if (!['PENDING', 'CONFIRMED'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in '${order.orderStatus}' status. Please contact customer support.`
      });
    }

    order.orderStatus = 'CANCELLED';
    order.statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      comment: reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer',
      updatedBy: req.user.name
    });

    // Restock items
    for (const item of order.items) {
      const variant = await ProductVariant.findById(item.variant);
      if (variant) {
        const prevStock = variant.stockQuantity;
        variant.stockQuantity = prevStock + item.quantity;
        await variant.save();

        await InventoryTransaction.create({
          product: variant.product,
          variant: variant._id,
          sku: variant.sku,
          type: 'CANCELLED_RETURN',
          quantityDelta: item.quantity,
          previousStock: prevStock,
          newStock: variant.stockQuantity,
          reason: `Restock from cancelled order ${order.orderNumber}`,
          performedBy: req.user.name
        });
      }
    }

    await order.save();

    // Dispatch cancellation emails to customer and admin
    sendOrderCancelledEmail(order, reason).catch((e) => console.warn('[Cancel Email Warning]:', e.message));
    sendAdminOrderCancelledAlert(order, reason).catch((e) => console.warn('[Cancel Alert Warning]:', e.message));

    res.json({
      success: true,
      message: 'Order cancelled and inventory restored successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: get all orders with filters, search & pagination
// @route   GET /api/orders/admin/all
// @access  Private (Admin)
export const adminGetAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, keyword, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.orderStatus = status;
    if (paymentStatus) query['paymentInfo.status'] = paymentStatus;

    if (keyword) {
      query.$or = [
        { orderNumber: { $regex: keyword, $options: 'i' } },
        { 'customerInfo.name': { $regex: keyword, $options: 'i' } },
        { 'customerInfo.email': { $regex: keyword, $options: 'i' } },
        { 'customerInfo.phone': { $regex: keyword, $options: 'i' } },
        { 'shippingAddress.city': { $regex: keyword, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      count: orders.length,
      totalOrders,
      currentPage: pageNum,
      totalPages: Math.ceil(totalOrders / limitNum),
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: update order status
// @route   PUT /api/orders/admin/:id/status
// @access  Private (Admin)
export const adminUpdateOrderStatus = async (req, res, next) => {
  try {
    const { status, comment, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'RETURNED'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const previousStatus = order.orderStatus;

    // If changing to DELIVERED and paymentMethod is COD, mark payment as COMPLETED
    if (status === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentInfo.status === 'PENDING') {
      order.paymentInfo.status = 'COMPLETED';
      order.paymentInfo.paidAt = new Date();
    }

    // If changing to CANCELLED and was not cancelled before, restore stock
    if (status === 'CANCELLED' && order.orderStatus !== 'CANCELLED') {
      for (const item of order.items) {
        const variant = await ProductVariant.findById(item.variant);
        if (variant) {
          const prev = variant.stockQuantity;
          variant.stockQuantity = prev + item.quantity;
          await variant.save();

          await InventoryTransaction.create({
            product: variant.product,
            variant: variant._id,
            sku: variant.sku,
            type: 'CANCELLED_RETURN',
            quantityDelta: item.quantity,
            previousStock: prev,
            newStock: variant.stockQuantity,
            reason: `Admin cancelled order ${order.orderNumber}`,
            performedBy: req.admin.name
          });
        }
      }
    }

    order.orderStatus = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    order.statusHistory.push({
      status,
      timestamp: new Date(),
      comment: comment || `Status updated to ${status}`,
      updatedBy: req.admin.name
    });

    await order.save();

    // Broadcast update via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.to(`order_${order._id}`).emit('status_change', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          trackingNumber: order.trackingNumber,
          comment: comment || ''
        });
        io.to('admin_room').emit('order_status_updated', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus
        });
      }
    } catch (e) {}

    // Dispatch status update email to customer
    try {
      if (status === 'CANCELLED') {
        sendOrderCancelledEmail(order, comment || 'Cancelled by store administration').catch((e) =>
          console.warn('[Status Email Warning]:', e.message)
        );
      } else if (status === 'RETURNED') {
        sendRefundProcessedEmail(order, order.pricing.grandTotal).catch((e) =>
          console.warn('[Refund Email Warning]:', e.message)
        );
      } else {
        sendOrderStatusUpdateEmail({
          order,
          previousStatus,
          newStatus: status,
          trackingNumber: trackingNumber || order.trackingNumber,
          comment
        }).catch((e) => console.warn('[Status Email Warning]:', e.message));
      }
    } catch (emailErr) {
      console.warn('[Order Status Email Warning]:', emailErr.message);
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download / stream printable PDF tax invoice
// @route   GET /api/orders/:id/invoice
// @access  Private (Customer or Admin)
export const generateOrderInvoice = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Permission check
    if (req.user && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${order.orderNumber}.pdf"`);

    doc.pipe(res);

    // Header
    doc
      .fontSize(22)
      .fillColor('#832729')
      .text('AURA FASHION', 40, 40)
      .fontSize(10)
      .fillColor('#555555')
      .text('Curated Elegance & Modern Clothing', 40, 68)
      .text('Bengaluru, Karnataka, India', 40, 82)
      .text('Phone / WhatsApp: +91 7022018850 | Email: shoppe.aurafashion@gmail.com', 40, 96);

    doc.moveTo(40, 115).lineTo(555, 115).strokeColor('#E2E8F0').stroke();

    // Invoice Meta
    doc
      .fontSize(16)
      .fillColor('#1E293B')
      .text('TAX INVOICE', 40, 130)
      .fontSize(10)
      .text(`Invoice No: ${order.orderNumber}`, 40, 155)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 40, 170)
      .text(`Payment Mode: ${order.paymentMethod} (${order.paymentInfo.status})`, 40, 185)
      .text(`Order Status: ${order.orderStatus}`, 40, 200);

    // Bill To
    doc
      .fontSize(12)
      .fillColor('#1E293B')
      .text('Billed & Shipped To:', 320, 130)
      .fontSize(10)
      .fillColor('#475569')
      .text(order.shippingAddress.fullName, 320, 150)
      .text(
        `${order.shippingAddress.houseNo}, ${order.shippingAddress.street}${
          order.shippingAddress.area ? ', ' + order.shippingAddress.area : ''
        }`,
        320,
        165
      )
      .text(
        `${order.shippingAddress.landmark ? 'Landmark: ' + order.shippingAddress.landmark + ' | ' : ''}${
          order.shippingAddress.city
        }, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
        320,
        180
      )
      .text(
        `Phone: ${order.shippingAddress.phone}${
          order.shippingAddress.latitude && order.shippingAddress.longitude
            ? ` (GPS: ${order.shippingAddress.latitude.toFixed(4)}, ${order.shippingAddress.longitude.toFixed(4)})`
            : ''
        }`,
        320,
        195
      );

    doc.moveTo(40, 225).lineTo(555, 225).strokeColor('#E2E8F0').stroke();

    // Table Header
    let y = 240;
    doc
      .fontSize(10)
      .fillColor('#1E293B')
      .text('Item Description', 45, y)
      .text('Variant (Size/Color)', 250, y)
      .text('Qty', 380, y)
      .text('Unit Price', 420, y)
      .text('Subtotal', 490, y);

    doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor('#CBD5E1').stroke();
    y += 25;

    // Items
    order.items.forEach((item) => {
      doc
        .fontSize(9)
        .fillColor('#334155')
        .text(item.productName, 45, y, { width: 195, lineBreak: false })
        .text(`${item.size} / ${item.color}`, 250, y)
        .text(item.quantity.toString(), 385, y)
        .text(`Rs. ${item.price.toFixed(2)}`, 420, y)
        .text(`Rs. ${item.subtotal.toFixed(2)}`, 490, y);

      y += 20;
    });

    doc.moveTo(40, y + 5).lineTo(555, y + 5).strokeColor('#CBD5E1').stroke();
    y += 18;

    // Totals
    doc
      .fontSize(10)
      .fillColor('#475569')
      .text('Items Total:', 380, y)
      .text(`Rs. ${order.pricing.itemsTotal.toFixed(2)}`, 480, y);
    y += 18;

    doc
      .text('Delivery Charges:', 380, y)
      .text(`Rs. ${order.pricing.deliveryCharge.toFixed(2)}`, 480, y);
    y += 18;

    if (order.pricing.discountAmount > 0) {
      doc
        .fillColor('#15803D')
        .text(`Discount (${order.pricing.couponCode || 'Coupon'}):`, 380, y)
        .text(`-Rs. ${order.pricing.discountAmount.toFixed(2)}`, 480, y);
      y += 18;
    }

    doc
      .fontSize(12)
      .fillColor('#832729')
      .text('Grand Total:', 380, y)
      .text(`Rs. ${order.pricing.grandTotal.toFixed(2)}`, 480, y);

    // Footer
    doc
      .fontSize(9)
      .fillColor('#94A3B8')
      .text(
        'Thank you for shopping with Aura Fashion! For support, WhatsApp +91 7022018850 or email shoppe.aurafashion@gmail.com',
        40,
        740,
        { align: 'center', width: 515 }
      );

    doc.end();
  } catch (error) {
    next(error);
  }
};
