const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },
        product_name: {
            type: String,
            required: true,
            trim: true
        },
        store: {
            type: String,
            trim: true,
            default: "Unknown"
        },
        price: {
            type: Number
        },
        product_url: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: { createdAt: "added_at", updatedAt: "updated_at" }
    }
);

wishlistSchema.index({ user_id: 1, product_id: 1, store: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);
