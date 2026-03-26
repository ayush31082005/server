const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/Database');

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startCronJobs();
});

// ── Daily Cron Jobs ───────────────────────────────────────────────────────────
function startCronJobs() {
    const mlmController = require('./controllers/mlmController');

    // Raat 11:59 PM pe matching bonus + profit sharing calculate karo
    // Simple interval-based scheduler (node-cron install nahi ho to bhi kaam karta hai)
    const MIDNIGHT_MS = 24 * 60 * 60 * 1000; // 24 hours

    const msUntilMidnight = () => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(23, 59, 0, 0);
        if (midnight <= now) midnight.setDate(midnight.getDate() + 1);
        return midnight - now;
    };

    const scheduleDailyJobs = async () => {
        console.log('[CRON] Running daily MLM jobs...');
        try {
            // 1. Matching Bonus calculate karo
            await mlmController.calculateDailyMatchingBonus();
            console.log('[CRON] ✅ Matching bonus done');

            // 2. Profit Sharing — aaj ke total joining amount pe 4%
            const User = require('./models/User');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const Order = require('./models/Order');
            const todayOrders = await Order.find({ createdAt: { $gte: today } });
            const dailyTurnover = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            if (dailyTurnover > 0) {
                await mlmController.distributeProfitSharing(dailyTurnover);
                console.log(`[CRON] ✅ Profit sharing done on ₹${dailyTurnover} turnover`);
            }

            // 3. Ranks update karo
            await mlmController.updateAllRanks();
            console.log('[CRON] ✅ Ranks updated');

        } catch (err) {
            console.error('[CRON] ❌ Error in daily jobs:', err.message);
        }

        // Kal phir schedule karo
        setTimeout(scheduleDailyJobs, MIDNIGHT_MS);
    };

    // Pehli baar midnight tak wait karo
    const firstRun = msUntilMidnight();
    console.log(`[CRON] Daily jobs scheduled — first run in ${Math.round(firstRun / 60000)} minutes`);
    setTimeout(scheduleDailyJobs, firstRun);
}
