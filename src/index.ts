import axios from "axios";
const STALL_MINUTES = 30;

export type MediaQueueItem = {
    // =========================
    // IDENTIFIERS
    // =========================

    seriesId?: number;        // 📺 episode only
    episodeId?: number;       // 📺 episode only
    seasonNumber?: number;    // 📺 episode only

    movieId?: number;         // 🎬 movie only

    id: number;               // ✅ both


    // =========================
    // LANGUAGE & QUALITY
    // =========================

    languages: {              // ✅ both
        id: number;
        name: string;
    }[];

    quality: {                // ✅ both
        quality: {
            id: number;
            name: string;
            source: string;
            resolution: number;
            modifier?: string;    // 🎬 movie example only
        };
        revision: {
            version: number;
            real: number;
            isRepack: boolean;
        };
    };


    // =========================
    // CUSTOM FORMATS
    // =========================

    customFormats: {          // ✅ both
        id: number;
        name: string;
    }[];

    customFormatScore: number; // ✅ both


    // =========================
    // FILE INFO
    // =========================

    size: number;             // ✅ both
    sizeleft: number;         // ✅ both
    timeleft?: string;        // 📺 episode only (present in example)

    title: string;            // ✅ both


    // =========================
    // TIMESTAMPS
    // =========================

    added: string;            // ✅ both
    estimatedCompletionTime?: string; // 📺 episode only


    // =========================
    // STATUS
    // =========================

    status: string;               // ✅ both
    trackedDownloadStatus: string; // ✅ both
    trackedDownloadState: string;  // ✅ both
    statusMessages: unknown[];     // ✅ both
    errorMessage?: string;         // 🎬 movie only (in example)


    // =========================
    // DOWNLOAD CLIENT
    // =========================

    downloadId: string;                    // ✅ both
    protocol: string;                      // ✅ both
    downloadClient: string;                // ✅ both
    downloadClientHasPostImportCategory: boolean; // ✅ both
    indexer: string;                       // ✅ both


    // =========================
    // EPISODE SPECIFIC STATE
    // =========================

    episodeHasFile?: boolean; // 📺 episode only
};

// ---- CONFIG ----
const SONARR = {
    url: Bun.env.SONARR_URL!,
    apiKey: Bun.env.SONARR_API_KEY!,
};

const RADARR = {
    url: Bun.env.RADARR_URL!,
    apiKey: Bun.env.RADARR_API_KEY!,
};
// ----------------

function minutesSince(dateStr: string): number {
    const added = new Date(dateStr).getTime();
    return (Date.now() - added) / 1000 / 60;
}

var removedStalled: string[] = [];

async function processQueue(app: {
    url: string;
    apiKey: string;
}, name: string) {
    console.log(`[${name}] Checking ...`);
    const client = axios.create({
        baseURL: `${app.url}/api/v3`,
        headers: {
            "X-Api-Key": app.apiKey,
        },
    });

    const { data } = await client.get("/queue?pageSize=2000");
    
    console.log(`[${name}] Found ${data.records.length} in queue`);
    for (const item of data.records as MediaQueueItem[]) {
        const stalled = (item.status == "unknown" || item.status == "queued" || item.status == "paused") && minutesSince(item.added) >= STALL_MINUTES;

        if (stalled && !removedStalled.includes(item.title)) {
            removedStalled.push(item.title);
            
            console.log(`[${name}] Removing stalled: ${item.title} added ${minutesSince(item.added)} minutes ago`);

            await client.delete(`/queue/${item.id}`, {
                params: {
                    blocklist: true,
                },
            });
        }
    }
}

async function main() {
    console.log(`Ran at ${new Date()}`);
    if (SONARR.apiKey != null) {
        await processQueue(SONARR, "Sonarr");
    }
    if (RADARR.apiKey != null) {
        await processQueue(RADARR, "Radarr");
    }
    console.log("Cleanup complete.");
    removedStalled = [];
}
setInterval(() => {
    main().catch(console.error);
}, 15 * 60 * 1000);
main().catch(console.error);