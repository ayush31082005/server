const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');

// Helper: get start date for range
const getStartDate = (range) => {
    const now = new Date();
    if (range === 'week') return new Date(now.setDate(now.getDate() - 7));
    if (range === 'month') return new Date(now.setMonth(now.getMonth() - 1));
    if (range === 'year') return new Date(now.setFullYear(now.getFullYear() - 1));
    return new Date(0);
};

// @desc  Get user stats
// @route GET /api/admin/stats/users
// @access Admin Protected
exports.getUserStats = async (req, res) => {
    try {
        const { range = 'month' } = req.query;
        const startDate = getStartDate(range);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [total, active, newToday] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: { $ne: false } }),
            User.countDocuments({ createdAt: { $gte: today } }),
        ]);

        // Monthly growth chart (last 12 months)
        const chartData = await Promise.all(
            Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (11 - i));
                const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                return User.countDocuments({ createdAt: { $gte: start, $lte: end } });
            })
        );

        res.json({ total, active, newToday, growth: 0, chartData });
    } catch (err) {
        console.error('getUserStats error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc  Get product stats
// @route GET /api/admin/stats/products
// @access Admin Protected
exports.getProductStats = async (req, res) => {
    try {
        const products = await Product.find();
        const total = products.length;
        const outOfStock = products.filter(p => p.stock === 0 || p.countInStock === 0).length;

        // Top selling from orders
        const topSelling = await Order.aggregate([
            { $group: { _id: '$product', sales: { $sum: '$quantity' }, revenue: { $sum: '$total' } } },
            { $sort: { sales: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ['$productInfo.name', 'Unknown Product'] }, sales: 1, revenue: 1 } }
        ]);

        // Monthly sales chart
        const chartData = await Promise.all(
            Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (11 - i));
                const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                return Order.countDocuments({ createdAt: { $gte: start, $lte: end } });
            })
        );

        const revenue = topSelling.reduce((sum, p) => sum + (p.revenue || 0), 0);
        res.json({ total, outOfStock, topSelling, revenue, chartData });
    } catch (err) {
        console.error('getProductStats error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc  Get order stats
// @route GET /api/admin/stats/orders
// @access Admin Protected
exports.getOrderStats = async (req, res) => {
    try {
        const [total, pending, completed, revenueAgg] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'delivered' }),
            Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
        ]);

        const revenue = revenueAgg[0]?.total || 0;

        // Monthly order chart (last 12 months)
        const chartData = await Promise.all(
            Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (11 - i));
                const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                return Order.countDocuments({ createdAt: { $gte: start, $lte: end } });
            })
        );

        res.json({ total, pending, completed, revenue, chartData });
    } catch (err) {
        console.error('getOrderStats error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc  Get recent activity (last 10 orders + last 5 users)
// @route GET /api/admin/activity/recent
// @access Admin Protected
exports.getRecentActivity = async (req, res) => {
    try {
        const [recentOrders, recentUsers, recentTransactions, recentIncomes] = await Promise.all([
            Order.find().sort({ createdAt: -1 }).limit(10)
                .populate('user', 'name firstName lastName')
                .populate('product', 'name'),
            User.find().sort({ createdAt: -1 }).limit(10).select('name firstName lastName createdAt rank'),
            Transaction.find({ status: 'success' }).sort({ createdAt: -1 }).limit(10)
                .populate('userId', 'name firstName lastName'),
            IncomeHistory.find().sort({ createdAt: -1 }).limit(10)
                .populate('userId', 'name firstName lastName')
        ]);

        const activities = [];

        // 1. Process Orders
        recentOrders.forEach(order => {
            const userName = order.shippingInfo?.fullName
                || order.user?.name
                || `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim()
                || 'Customer';
            activities.push({
                id: `order-${order._id}`,
                user: userName,
                type: 'order',
                action: 'purchased',
                product: order.product?.name || 'a product',
                amount: order.total,
                createdAt: order.createdAt
            });
        });

        // 2. Process User Registrations & Rank
        recentUsers.forEach(user => {
            const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'New User';
            activities.push({
                id: `user-${user._id}`,
                user: userName,
                type: 'user',
                action: 'joined the network',
                createdAt: user.createdAt
            });

            if (user.rank && user.rank !== 'Member') {
                activities.push({
                    id: `rank-${user._id}`,
                    user: userName,
                    type: 'rank',
                    action: `achieved ${user.rank} Rank`,
                    createdAt: user.updatedAt || user.createdAt
                });
            }
        });

        // 3. Process Recharges (Transactions)
        recentTransactions.forEach(tx => {
            const userName = tx.userId?.name
                || `${tx.userId?.firstName || ''} ${tx.userId?.lastName || ''}`.trim()
                || 'User';
            activities.push({
                id: `tx-${tx._id}`,
                user: userName,
                type: 'recharge',
                action: `recharged ${tx.operator} (${tx.type})`,
                amount: tx.amount,
                createdAt: tx.createdAt
            });
        });

        // 4. Process Incomes/Bonuses
        recentIncomes.forEach(income => {
            const userName = income.userId?.name
                || `${income.userId?.firstName || ''} ${income.userId?.lastName || ''}`.trim()
                || 'User';
            activities.push({
                id: `income-${income._id}`,
                user: userName,
                type: 'income',
                action: `earned ${income.type} Bonus`,
                amount: income.amount,
                createdAt: income.createdAt
            });
        });

        // Sort all by createdAt desc and limit to top 15
        const sortedActivities = activities
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 15)
            .map(act => ({
                ...act,
                time: getTimeAgo(act.createdAt)
            }));

        res.json(sortedActivities);
    } catch (err) {
        console.error('getRecentActivity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

function getTimeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}
