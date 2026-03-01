import axios from "axios";
import { XMLParser } from "fast-xml-parser";

/* =========================
   CONFIG — EDIT THESE
========================= */

const JACKETT_URL = "";
const JACKETT_API_KEY = "";

const PROWLARR_URL = "";
const PROWLARR_API_KEY = "";

/* ========================= */

async function getJackettIndexers() {
    const url =
        `${JACKETT_URL}/api/v2.0/indexers/all/results/torznab/api` +
        `?apikey=${JACKETT_API_KEY}&t=indexers`;

    const res = await axios.get(url);

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
    });

    const parsed = parser.parse(res.data);
    const indexers = parsed?.indexers?.indexer;

    if (!indexers) return [];

    return Array.isArray(indexers) ? indexers : [indexers];
}

async function getProwlarrIndexers() {
    const res = await axios.get(`${PROWLARR_URL}/api/v1/indexer`, {
        headers: { "X-Api-Key": PROWLARR_API_KEY },
    });

    return res.data;
}

async function addToProwlarr(indexer: any) {
    const torznabUrl =
        `${JACKETT_URL}/api/v2.0/indexers/${indexer.id}/results/torznab/`;

    const payload = {
        enable: true,
        name: `J - ${indexer.title}`,
        implementation: "Torznab",
        implementationName: "Torznab",
        configContract: "TorznabSettings",
        priority: 25,
        appProfileId: 1,
        fields: [
            { name: "baseUrl", value: torznabUrl },
            { name: "apiKey", value: JACKETT_API_KEY },
        ],
        tags: [],
    };

    await axios.post(`${PROWLARR_URL}/api/v1/indexer`, payload, {
        headers: { "X-Api-Key": PROWLARR_API_KEY },
    });

    console.log(`✅ Added ${indexer.title}`);
}

async function main() {
    console.log("Fetching Jackett indexers...");
    const jackettIndexers = await getJackettIndexers();

    console.log("Fetching Prowlarr indexers...");
    const existing = await getProwlarrIndexers();

    const existingNames = new Set(
        existing.map((i: any) => i.name.toLowerCase())
    );

    for (const idx of jackettIndexers) {
        const name = `j - ${idx.title}`.toLowerCase();

        if (idx.configured == "false") {
            continue;
        }
        if (existingNames.has(name)) {
            console.log(`⏭ Skipping ${idx.title}`);
            continue;
        }

        try {
            await addToProwlarr(idx);
        } catch (err: any) {
            console.error(`❌ Failed ${idx.title}`);
            if (err.response) console.error(err.response.data);
        }
    }

    console.log("Done.");
}

main().catch(err => {
    console.error("Fatal error:", err.message);
    process.exit(1);
});