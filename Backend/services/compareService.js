const Product = require("../models/Product");
const Store = require("../models/Store");
const Price = require("../models/Price");
const scrapeFlipkart = require("./flipkartScraper");
const scrapeAmazon = require("./amazonScraper");

function normalizeQuery(query) {
    return String(query || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function toComparedResult(priceDocs) {
    return priceDocs
        .map((doc) => ({
            store: doc.store_id?.name || "Unknown",
            name: doc.product_id?.name || "",
            price: doc.price,
            link: doc.product_url || null,
            scrapedAt: doc.scraped_at
        }))
        .sort((a, b) => a.price - b.price);
}

function latestPricePerStore(priceDocs) {
    const latestByStore = new Map();
    const sortedByNewest = [...priceDocs].sort(
        (a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
    );

    for (const doc of sortedByNewest) {
        const storeKey = String(doc.store_id?._id || doc.store_id || "");
        if (!storeKey || latestByStore.has(storeKey)) continue;
        latestByStore.set(storeKey, doc);
    }

    return Array.from(latestByStore.values());
}

function bestScrapedPricePerStore(items) {
    const bestByStore = new Map();

    for (const item of items) {
        const existing = bestByStore.get(item.store);
        if (!existing || item.price < existing.price) {
            bestByStore.set(item.store, item);
        }
    }

    return Array.from(bestByStore.values()).sort((a, b) => a.price - b.price);
}

async function ensureStore(storeName, link) {
    let baseUrl;
    if (link) {
        try {
            baseUrl = new URL(link).origin;
        } catch {
            baseUrl = undefined;
        }
    }

    return Store.findOneAndUpdate(
        { name: storeName },
        { name: storeName, base_url: baseUrl },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
}

async function updateProductLinks(productId, items) {
    const product = await Product.findById(productId);
    if (!product) return;

    const linksByStore = new Map((product.links || []).map((entry) => [entry.store, entry.url]));
    for (const item of items) {
        if (!item?.store || !item?.link) continue;
        linksByStore.set(item.store, item.link);
    }

    product.links = Array.from(linksByStore.entries()).map(([store, url]) => ({ store, url }));
    await product.save();
}

async function getCachedComparison(query, minStoresRequired) {
    const normalizedName = normalizeQuery(query);
    const existingProduct = await Product.findOne({ normalized_name: normalizedName });
    if (!existingProduct) return null;

    const cachedPrices = await Price.find({ product_id: existingProduct._id })
        .populate("store_id", "name")
        .populate("product_id", "name")
        .sort({ scraped_at: -1 });

    const latestByStore = latestPricePerStore(cachedPrices);
    if (latestByStore.length < minStoresRequired) return null;

    const compared = toComparedResult(latestByStore);
    return {
        source: "database",
        query,
        total: compared.length,
        bestDeal: compared[0] || null,
        results: compared
    };
}

async function scrapeAndPersistComparison(query) {
    const [flipkartResult, amazonResult] = await Promise.allSettled([
        scrapeFlipkart(query),
        scrapeAmazon(query)
    ]);

    const scraped = [
        ...(flipkartResult.status === "fulfilled" ? flipkartResult.value : []),
        ...(amazonResult.status === "fulfilled" ? amazonResult.value : [])
    ];

    const unavailableStores = [
        ...(flipkartResult.status === "rejected" ? ["Flipkart"] : []),
        ...(amazonResult.status === "rejected" ? ["Amazon"] : [])
    ];

    if (!scraped.length) {
        return {
            source: "scraper",
            query,
            message: "No results found from stores",
            unavailableStores,
            total: 0,
            bestDeal: null,
            results: []
        };
    }

    const bestPerStore = bestScrapedPricePerStore(scraped);
    const normalizedName = normalizeQuery(query);
    const productDoc = await Product.findOneAndUpdate(
        { normalized_name: normalizedName },
        { name: query.trim(), normalized_name: normalizedName },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    for (const item of bestPerStore) {
        const storeDoc = await ensureStore(item.store, item.link);
        await Price.findOneAndUpdate(
            { product_id: productDoc._id, store_id: storeDoc._id },
            {
                product_id: productDoc._id,
                store_id: storeDoc._id,
                price: item.price,
                product_url: item.link,
                scraped_at: new Date()
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
    }

    await updateProductLinks(productDoc._id, bestPerStore);

    return {
        source: "scraper",
        query,
        total: bestPerStore.length,
        bestDeal: bestPerStore[0] || null,
        unavailableStores,
        results: bestPerStore
    };
}

async function compareProducts(query, options = {}) {
    const {
        dbFirst = false,
        minStoresRequired = 2
    } = options;

    if (dbFirst) {
        const cached = await getCachedComparison(query, minStoresRequired);
        if (cached) return cached;
    }

    return scrapeAndPersistComparison(query);
}

module.exports = {
    compareProducts
};
