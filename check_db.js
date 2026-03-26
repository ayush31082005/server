const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://sanyuktparivar3_db_user:qQrOWLx4NO3a9b83@cluster0.bhprzwx.mongodb.net/sanyukt_db?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
        const Repurchase = mongoose.model('Repurchase', new mongoose.Schema({}, { strict: false }));
        const IncomeHistory = mongoose.model('IncomeHistory', new mongoose.Schema({}, { strict: false }));
        const BinaryTree = mongoose.model('BinaryTree', new mongoose.Schema({}, { strict: false }));

        const users = await User.find({ 
            $or: [{ memberId: 'SPRL1487' }, { userName: /ram/i }] 
        }).limit(5);

        if (users.length === 0) {
            console.log('No matching users found');
        } else {
            for (const user of users) {
                console.log(`\n--- USER DATA: ${user.userName} (${user.memberId}) ---`);
                console.log(`_id: ${user._id}`);
                console.log(`Rank: ${user.rank}, Package: ${user.packageType}, Active: ${user.activeStatus}`);
                console.log(`Wallet: ${user.walletBalance}, PV: ${user.pv}, BV: ${user.bv}`);
                console.log(`Team PV: L:${user.leftTeamPV}, R:${user.rightTeamPV}`);

                console.log('\n--- BINARY TREE RECORD ---');
                const tree = await BinaryTree.findOne({ userId: user._id }).lean();
                if (tree) {
                    console.log(`LeftBV: ${tree.leftBV}, RightBV: ${tree.rightBV}`);
                    console.log(`LeftPV: ${tree.leftPV}, RightPV: ${tree.rightPV}`);
                    console.log(`MatchedPV: ${tree.matchedPV}`);
                    console.log(`TotalLeft: ${tree.totalLeft}, TotalRight: ${tree.totalRight}`);
                } else {
                    console.log('No BinaryTree record found for this user.');
                }

                console.log('\n--- USER ORDERS ---');
                const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).lean();
                orders.forEach(o => {
                    console.log(`Order ID: ${o._id}, Status: ${o.status}, Total: ${o.total}, BV: ${o.bv}, PV: ${o.pv}, Code: ${o.orderCode || 'N/A'}`);
                });

                console.log('\n--- DIRECT DOWNLINE ---');
                const directs = await User.find({ sponsorId: user.memberId }).select('userName memberId activeStatus packageType bv pv').lean();
                directs.forEach(d => {
                    console.log(`Member: ${d.userName} (${d.memberId}), Active: ${d.activeStatus}, Package: ${d.packageType}, PV: ${d.pv}`);
                });

                console.log('\n--- TREE DOWNLINE (Children) ---');
                const children = await User.find({ parentId: user._id }).select('userName memberId activeStatus packageType position').lean();
                children.forEach(c => {
                    console.log(`Member: ${c.userName} (${c.memberId}), Position: ${c.position}, Active: ${c.activeStatus}`);
                });

                console.log('\n--- USER REPURCHASES ---');
                const repurchases = await Repurchase.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
                repurchases.forEach(r => {
                    console.log(`ID: ${r._id}, Amount: ${r.amount}, BV: ${r.bv}, Status: ${r.status}, Date: ${r.createdAt}`);
                });

                console.log('\n--- USER INCOME HISTORY (Last 20) ---');
                const income = await IncomeHistory.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean();
                console.log('\n--- AGGREGATE TOTAL PURCHASES ---');
                const purchaseAggregate = await Order.aggregate([
                    { $match: { user: user._id, status: { $ne: "cancelled" } } },
                    { 
                        $group: { 
                            _id: null, 
                            totalSales: { $sum: "$total" },
                            orderCount: { $sum: 1 }
                        } 
                    }
                ]);
                console.log(`Aggregate Total: ${purchaseAggregate[0]?.totalSales || 0}, Count: ${purchaseAggregate[0]?.orderCount || 0}`);
            }
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

check();
