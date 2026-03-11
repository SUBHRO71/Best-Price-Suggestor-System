const puppeteer = require("puppeteer-core");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeFlipkartLink(href) {
    if (!href) return null;
    if (href.startsWith("http")) return href.split("?")[0];
    if (href.startsWith("/")) return `https://www.flipkart.com${href.split("?")[0]}`;
    return null;
}

async function scrapeFlipkart(query) {
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: process.env.CHROME_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ["--no-sandbox"]
    });

    try {
        const page = await browser.newPage();
        const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;

        await page.setViewport({ width: 1440, height: 1200 });
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        );
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-IN,en;q=0.9"
        });

        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

        // Close login popup if present
        try {
            const closeSelectors = [
                "button._2KpZ6l._2doB4z",
                "button._2doB4z",
                "button[aria-label='Close']",
                "span._30XB9F"
            ];

            for (const selector of closeSelectors) {
                const closeButton = await page.$(selector);
                if (closeButton) {
                    await closeButton.click();
                    break;
                }
            }
        } catch {}

        await page.waitForFunction(
            () =>
                document.querySelectorAll("div[data-id]").length > 0 ||
                document.querySelectorAll("a[href*='/p/']").length > 0 ||
                document.querySelectorAll("a[href*='/item/']").length > 0,
            { timeout: 20000 }
        );
        await delay(2000);

        const products = await page.evaluate(() => {
            const nameSelectors = [
                ".KzDlHZ",
                ".s1Q9rs",
                ".WKTcLC",
                ".wjcEIp",
                ".RG5Slk",
                "a[title]",
                "img[alt]"
            ];
            const priceSelectors = [
                ".Nx9bqj",
                "._30jeq3",
                ".CEmiEU .Nx9bqj",
                "div[class*='Nx9bqj']",
                "div[data-testid='price-final']"
            ];
            const linkSelectors = [
                "a[href*='/p/']",
                "a[href*='/item/']",
                "a.CGtC98",
                "a[href]"
            ];
            const normalizeText = (value) => value?.replace(/\s+/g, " ").trim() || "";
            const normalizeLink = (href) => {
                if (!href) return null;
                if (href.startsWith("http")) return href.split("?")[0];
                if (href.startsWith("/")) return `https://www.flipkart.com${href.split("?")[0]}`;
                return null;
            };
            const getFirstValue = (root, selectors, getter) => {
                for (const selector of selectors) {
                    const el = root.querySelector(selector);
                    const value = getter(el);
                    if (value) return value;
                }
                return "";
            };

            const results = [];
            const seen = new Set();
            const cards = Array.from(
                document.querySelectorAll("div[data-id], div._75nlfW, div.slAVV4, div.tUxRFH, div.cPHDOP")
            );

            cards.forEach((card, index) => {
                if (results.length >= 12 || index > 30) return;

                const name = normalizeText(
                    getFirstValue(card, nameSelectors, (el) =>
                        el?.getAttribute("title") || el?.getAttribute("alt") || el?.textContent
                    )
                );
                const priceText = normalizeText(getFirstValue(card, priceSelectors, (el) => el?.textContent));
                const href = getFirstValue(card, linkSelectors, (el) => el?.getAttribute("href"));
                const link = normalizeLink(href);

                if (!name || !priceText || !link) return;

                const numericPrice = Number(priceText.replace(/[^\d]/g, ""));
                if (!Number.isFinite(numericPrice) || numericPrice <= 0) return;

                const dedupeKey = `${name.toLowerCase()}|${numericPrice}|${link}`;
                if (seen.has(dedupeKey)) return;
                seen.add(dedupeKey);

                results.push({
                    store: "Flipkart",
                    name,
                    price: numericPrice,
                    link
                });
            });

            if (results.length) {
                return results;
            }

            const fallbackAnchors = Array.from(document.querySelectorAll("a[href*='/p/'], a[href*='/item/']"));
            fallbackAnchors.forEach((anchor, index) => {
                if (results.length >= 12 || index > 40) return;

                const container = anchor.closest("div");
                const name = normalizeText(anchor.getAttribute("title") || anchor.textContent || container?.querySelector("img")?.getAttribute("alt"));
                const priceText = normalizeText(container?.textContent?.match(/₹\s?[\d,]+/)?.[0] || "");
                const link = normalizeLink(anchor.getAttribute("href"));

                if (!name || !priceText || !link) return;

                const numericPrice = Number(priceText.replace(/[^\d]/g, ""));
                if (!Number.isFinite(numericPrice) || numericPrice <= 0) return;

                const dedupeKey = `${name.toLowerCase()}|${numericPrice}|${link}`;
                if (seen.has(dedupeKey)) return;
                seen.add(dedupeKey);

                results.push({
                    store: "Flipkart",
                    name,
                    price: numericPrice,
                    link
                });
            });

            return results;
        });

        return products
            .filter((item) => item.name && item.price && item.link)
            .map((item) => ({
                ...item,
                link: normalizeFlipkartLink(item.link)
            }))
            .filter((item) => item.link);
    } finally {
        await browser.close();
    }
}

module.exports = scrapeFlipkart;
