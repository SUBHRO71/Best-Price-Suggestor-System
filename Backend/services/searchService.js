const Product = require("../models/Product");
const Price = require("../models/Price");
const scrapeFlipkart = require("./flipkartScraper");
const scrapeAmazon = require("./amazonScraper");
const { normalizeText, filterRelevantItems } = require("./relevanceFilterService");

const TARGET_RESULT_COUNT = 10;

function escapeRegex(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonicalProductKey(name) {
    const normalized = normalizeText(name);
    if (!normalized) return "";

    const tokens = Array.from(
        new Set(
            normalized
                .split(" ")
                .filter((token) => token.length > 1 || /^\d+$/.test(token))
        )
    ).sort();

    return tokens.join(" ") || normalized;
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

function choosePreferredResult(current, candidate) {
    if (!current) return candidate;
    if (candidate.price !== current.price) {
        return candidate.price < current.price ? candidate : current;
    }

    return new Date(candidate.scrapedAt).getTime() > new Date(current.scrapedAt).getTime()
        ? candidate
        : current;
}

function toGenericSearchResult(item) {
    return {
        productId: item.productId || null,
        name: item.name,
        price: item.price,
        link: null,
        store: null,
        scrapedAt: item.scrapedAt
    };
}

function dedupeResults(items, seedKeys = new Set()) {
    const chosenByKey = new Map();

    for (const item of items) {
        const key = canonicalProductKey(item.name);
        if (!key || seedKeys.has(key)) continue;

        const preferred = choosePreferredResult(chosenByKey.get(key), item);
        chosenByKey.set(key, preferred);
    }

    return Array.from(chosenByKey.values()).sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        return a.name.localeCompare(b.name);
    });
}

async function getDatabaseSearchResults(query, limit = TARGET_RESULT_COUNT) {
    const trimmedQuery = String(query || "").trim();
    const normalizedQuery = normalizeText(trimmedQuery);
    if (!normalizedQuery) return [];

    const queryRegex = new RegExp(escapeRegex(normalizedQuery), "i");

    const products = await Product.find({
        $or: [{ normalized_name: queryRegex }, { name: queryRegex }]
    })
        .sort({ created_at: -1 })
        .limit(limit * 5);

    if (!products.length) return [];

    const productIds = products.map((product) => product._id);
    const prices = await Price.find({ product_id: { $in: productIds } })
        .populate("store_id", "name")
        .populate("product_id", "name normalized_name")
        .sort({ scraped_at: -1 });

    const pricesByProduct = new Map();
    for (const doc of prices) {
        const productId = String(doc.product_id?._id || doc.product_id || "");
        if (!productId) continue;

        if (!pricesByProduct.has(productId)) {
            pricesByProduct.set(productId, []);
        }

        pricesByProduct.get(productId).push(doc);
    }

    const rawResults = [];
    for (const [productId, productPrices] of pricesByProduct.entries()) {
        const latestDocs = latestPricePerStore(productPrices);
        const bestCurrentPrice = latestDocs.sort((a, b) => a.price - b.price)[0];
        if (!bestCurrentPrice) continue;

        rawResults.push({
            productId,
            name: bestCurrentPrice.product_id?.name || "",
            price: bestCurrentPrice.price,
            scrapedAt: bestCurrentPrice.scraped_at
        });
    }

    const filtered = await filterRelevantItems(trimmedQuery, rawResults);
    return dedupeResults(filtered.accepted).map(toGenericSearchResult).slice(0, limit);
}

async function getScrapedSearchResults(query, excludedResults, limit = TARGET_RESULT_COUNT) {
    const needed = Math.max(limit - excludedResults.length, 0);
    if (!needed) return { results: [], unavailableStores: [] };

    const [flipkartResult, amazonResult] = await Promise.allSettled([
        scrapeFlipkart(query),
        scrapeAmazon(query)
    ]);

    const scrapedItems = [
        ...(flipkartResult.status === "fulfilled" ? flipkartResult.value : []),
        ...(amazonResult.status === "fulfilled" ? amazonResult.value : [])
    ];

    const unavailableStores = [
        ...(flipkartResult.status === "rejected" ? ["Flipkart"] : []),
        ...(amazonResult.status === "rejected" ? ["Amazon"] : [])
    ];

    const seedKeys = new Set(excludedResults.map((item) => canonicalProductKey(item.name)).filter(Boolean));
    const scrapedAt = new Date();

    const formatted = scrapedItems.map((item) => ({
        name: item.name,
        price: item.price,
        store: item.store || null,
        link: item.link || null,
        scrapedAt
    }));

    const filtered = await filterRelevantItems(query, formatted);

    return {
        unavailableStores,
        results: dedupeResults(filtered.accepted, seedKeys).map(toGenericSearchResult).slice(0, needed)
    };
}

async function searchProducts(query, options = {}) {
    const limit = Number.isInteger(options.limit) && options.limit > 0
        ? options.limit
        : TARGET_RESULT_COUNT;

    const databaseResults = await getDatabaseSearchResults(query, limit);

    if (databaseResults.length >= limit) {
        return {
            source: "database",
            query,
            total: databaseResults.length,
            bestDeal: databaseResults[0] || null,
            results: databaseResults
        };
    }

    const scrapedResponse = await getScrapedSearchResults(query, databaseResults, limit);
    const combinedResults = dedupeResults([...databaseResults, ...scrapedResponse.results]).slice(0, limit);

    return {
        source:
            databaseResults.length && scrapedResponse.results.length
                ? "hybrid"
                : databaseResults.length
                    ? "database"
                    : "scraper",
        query,
        total: combinedResults.length,
        bestDeal: combinedResults[0] || null,
        unavailableStores: scrapedResponse.unavailableStores,
        results: combinedResults
    };
}

module.exports = {
    searchProducts,
    canonicalProductKey,
    TARGET_RESULT_COUNT
};
