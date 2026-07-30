const videoInput = document.getElementById("videoInput");
const videoPreview = document.getElementById("videoPreview");
const addVideo = document.getElementById("addVideo");

const trimControls = document.getElementById("trimControls");
const startTime = document.getElementById("startTime");
const endTime = document.getElementById("endTime");

const previewTrim = document.getElementById("previewTrim");
const exportTrim = document.getElementById("exportTrim");

const exportStatus = document.getElementById("exportStatus");
const downloadVideo = document.getElementById("downloadVideo");

let selectedVideo = null;
let trimmedVideoURL = null;
let ffmpeg = null;
let ffmpegLoaded = false;

// ------------------------------------
// Select Video
// ------------------------------------

addVideo.addEventListener("click", () => {
  videoInput.click();
});

videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];

  if (!file) {
    return;
  }

  selectedVideo = file;

  const videoURL = URL.createObjectURL(file);

  videoPreview.src = videoURL;
  videoPreview.style.display = "block";

  trimControls.style.display = "block";

  startTime.value = "0";

  videoPreview.addEventListener(
    "loadedmetadata",
    () => {
      endTime.value = videoPreview.duration.toFixed(1);
    },
    { once: true }
  );

  exportStatus.textContent = "";
  downloadVideo.style.display = "none";
});

// ------------------------------------
// Load FFmpeg
// ------------------------------------

async function loadFFmpeg() {
  if (ffmpegLoaded) {
    return;
  }

  exportStatus.textContent = "Loading FFmpeg...";

  const module = await import("./ffmpeg/index.js");

  const FFmpeg = module.FFmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    console.log("FFmpeg:", message);
  });

  // FFmpeg core files from official CDN
  const baseURL =
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

  await ffmpeg.load({
    classWorkerURL: "./ffmpeg/worker.js",
    coreURL: await createBlobURL(
      `${baseURL}/ffmpeg-core.js`,
      "text/javascript"
    ),
    wasmURL: await createBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    )
  });

  ffmpegLoaded = true;

  exportStatus.textContent = "FFmpeg loaded.";
}

// ------------------------------------
// Create Blob URL
// ------------------------------------

async function createBlobURL(url, mimeType) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load FFmpeg file: ${response.status}`
    );
  }

  const blob = await response.blob();

  return URL.createObjectURL(
    new Blob([blob], {
      type: mimeType
    })
  );
}

// ------------------------------------
// Validate Trim Times
// ------------------------------------

function getTrimTimes() {
  const start = Number(startTime.value);
  const end = Number(endTime.value);

  if (!selectedVideo) {
    throw new Error("Please select a video first.");
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Enter valid start and end times.");
  }

  if (start < 0) {
    throw new Error("Start time cannot be negative.");
  }

  if (end <= start) {
    throw new Error("End time must be greater than start time.");
  }

  if (videoPreview.duration && end > videoPreview.duration) {
    throw new Error(
      `End time cannot be greater than ${videoPreview.duration.toFixed(
        1
      )} seconds.`
    );
  }

  return {
    start,
    end,
    duration: end - start
  };
}

// ------------------------------------
// Export Trimmed Video
// ------------------------------------

async function makeTrimmedVideo() {
  await loadFFmpeg();

  const times = getTrimTimes();

  exportStatus.textContent = "Preparing video...";

  const inputData = new Uint8Array(
    await selectedVideo.arrayBuffer()
  );

  await ffmpeg.writeFile("input.mp4", inputData);

  exportStatus.textContent = "Trimming video...";

  await ffmpeg.exec([
    "-ss",
    String(times.start),
    "-i",
    "input.mp4",
    "-t",
    String(times.duration),
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    "output.mp4"
  ]);

  exportStatus.textContent = "Reading trimmed video...";

  const data = await ffmpeg.readFile("output.mp4");

  const blob = new Blob(
    [data.buffer],
    {
      type: "video/mp4"
    }
  );

  if (trimmedVideoURL) {
    URL.revokeObjectURL(trimmedVideoURL);
  }

  trimmedVideoURL = URL.createObjectURL(blob);

  return trimmedVideoURL;
}

// ------------------------------------
// Preview Trim
// ------------------------------------

previewTrim.addEventListener("click", async () => {
  try {
    previewTrim.disabled = true;

    const url = await makeTrimmedVideo();

    videoPreview.src = url;
    videoPreview.style.display = "block";

    videoPreview.controls = true;

    exportStatus.textContent =
      "Trim preview ready.";

    videoPreview.currentTime = 0;

    await videoPreview.play().catch(() => {});
  } catch (error) {
    console.error(error);

    exportStatus.textContent =
      "Error: " + error.message;
  } finally {
    previewTrim.disabled = false;
  }
});

// ------------------------------------
// Export Trim
// ------------------------------------

exportTrim.addEventListener("click", async () => {
  try {
    exportTrim.disabled = true;

    const url = await makeTrimmedVideo();

    downloadVideo.href = url;
    downloadVideo.download = "trimmed-video.mp4";

    downloadVideo.style.display = "inline-block";

    exportStatus.textContent =
      "Trim completed. Download your video.";

  } catch (error) {
    console.error(error);

    exportStatus.textContent =
      "Error: " + error.message;
  } finally {
    exportTrim.disabled = false;
  }
});
 