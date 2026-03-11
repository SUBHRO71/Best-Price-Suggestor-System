const Product = require("../models/Product");
const Store = require("../models/Store");
const Price = require("../models/Price");
const scrapeFlipkart = require("./flipkartScraper");
const scrapeAmazon = require("./amazonScraper");
const { getCatalogExpiryDate } = require("./catalogCleanupService");

const STORE_SCRAPERS = {
    Flipkart: scrapeFlipkart,
    Amazon: scrapeAmazon
};

function normalizeQuery(query) {
    return String(query || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(value) {
    return normalizeQuery(value)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
}

function buildContextTokens(query) {
    const stopWords = new Set([
        "for", "with", "and", "the", "this", "that", "from", "your", "you",
        "pack", "combo", "piece", "pcs", "set", "big", "small", "size",
        "mobile", "phone", "smartphone", "cover", "case", "bag", "dry",
        "water", "waterproof", "plastic", "transparent"
    ]);

    const tokens = tokenize(query).filter((token) => !stopWords.has(token));
    return Array.from(new Set(tokens));
}

function generateQueryVariants(query) {
    const raw = String(query || "").trim();
    if (!raw) return [];

    const cleaned = raw
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/[|,()[\]{}]+/g, " ")
        .replace(/\b(pack|combo|piece|pcs|set)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    const compactTokens = cleaned
        .split(" ")
        .filter((token) => token.length > 2)
        .slice(0, 8)
        .join(" ");

    const broadTokens = cleaned
        .split(" ")
        .filter((token) => token.length > 2)
        .slice(0, 5)
        .join(" ");

    return Array.from(new Set([raw, cleaned, compactTokens, broadTokens].filter(Boolean)));
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

function scoreProductMatch(query, item) {
    const queryTokens = buildContextTokens(query);
    const titleTokens = new Set(tokenize(item?.name || ""));
    if (!titleTokens.size) return 0;

    let score = 0;
    for (const token of queryTokens) {
        if (titleTokens.has(token)) {
            score += token.length >= 5 ? 3 : 2;
        }
    }

    const normalizedQuery = normalizeQuery(query);
    const normalizedTitle = normalizeQuery(item?.name || "");

    if (normalizedQuery && normalizedTitle.includes(normalizedQuery)) {
        score += 8;
    }

    for (const variant of generateQueryVariants(query).slice(1)) {
        if (variant && normalizedTitle.includes(normalizeQuery(variant))) {
            score += 4;
            break;
        }
    }

    return score;
}

function pickBestMatchingItem(query, items, storeName) {
    const scored = items
        .map((item) => ({
            ...item,
            store: item.store || storeName,
            matchScore: scoreProductMatch(query, item)
        }))
        .filter((item) => item.matchScore > 0);

    if (!scored.length) return null;

    scored.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.price - b.price;
    });

    const bestScore = scored[0].matchScore;
    const closeMatches = scored.filter((item) => item.matchScore >= bestScore - 2);
    closeMatches.sort((a, b) => a.price - b.price);

    const { matchScore, ...bestItem } = closeMatches[0];
    return bestItem;
}

async function scrapeAllStores(query) {
    const [flipkartResult, amazonResult] = await Promise.allSettled([
        scrapeFlipkart(query),
        scrapeAmazon(query)
    ]);

    return {
        Flipkart: flipkartResult.status === "fulfilled" ? flipkartResult.value : [],
        Amazon: amazonResult.status === "fulfilled" ? amazonResult.value : [],
        errors: {
            Flipkart: flipkartResult.status === "rejected",
            Amazon: amazonResult.status === "rejected"
        }
    };
}

async function retryMissingStores(query, initialByStore) {
    const retriedByStore = { ...initialByStore };
    const variants = generateQueryVariants(query);

    for (const [storeName, scraper] of Object.entries(STORE_SCRAPERS)) {
        if (retriedByStore[storeName]?.length) continue;

        for (const variant of variants) {
            try {
                const results = await scraper(variant);
                if (results.length) {
                    retriedByStore[storeName] = results;
                    break;
                }
            } catch {
                retriedByStore[storeName] = [];
            }
        }

        retriedByStore[storeName] = retriedByStore[storeName] || [];
    }

    return retriedByStore;
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

    const expiresAt = getCatalogExpiryDate(new Date());
    await Product.updateOne({ _id: existingProduct._id }, { expires_at: expiresAt });
    await Price.updateMany({ product_id: existingProduct._id }, { expires_at: expiresAt });

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
    const initialScrape = await scrapeAllStores(query);
    const byStore = await retryMissingStores(query, {
        Flipkart: initialScrape.Flipkart,
        Amazon: initialScrape.Amazon
    });

    const bestPerStore = Object.entries(byStore)
        .map(([storeName, items]) => pickBestMatchingItem(query, items, storeName))
        .filter(Boolean);

    const unavailableStores = Object.keys(STORE_SCRAPERS).filter(
        (storeName) => !bestPerStore.some((item) => item.store === storeName)
    );

    if (!bestPerStore.length) {
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

    bestPerStore.sort((a, b) => a.price - b.price);
    const scrapedAt = new Date();
    const expiresAt = getCatalogExpiryDate(scrapedAt);
    const normalizedName = normalizeQuery(query);
    const productDoc = await Product.findOneAndUpdate(
        { normalized_name: normalizedName },
        { name: query.trim(), normalized_name: normalizedName, expires_at: expiresAt },
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
                scraped_at: scrapedAt,
                expires_at: expiresAt
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
    }

    await updateProductLinks(productDoc._id, bestPerStore);

    return {
        source: "scraper",
        query,
        total: bestPerStore.length,
        bestDeal: bestPerStore[0]
            ? {
                ...bestPerStore[0],
                scrapedAt
            }
            : null,
        unavailableStores,
        results: bestPerStore.map((item) => ({
            ...item,
            scrapedAt
        }))
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
