const axios = require("axios");
const cheerio = require("cheerio");

function parsePrice(priceText) {
    if (!priceText) return null;
    const value = Number(String(priceText).replace(/[^\d]/g, ""));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function cleanAmazonLink(href, asin) {
    if (href && href.startsWith("http")) {
        return href.split("?")[0];
    }

    if (href && href.startsWith("/")) {
        return `https://www.amazon.in${href.split("?")[0]}`;
    }

    if (asin) {
        return `https://www.amazon.in/dp/${asin}`;
    }

    return null;
}

async function scrapeAmazon(query) {
    const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;

    const { data } = await axios.get(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept-Language": "en-IN,en;q=0.9"
        },
        timeout: 20000
    });

    const $ = cheerio.load(data);
    const products = [];

    $("[data-component-type='s-search-result']").each((index, el) => {
        if (index >= 10) return false;

        const asin = $(el).attr("data-asin")?.trim();
        const name = $(el).find("h2 span").first().text().trim();
        const whole = $(el).find(".a-price-whole").first().text().trim();
        const fraction = $(el).find(".a-price-fraction").first().text().trim();

        const href =
            $(el).find("h2 a").attr("href") ||
            $(el).find("a.a-link-normal.s-no-outline").attr("href") ||
            $(el).find("a.a-link-normal[href*='/dp/']").attr("href");

        const priceText = fraction ? `${whole}${fraction}` : whole;
        const price = parsePrice(priceText);

        // Skip noisy cards like brand chips/headers.
        if (!name || name.length < 8 || !price) return;

        const link = cleanAmazonLink(href, asin);

        products.push({
            store: "Amazon",
            name,
            price,
            link
        });
    });

    return products;
}

module.exports = scrapeAmazon;
