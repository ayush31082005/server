// const Franchise = require("../models/Franchise");

// // ================= ADD =================
// exports.addFranchise = async (req, res) => {
//     try {
//         const { franchiseId, name, mobile, address, password } = req.body;

//         // Check if franchise exists
//         const exist = await Franchise.findOne({ franchiseId });

//         if (exist) {
//             return res.status(400).json({
//                 message: "Franchise already exists"
//             });
//         }

//         // बिना bcrypt के सीधा पासवर्ड सेव करें
//         const franchise = await Franchise.create({
//             franchiseId,
//             name,
//             mobile,
//             address,
//             password: password  // सीधा पासवर्ड
//         });

//         res.status(201).json({
//             message: "Franchise Added Successfully",
//             franchise
//         });

//     } catch (err) {
//         console.error("Add Franchise Error:", err);
//         res.status(500).json({ message: err.message });
//     }
// };

// // ================= PUBLIC LIST =================
// exports.getFranchiseList = async (req, res) => {
//     try {
//         const data = await Franchise.find().select("-password");
//         res.json(data);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

// // ================= ADMIN LIST =================
// exports.getAdminFranchiseList = async (req, res) => {
//     try {
//         const data = await Franchise.find().select("+password");
//         res.json(data);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };




const Franchise = require("../models/Franchise");

// ================= ADD =================
exports.addFranchise = async (req, res) => {
    try {
        const { franchiseId, name, mobile, address, password } = req.body;

        // Check if franchise exists
        const exist = await Franchise.findOne({ franchiseId });

        if (exist) {
            return res.status(400).json({
                message: "Franchise already exists"
            });
        }

        // Password direct save
        const franchise = await Franchise.create({
            franchiseId,
            name,
            mobile,
            address,
            password
        });

        res.status(201).json({
            message: "Franchise Added Successfully",
            franchise
        });

    } catch (err) {
        console.error("Add Franchise Error:", err);
        res.status(500).json({ message: err.message });
    }
};



// ================= PUBLIC LIST =================
exports.getFranchiseList = async (req, res) => {
    try {

        const data = await Franchise
            .find()
            .select("-password");

        res.json(data);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



// ================= ADMIN LIST =================
exports.getAdminFranchiseList = async (req, res) => {
    try {

        const data = await Franchise
            .find()
            .select("+password");

        res.json(data);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



// ================= FRANCHISE LOGIN =================
exports.franchiseLogin = async (req, res) => {

    try {

        const { franchiseId, password } = req.body;

        if (!franchiseId || !password) {
            return res.status(400).json({
                success: false,
                message: "Franchise ID and Password required"
            });
        }

       
        const franchise = await Franchise
            .findOne({ franchiseId })
            .select("+password");

        if (!franchise) {
            return res.status(404).json({
                success: false,
                message: "Franchise ID not found"
            });
        }

        if (franchise.password !== password) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // login success
        res.status(200).json({
            success: true,
            message: "Login successful",
            franchise
        });

    } catch (err) {

        console.error("Franchise Login Error:", err);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

};
