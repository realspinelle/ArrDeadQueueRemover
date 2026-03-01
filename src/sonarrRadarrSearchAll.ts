import axios from "axios";

/* ============================
   CONFIG (EDIT THESE 4 VARS)
============================ */

const RADARR_URL = "";
const RADARR_API_KEY = "";

const SONARR_URL = "";
const SONARR_API_KEY = "";

/* ============================
   RADARR LOGIC
============================ */

async function handleRadarr() {
  console.log("Checking Radarr movies...");

  const movies = await axios.get(`${RADARR_URL}/api/v3/movie`, {
    headers: { "X-Api-Key": RADARR_API_KEY },
  });

  const queue = await axios.get(`${RADARR_URL}/api/v3/queue`, {
    headers: { "X-Api-Key": RADARR_API_KEY },
  });

  const downloadingMovieIds = new Set(
    queue.data.records
      .filter((q: any) => q.movieId)
      .map((q: any) => q.movieId)
  );

  for (const movie of movies.data) {
    const isDownloaded = movie.hasFile;
    const isDownloading = downloadingMovieIds.has(movie.id);

    if (!isDownloaded && !isDownloading) {
      console.log(`Searching for movie: ${movie.title}`);

      await axios.post(
        `${RADARR_URL}/api/v3/command`,
        {
          name: "MoviesSearch",
          movieIds: [movie.id],
        },
        { headers: { "X-Api-Key": RADARR_API_KEY } }
      );
    }
  }
}

/* ============================
   SONARR LOGIC
============================ */

async function handleSonarr() {
  console.log("Checking Sonarr series...");

  const series = await axios.get(`${SONARR_URL}/api/v3/series`, {
    headers: { "X-Api-Key": SONARR_API_KEY },
  });

  const queue = await axios.get(`${SONARR_URL}/api/v3/queue`, {
    headers: { "X-Api-Key": SONARR_API_KEY },
  });

  const downloadingSeriesIds = new Set(
    queue.data.records
      .filter((q: any) => q.seriesId)
      .map((q: any) => q.seriesId)
  );

  for (const show of series.data) {
    const isDownloading = downloadingSeriesIds.has(show.id);

    if (isDownloading) continue;

    const episodes = await axios.get(
      `${SONARR_URL}/api/v3/episode?seriesId=${show.id}`,
      { headers: { "X-Api-Key": SONARR_API_KEY } }
    );

    const missingEpisodes = episodes.data.filter(
      (ep: any) => !ep.hasFile && ep.monitored
    );

    if (missingEpisodes.length > 0) {
      console.log(`Searching missing episodes for: ${show.title}`);

      await axios.post(
        `${SONARR_URL}/api/v3/command`,
        {
          name: "SeriesSearch",
          seriesId: show.id,
        },
        { headers: { "X-Api-Key": SONARR_API_KEY } }
      );
    }
  }
}

/* ============================
   RUN
============================ */

async function main() {
  try {
    await handleRadarr();
    await handleSonarr();
    console.log("Done.");
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();