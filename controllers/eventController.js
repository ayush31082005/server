const Event = require("../models/Event")
const fs = require("fs")
const path = require("path")

exports.addEvent = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Image is required" })
        const newEvent = new Event({
            title: req.body.title,
            content: req.body.content,
            image: req.file.filename,
            date: req.body.date || null,
            time: req.body.time || null,
            location: req.body.location || null,
            category: req.body.category || null,
        })
        await newEvent.save()
        res.json({ success: true, message: "Event Added", event: newEvent })
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error: " + error.message })
    }
}

exports.getEvents = async (req, res) => {
    try {
        const data = await Event.find().sort({ createdAt: -1 })
        res.json(data)
    } catch (error) {
        res.status(500).json({ message: "Server error" })
    }
}

exports.deleteEvent = async (req, res) => {
    try {
        const item = await Event.findById(req.params.id)
        if (!item) return res.status(404).json({ message: "Event not found" })
        const filePath = path.join(__dirname, "../uploads/events", item.image)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        await Event.findByIdAndDelete(req.params.id)
        res.json({ success: true, message: "Event deleted" })
    } catch (error) {
        res.status(500).json({ message: "Server error" })
    }
}

exports.updateEvent = async (req, res) => {
    try {
        const item = await Event.findById(req.params.id)
        if (!item) return res.status(404).json({ message: "Event not found" })

        if (req.file) {
            const oldPath = path.join(__dirname, "../uploads/events", item.image)
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
            item.image = req.file.filename
        }

        item.title = req.body.title || item.title
        item.content = req.body.content || item.content
        item.date = req.body.date !== undefined ? req.body.date : item.date
        item.time = req.body.time !== undefined ? req.body.time : item.time
        item.location = req.body.location !== undefined ? req.body.location : item.location
        item.category = req.body.category !== undefined ? req.body.category : item.category

        await item.save()
        res.json({ success: true, message: "Event updated", event: item })
    } catch (error) {
        res.status(500).json({ message: "Server error" })
    }
}
