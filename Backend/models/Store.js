const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    logo_url: {
        type: String
    },
    base_url: {
        type: String
    }
});

module.exports = mongoose.model("Store", storeSchema);