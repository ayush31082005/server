const mongoose = require("mongoose");
const FranchiseDashboard = require("../models/franchiseDashboardModel");

exports.createFranchiseDashboard = async (req, res) => {
  try {
    const data = req.body;
    const franchiseId = data.franchiseId;

    if (!franchiseId) {
      return res.status(400).json({
        success: false,
        message: "franchiseId is required",
      });
    }

    const existingDashboard = await FranchiseDashboard.findOne({ franchiseId });
    const profilePhotoFilename = req.files?.profilePhoto?.[0]?.filename;

    const payload = {
      ...data,
      franchiseId,
      photoUrl:
        profilePhotoFilename
          ? `/uploads/${profilePhotoFilename}`
          : existingDashboard?.photoUrl || data.photoUrl || "",
      documents: {
        panCard:
          req.files?.panCard?.[0]?.filename ||
          existingDashboard?.documents?.panCard ||
          "",
        aadhaarCard:
          req.files?.aadhaarCard?.[0]?.filename ||
          existingDashboard?.documents?.aadhaarCard ||
          "",
        gstCertificate:
          req.files?.gstCertificate?.[0]?.filename ||
          existingDashboard?.documents?.gstCertificate ||
          "",
      },
    };

    const dashboard = await FranchiseDashboard.findOneAndUpdate(
      { franchiseId },
      payload,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: existingDashboard
        ? "Franchise Dashboard Updated"
        : "Franchise Dashboard Created",
      data: dashboard,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getFranchiseDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const filters = [{ franchiseId: id }];

    if (mongoose.Types.ObjectId.isValid(id)) {
      filters.unshift({ _id: id });
    }

    const data = await FranchiseDashboard.findOne({ $or: filters });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Franchise dashboard not found",
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
