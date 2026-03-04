const puppeteer = require("puppeteer-core");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrapeFlipkart(query) {
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: process.env.CHROME_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ["--no-sandbox"]
    });

    try {
        const page = await browser.newPage();
        const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;

        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Close login popup if present
        try {
            await page.waitForSelector("button._2KpZ6l._2doB4z", { timeout: 3000 });
            await page.click("button._2KpZ6l._2doB4z");
        } catch {}

        await page.waitForSelector("div[data-id]", { timeout: 15000 });
        await delay(2000);

        const products = await page.evaluate(() => {
            const results = [];
            const cards = document.querySelectorAll("div[data-id]");

            cards.forEach((card, index) => {
                if (index > 10) return;

                const name =
                    card.querySelector(".RG5Slk, a.wjcEIp, a.IRpwTa, .KzDlHZ, .s1Q9rs, .WKTcLC")?.textContent?.trim() ||
                    card.querySelector("a[title]")?.getAttribute("title")?.trim();

                const priceText =
                    card.querySelector(".hZ3P6w.DeU9vF, .Nx9bqj, ._30jeq3, .CEmiEU .Nx9bqj, div[class*='Nx9bqj']")?.textContent?.trim();

                const link = card.querySelector("a[href*='/p/'], a[href*='/item/'], a")?.href;

                if (name && priceText) {
                    const numericPrice = Number(priceText.replace(/[^\d]/g, ""));
                    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return;

                    results.push({
                        store: "Flipkart",
                        name,
                        price: numericPrice,
                        link
                    });
                }
            });

            return results;
        });

        return products;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeFlipkart;
