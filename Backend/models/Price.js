const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    store_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    product_url: {
        type: String
    },
    image: {
        type: String
    },
    scraped_at: {
        type: Date,
        default: Date.now
    },
    expires_at: {
        type: Date,
        index: true
    }
});

module.exports = mongoose.model("Price", priceSchema);
