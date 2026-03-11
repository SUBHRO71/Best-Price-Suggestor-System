const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    normalized_name: {
        type: String,
        required: true,
        index: true
    },
    category: {
        type: String
    },
    links: [
        {
            store: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        }
    ],
    created_at: {
        type: Date,
        default: Date.now
    },
    expires_at: {
        type: Date,
        index: true
    }
});

module.exports = mongoose.model("Product", productSchema);
