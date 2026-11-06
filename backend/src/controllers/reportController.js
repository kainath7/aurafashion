import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import ExcelJS from 'exceljs';

// @desc    Dashboard overview metrics
// @route   GET /api/reports/dashboard-stats
// @access  Private (Admin)
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'] }
    });
    const completedOrders = await Order.countDocuments({ orderStatus: 'DELIVERED' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();

    // Low stock count (variants with stock <= 5 and > 0)
    const lowStockCount = await ProductVariant.countDocuments({
      stockQuantity: { $gt: 0, $lte: 5 }
    });

    const outOfStockCount = await ProductVariant.countDocuments({
      stockQuantity: { $lte: 0 }
    });

    // Total revenue from confirmed or delivered orders
    const revenueAgg = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ['CANCELLED', 'RETURNED'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.grandTotal' }
        }
      }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    // Monthly revenue for the past 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          orderStatus: { $nin: ['CANCELLED', 'RETURNED'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSales: { $sum: '$pricing.grandTotal' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format monthly labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlySales = monthlySales.map((item) => ({
      label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      sales: item.totalSales,
      orders: item.orderCount
    }));

    // Recent 5 orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber customerInfo pricing orderStatus paymentMethod createdAt');

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalCustomers,
        totalProducts,
        lowStockCount,
        outOfStockCount
      },
      monthlySales: formattedMonthlySales,
      recentOrders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export orders to Excel spreadsheet
// @route   GET /api/reports/export/orders
// @access  Private (Admin)
export const exportOrdersExcel = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Aura Fashion Orders');

    worksheet.columns = [
      { header: 'Order No', key: 'orderNumber', width: 22 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 20 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'City', key: 'city', width: 16 },
      { header: 'Items Count', key: 'itemsCount', width: 12 },
      { header: 'Grand Total (INR)', key: 'grandTotal', width: 18 },
      { header: 'Payment Method', key: 'paymentMethod', width: 16 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
      { header: 'Order Status', key: 'orderStatus', width: 18 }
    ];

    orders.forEach((order) => {
      worksheet.addRow({
        orderNumber: order.orderNumber,
        date: new Date(order.createdAt).toISOString().slice(0, 10),
        customerName: order.customerInfo.name,
        phone: order.customerInfo.phone,
        city: order.shippingAddress.city,
        itemsCount: order.items.reduce((acc, curr) => acc + curr.quantity, 0),
        grandTotal: order.pricing.grandTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentInfo.status,
        orderStatus: order.orderStatus
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=aura_fashion_orders.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Export inventory to Excel spreadsheet
// @route   GET /api/reports/export/inventory
// @access  Private (Admin)
export const exportInventoryExcel = async (req, res, next) => {
  try {
    const variants = await ProductVariant.find().populate({
      path: 'product',
      select: 'name slug brand fabric basePrice'
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Aura Fashion Inventory');

    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Color', key: 'color', width: 16 },
      { header: 'Size', key: 'size', width: 12 },
      { header: 'Available Stock', key: 'stock', width: 16 },
      { header: 'Base Price (INR)', key: 'price', width: 16 },
      { header: 'Status', key: 'status', width: 14 }
    ];

    variants.forEach((v) => {
      worksheet.addRow({
        sku: v.sku,
        name: v.product?.name || 'Unknown',
        color: v.color,
        size: v.size,
        stock: v.stockQuantity,
        price: v.product?.basePrice || 0,
        status: v.stockQuantity > 5 ? 'In Stock' : v.stockQuantity > 0 ? 'Low Stock' : 'Out of Stock'
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=aura_fashion_inventory.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
