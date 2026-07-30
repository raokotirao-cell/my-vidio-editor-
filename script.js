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
let videoURL = null;

let ffmpeg = null;
let ffmpegReady = false;


// ===============================
// SELECT VIDEO
// ===============================

addVideo.addEventListener("click", () => {
  videoInput.click();
});


// ===============================
// VIDEO SELECTED
// ===============================

videoInput.addEventListener("change", () => {

  const file = videoInput.files[0];

  if (!file) return;

  selectedVideo = file;

  if (videoURL) {
    URL.revokeObjectURL(videoURL);
  }

  videoURL = URL.createObjectURL(file);

  videoPreview.src = videoURL;
  videoPreview.style.display = "block";

  videoPreview.onloadedmetadata = () => {

    const duration = videoPreview.duration;

    startTime.value = "0";
    endTime.value = duration.toFixed(1);

    startTime.max = duration;
    endTime.max = duration;

    trimControls.style.display = "block";

    exportStatus.textContent =
      `Video loaded: ${duration.toFixed(1)} seconds`;

    downloadVideo.style.display = "none";
  };
});


// ===============================
// PREVIEW TRIM
// ===============================

previewTrim.addEventListener("click", () => {

  if (!selectedVideo) {
    alert("Please select a video first.");
    return;
  }

  const start = parseFloat(startTime.value);
  const end = parseFloat(endTime.value);

  if (
    isNaN(start) ||
    isNaN(end) ||
    start < 0 ||
    end <= start ||
    end > videoPreview.duration
  ) {
    alert("Please enter valid Start and End times.");
    return;
  }

  videoPreview.currentTime = start;

  videoPreview.play();

  exportStatus.textContent =
    `Previewing ${start}s → ${end}s`;

  const stopPreview = () => {

    if (videoPreview.currentTime >= end) {

      videoPreview.pause();

      videoPreview.removeEventListener(
        "timeupdate",
        stopPreview
      );

      videoPreview.currentTime = start;

      exportStatus.textContent =
        "Preview finished.";
    }
  };

  videoPreview.removeEventListener(
    "timeupdate",
    stopPreview
  );

  videoPreview.addEventListener(
    "timeupdate",
    stopPreview
  );
});


// ===============================
// LOAD FFMPEG
// ===============================

async function loadFFmpeg() {

  if (ffmpegReady) {
    return;
  }

  exportStatus.textContent =
    "Loading video engine... Please wait.";

  try {

    // IMPORTANT:
    // Local FFmpeg package
    const module = await import("/ffmpeg/index.js");

const FFmpeg =
  module.FFmpeg ||
  module.default?.FFmpeg ||
  module.default;

if (typeof FFmpeg !== "function") {
  throw new Error("FFmpeg class was not found in /ffmpeg/index.js");
}
     
    ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      console.log("FFmpeg:", message);
    });

    ffmpeg.on("progress", ({ progress }) => {

      const percent =
        Math.round(progress * 100);

      exportStatus.textContent =
        `Exporting video... ${percent}%`;
    });

    await ffmpeg.load({

      coreURL:
        "/ffmpeg/ffmpeg-core.js",

      wasmURL:
        "/ffmpeg/ffmpeg-core.wasm"

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
      "❌ LOAD ERROR: " +
      (error.message || error);

    throw error;
  }
}


// ===============================
// EXPORT MP4
// ===============================

exportTrim.addEventListener("click", async () => {

  if (!selectedVideo) {
    alert("Please select a video first.");
    return;
  }

  const start = parseFloat(startTime.value);
  const end = parseFloat(endTime.value);

  if (
    isNaN(start) ||
    isNaN(end) ||
    start < 0 ||
    end <= start ||
    end > videoPreview.duration
  ) {
    alert("Please enter valid Start and End times.");
    return;
  }

  try {

    exportTrim.disabled = true;
    previewTrim.disabled = true;

    downloadVideo.style.display = "none";

    await loadFFmpeg();

    exportStatus.textContent =
      "Preparing video...";

    const inputName =
      "input.mp4";

    const outputName =
      "trimmed.mp4";

    // Convert selected file to Uint8Array
    const fileData =
      new Uint8Array(
        await selectedVideo.arrayBuffer()
      );

    await ffmpeg.writeFile(
      inputName,
      fileData
    );

    const duration =
      end - start;

    exportStatus.textContent =
      "Trimming video...";

    await ffmpeg.exec([

      "-ss",
      String(start),

      "-i",
      inputName,

      "-t",
      String(duration),

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

      outputName

    ]);

    const data =
      await ffmpeg.readFile(
        outputName
      );

    const blob =
      new Blob(
        [data.buffer],
        {
          type: "video/mp4"
        }
      );

    const outputURL =
      URL.createObjectURL(blob);

    videoPreview.src =
      outputURL;

    videoPreview.load();

    downloadVideo.href =
      outputURL;

    downloadVideo.download =
      "trimmed-video.mp4";

    downloadVideo.style.display =
      "inline-block";

    exportStatus.textContent =
      "✅ MP4 export completed!";

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
});