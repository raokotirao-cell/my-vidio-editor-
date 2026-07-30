const videoInput = document.getElementById("videoInput");
const addVideo = document.getElementById("addVideo");
const videoPreview = document.getElementById("videoPreview");

const trimControls = document.getElementById("trimControls");
const startTime = document.getElementById("startTime");
const endTime = document.getElementById("endTime");

const previewTrim = document.getElementById("previewTrim");
const exportTrim = document.getElementById("exportTrim");

const exportStatus = document.getElementById("exportStatus");
const downloadVideo = document.getElementById("downloadVideo");

let selectedVideo = null;
let originalVideoURL = null;
let trimmedVideoURL = null;

let ffmpeg = null;
let ffmpegReady = false;


// ============================================
// SELECT VIDEO
// ============================================

addVideo.addEventListener("click", () => {
  videoInput.click();
});


// ============================================
// VIDEO SELECTED
// ============================================

videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];

  if (!file) {
    return;
  }

  selectedVideo = file;

  if (originalVideoURL) {
    URL.revokeObjectURL(originalVideoURL);
  }

  originalVideoURL = URL.createObjectURL(file);

  videoPreview.src = originalVideoURL;
  videoPreview.style.display = "block";
  videoPreview.controls = true;

  trimControls.style.display = "block";

  startTime.value = "0";

  videoPreview.onloadedmetadata = () => {
    const duration = videoPreview.duration;

    endTime.value = duration.toFixed(1);

    startTime.max = duration;
    endTime.max = duration;

    exportStatus.textContent =
      `Video loaded: ${duration.toFixed(1)} seconds`;

    downloadVideo.style.display = "none";
  };
});


// ============================================
// CREATE BLOB URL
// ============================================

async function createBlobURL(url, mimeType) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download FFmpeg file: ${response.status}`
    );
  }

  const blob = await response.blob();

  return URL.createObjectURL(
    new Blob([blob], {
      type: mimeType
    })
  );
}


// ============================================
// LOAD FFMPEG
// ============================================

async function loadFFmpeg() {
  if (ffmpegReady) {
    return;
  }

  exportStatus.textContent =
    "Loading video engine... Please wait.";

  try {
    const module = await import("./ffmpeg/index.js");

    ffmpeg = new module.FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      console.log("FFmpeg:", message);
    });

    ffmpeg.on("progress", ({ progress }) => {
      const percent = Math.round(progress * 100);

      exportStatus.textContent =
        `Exporting video... ${percent}%`;
    });

    const baseURL =
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

    const coreURL = await createBlobURL(
      `${baseURL}/ffmpeg-core.js`,
      "text/javascript"
    );

    const wasmURL = await createBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    );

    await ffmpeg.load({
      classWorkerURL: "./ffmpeg/worker.js",
      coreURL: coreURL,
      wasmURL: wasmURL
    });

    ffmpegReady = true;

    exportStatus.textContent =
      "✅ Video engine ready.";

  } catch (error) {
    console.error(
      "FFmpeg loading error:",
      error
    );

    exportStatus.textContent =
      "❌ FFmpeg LOAD ERROR: " +
      (error.message || error);

    throw error;
  }
}


// ============================================
// GET TRIM TIMES
// ============================================

function getTrimTimes() {
  if (!selectedVideo) {
    throw new Error(
      "Please select a video first."
    );
  }

  const start = Number(startTime.value);
  const end = Number(endTime.value);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    throw new Error(
      "Please enter valid start and end times."
    );
  }

  if (start < 0) {
    throw new Error(
      "Start time cannot be negative."
    );
  }

  if (end <= start) {
    throw new Error(
      "End time must be greater than start time."
    );
  }

  if (
    videoPreview.duration &&
    end > videoPreview.duration
  ) {
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


// ============================================
// CREATE TRIMMED VIDEO
// ============================================

async function makeTrimmedVideo() {
  await loadFFmpeg();

  const times = getTrimTimes();

  exportStatus.textContent =
    "Preparing video...";

  const inputData =
    new Uint8Array(
      await selectedVideo.arrayBuffer()
    );

  await ffmpeg.writeFile(
    "input.mp4",
    inputData
  );

  exportStatus.textContent =
    "Trimming video...";

  await ffmpeg.exec([
    "-ss",
    String(times.start),

    "-i",
    "input.mp4",

    "-t",
    String(times.duration),

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "23",

    "-c:a",
    "aac",

    "-movflags",
    "+faststart",

    "output.mp4"
  ]);

  exportStatus.textContent =
    "Preparing output...";

  const data =
    await ffmpeg.readFile(
      "output.mp4"
    );

  const blob =
    new Blob(
      [data.buffer],
      {
        type: "video/mp4"
      }
    );

  if (trimmedVideoURL) {
    URL.revokeObjectURL(
      trimmedVideoURL
    );
  }

  trimmedVideoURL =
    URL.createObjectURL(blob);

  return trimmedVideoURL;
}


// ============================================
// PREVIEW TRIM
// ============================================

previewTrim.addEventListener(
  "click",
  async () => {
    try {
      if (!selectedVideo) {
        alert(
          "Please select a video first."
        );
        return;
      }

      const times = getTrimTimes();

      previewTrim.disabled = true;
      exportTrim.disabled = true;

      exportStatus.textContent =
        "Creating trim preview...";

      const url =
        await makeTrimmedVideo();

      videoPreview.src = url;
      videoPreview.load();

      videoPreview.style.display =
        "block";

      videoPreview.controls = true;

      exportStatus.textContent =
        `✅ Preview ready: ${times.start}s → ${times.end}s`;

      videoPreview.currentTime = 0;

    } catch (error) {
      console.error(
        "Preview error:",
        error
      );

      exportStatus.textContent =
        "❌ ERROR: " +
        (error.message || error);

    } finally {
      previewTrim.disabled = false;
      exportTrim.disabled = false;
    }
  }
);


// ============================================
// EXPORT TRIMMED VIDEO
// ============================================

exportTrim.addEventListener(
  "click",
  async () => {
    try {
      if (!selectedVideo) {
        alert(
          "Please select a video first."
        );
        return;
      }

      getTrimTimes();

      exportTrim.disabled = true;
      previewTrim.disabled = true;

      downloadVideo.style.display =
        "none";

      const url =
        await makeTrimmedVideo();

      downloadVideo.href = url;

      downloadVideo.download =
        "trimmed-video.mp4";

      downloadVideo.style.display =
        "inline-block";

      exportStatus.textContent =
        "✅ Trim completed. Download your video.";

    } catch (error) {
      console.error(
        "Export error:",
        error
      );

      exportStatus.textContent =
        "❌ ERROR: " +
        (error.message || error);

    } finally {
      exportTrim.disabled = false;
      previewTrim.disabled = false;
    }
  }
);