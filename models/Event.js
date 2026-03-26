const mongoose = require("mongoose")

const eventSchema = new mongoose.Schema({

    title: String,

    content: String,

    image: String,

    date: String,

    time: String,

    location: String,

    category: String,

    createdAt: {
        type: Date,
        default: Date.now
    }

})

module.exports = mongoose.model("Event", eventSchema)
