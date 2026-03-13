const axios = require("axios");

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const STOP_WORDS = new Set([
    "a", "an", "and", "the", "for", "with", "from", "to", "of", "in", "on", "by",
    "new", "latest", "best", "buy", "online", "sale", "offer", "free"
]);

const ACCESSORY_TOKENS = new Set([
    "case", "cover", "charger", "cable", "adapter", "protector", "tempered", "glass",
    "skin", "back", "bag", "pouch", "sleeve", "holder", "stand", "mount", "tripod",
    "strap", "band", "keyboard", "mouse", "earbuds", "headphones", "headset", "dock"
]);

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function tokenize(value) {
    return normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter(Boolean);
}

function buildContextTokens(query) {
    return Array.from(
        new Set(
            tokenize(query).filter((token) => {
                if (STOP_WORDS.has(token)) return false;
                return token.length > 1 || /^\d+$/.test(token);
            })
        )
    );
}

function generateQueryVariants(query) {
    const normalized = normalizeText(query);
    if (!normalized) return [];

    const tokens = normalized.split(" ");
    const compact = tokens.filter((token) => token.length > 2).slice(0, 6).join(" ");
    const broad = tokens.filter((token) => !STOP_WORDS.has(token)).slice(0, 4).join(" ");

    return Array.from(new Set([normalized, compact, broad].filter(Boolean)));
}

function scoreProductRelevance(query, item) {
    const normalizedQuery = normalizeText(query);
    const normalizedTitle = normalizeText(item?.name || "");
    const queryTokens = buildContextTokens(query);
    const titleTokens = new Set(tokenize(normalizedTitle));

    if (!normalizedQuery || !normalizedTitle || !queryTokens.length || !titleTokens.size) {
        return {
            passed: false,
            score: 0,
            matchedTokens: 0,
            exactMatch: false
        };
    }

    let score = 0;
    let matchedTokens = 0;

    for (const token of queryTokens) {
        if (!titleTokens.has(token)) continue;
        matchedTokens += 1;
        score += token.length >= 5 ? 3 : 2;
    }

    const exactMatch = normalizedTitle.includes(normalizedQuery);
    if (exactMatch) {
        score += 8;
    }

    for (const variant of generateQueryVariants(query).slice(1)) {
        if (variant && normalizedTitle.includes(variant)) {
            score += 4;
            break;
        }
    }

    const coverage = matchedTokens / queryTokens.length;
    score += Math.round(coverage * 4);

    const queryAccessoryTokens = queryTokens.filter((token) => ACCESSORY_TOKENS.has(token));
    const titleAccessoryTokens = Array.from(titleTokens).filter((token) => ACCESSORY_TOKENS.has(token));
    if (!queryAccessoryTokens.length && titleAccessoryTokens.length) {
        score -= 6;
    }

    const numericQueryTokens = queryTokens.filter((token) => /^\d+$/.test(token));
    const missingNumericTokens = numericQueryTokens.filter((token) => !titleTokens.has(token));
    if (numericQueryTokens.length && missingNumericTokens.length === numericQueryTokens.length) {
        score -= 4;
    }

    const minimumMatchedTokens = queryTokens.length === 1 ? 1 : Math.min(2, queryTokens.length);
    const minimumScore = queryTokens.length <= 2 ? 5 : 7;
    const passed = exactMatch || (matchedTokens >= minimumMatchedTokens && score >= minimumScore);

    return {
        passed,
        score,
        matchedTokens,
        exactMatch
    };
}

function extractJsonObject(value) {
    const text = String(value || "").trim();
    if (!text) return null;

    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
    const candidate = fencedMatch ? fencedMatch[1] : text;
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    const jsonText = objectMatch ? objectMatch[0] : candidate;

    try {
        return JSON.parse(jsonText);
    } catch {
        return null;
    }
}

function isGeminiEnabled() {
    return Boolean(process.env.GEMINI_API_KEY);
}

async function classifyWithGemini(query, items) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !items.length) return null;

    const prompt = [
        "You are validating e-commerce search results.",
        "Keep only products that directly match the user query.",
        "Reject accessories, spare parts, bundles, unrelated variants, or adjacent categories unless the query explicitly asks for them.",
        "Return strict JSON only in this shape: {\"keepIndexes\":[0,2],\"dropIndexes\":[1],\"notes\":\"short text\"}.",
        `User query: ${query}`,
        "Candidates:",
        ...items.map((item, index) => `${index}. ${item.name} | Rs ${item.price} | ${item.store || "Unknown"}`)
    ].join("\n");

    const response = await axios.post(
        `${GEMINI_API_URL}/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
        {
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0
            }
        },
        {
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            timeout: 12000
        }
    );

    const text = response.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("\n");
    const parsed = extractJsonObject(text);

    if (!parsed || !Array.isArray(parsed.keepIndexes)) {
        return null;
    }

    const keepIndexes = Array.from(
        new Set(
            parsed.keepIndexes
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value) && value >= 0 && value < items.length)
        )
    );

    return new Set(keepIndexes);
}

async function filterRelevantItems(query, items, options = {}) {
    const scored = items.map((item) => ({
        ...item,
        _relevance: scoreProductRelevance(query, item)
    }));

    const heuristicAccepted = scored.filter((item) => item._relevance.passed);
    const heuristicRejected = scored.filter((item) => !item._relevance.passed);

    const shouldUseGemini = options.useModel !== false && isGeminiEnabled();
    if (!shouldUseGemini || !heuristicAccepted.length) {
        return {
            accepted: heuristicAccepted.map(stripInternalFields),
            rejected: heuristicRejected.map(stripInternalFields),
            provider: "heuristic"
        };
    }

    try {
        const keepIndexes = await classifyWithGemini(query, heuristicAccepted);
        if (!keepIndexes) {
            return {
                accepted: heuristicAccepted.map(stripInternalFields),
                rejected: heuristicRejected.map(stripInternalFields),
                provider: "heuristic"
            };
        }

        const modelAccepted = [];
        const modelRejected = [...heuristicRejected];

        heuristicAccepted.forEach((item, index) => {
            if (keepIndexes.has(index)) {
                modelAccepted.push(item);
            } else {
                modelRejected.push(item);
            }
        });

        return {
            accepted: modelAccepted.map(stripInternalFields),
            rejected: modelRejected.map(stripInternalFields),
            provider: "gemini"
        };
    } catch {
        return {
            accepted: heuristicAccepted.map(stripInternalFields),
            rejected: heuristicRejected.map(stripInternalFields),
            provider: "heuristic"
        };
    }
}

function stripInternalFields(item) {
    const { _relevance, ...rest } = item;
    return rest;
}

module.exports = {
    normalizeText,
    tokenize,
    scoreProductRelevance,
    filterRelevantItems
};
