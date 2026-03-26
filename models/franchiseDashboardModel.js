const mongoose = require("mongoose");

const franchiseDashboardSchema = new mongoose.Schema({

  franchiseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  photoUrl: String,

  franchiseName: String,
  ownerName: String,
  mobile: String,
  email: String,

  address: {
    shopAddress: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },

  professional: {
    gstNumber: String,
    panNumber: String,
    businessType: String
  },

  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    ifsc: String,
    accountType: String,
    upiId: String
  },

  documents: {
    panCard: String,
    aadhaarCard: String,
    gstCertificate: String
  }

},{ timestamps:true });

module.exports = mongoose.model("FranchiseDashboard", franchiseDashboardSchema);
