const Product = require("../models/Product");
const Price = require("../models/Price");
const Wishlist = require("../models/Wishlist");

const REFRESH_TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function getCatalogExpiryDate(now = new Date()) {
    return new Date(now.getTime() + REFRESH_TOKEN_RETENTION_MS);
}

async function deleteExpiredCatalogData(referenceDate = new Date()) {
    const wishlistedProductIds = await Wishlist.distinct("product_id");
    const preservedIds = wishlistedProductIds.map((id) => String(id));

    const expiredProducts = await Product.find({
        expires_at: { $lte: referenceDate },
        _id: { $nin: preservedIds }
    }).select("_id");

    const expiredProductIds = expiredProducts.map((doc) => doc._id);

    if (expiredProductIds.length) {
        await Price.deleteMany({ product_id: { $in: expiredProductIds } });
        await Product.deleteMany({ _id: { $in: expiredProductIds } });
    }

    await Price.deleteMany({
        expires_at: { $lte: referenceDate },
        product_id: { $nin: preservedIds }
    });
}

function startCatalogCleanupJob() {
    deleteExpiredCatalogData().catch((error) => {
        console.error("Catalog cleanup failed:", error.message);
    });

    return setInterval(() => {
        deleteExpiredCatalogData().catch((error) => {
            console.error("Catalog cleanup failed:", error.message);
        });
    }, CLEANUP_INTERVAL_MS);
}

module.exports = {
    getCatalogExpiryDate,
    deleteExpiredCatalogData,
    startCatalogCleanupJob
};
