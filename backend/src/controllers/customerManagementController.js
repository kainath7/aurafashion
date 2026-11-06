import User from '../models/User.js';
import Order from '../models/Order.js';

// @desc    Admin: get all customers with aggregate order statistics
// @route   GET /api/admin/customers
// @access  Private (Admin)
export const getAdminCustomers = async (req, res, next) => {
  try {
    const { keyword, page = 1, limit = 20 } = req.query;
    const query = { role: 'customer' };

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalCustomers = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Compute stats for each customer
    const customersWithStats = await Promise.all(
      users.map(async (u) => {
        const orders = await Order.find({ user: u._id, orderStatus: { $ne: 'CANCELLED' } });
        const totalSpent = orders.reduce((sum, ord) => sum + (ord.pricing?.grandTotal || 0), 0);
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          createdAt: u.createdAt,
          addressesCount: u.addresses?.length || 0,
          totalOrders: orders.length,
          totalSpent
        };
      })
    );

    res.json({
      success: true,
      count: customersWithStats.length,
      totalCustomers,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCustomers / limitNum),
      customers: customersWithStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: get customer details and complete order history
// @route   GET /api/admin/customers/:id
// @access  Private (Admin)
export const getAdminCustomerDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    const totalSpent = orders
      .filter((o) => o.orderStatus !== 'CANCELLED')
      .reduce((sum, ord) => sum + (ord.pricing?.grandTotal || 0), 0);

    res.json({
      success: true,
      customer: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addresses: user.addresses,
        createdAt: user.createdAt,
        totalOrders: orders.length,
        totalSpent,
        orders
      }
    });
  } catch (error) {
    next(error);
  }
};
