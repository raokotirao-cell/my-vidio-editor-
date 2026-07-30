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
let exportedVideoURL = null;

let ffmpeg = null;
let fetchFile = null;
let toBlobURL = null;
let ffmpegReady = false;


// ===============================
// SELECT VIDEO BUTTON
// ===============================
addVideo.addEventListener("click", () => {
  videoInput.click();
});


// ===============================
// VIDEO SELECTED
// ===============================
videoInput.addEventListener("change", () => {

  const file = videoInput.files[0];

  if (!file) {
    return;
  }

  selectedVideo = file;

  // Remove old URL
  if (originalVideoURL) {
    URL.revokeObjectURL(originalVideoURL);
  }

  originalVideoURL = URL.createObjectURL(file);

  videoPreview.src = originalVideoURL;
  videoPreview.style.display = "block";

  videoPreview.onloadedmetadata = () => {

    const duration = videoPreview.duration;

    startTime.value = "0";
    endTime.value = duration.toFixed(1);

    startTime.max = duration;
    endTime.max = duration;

    trimControls.style.display = "block";

    exportStatus.textContent =
      `Video loaded (${duration.toFixed(1)} seconds)`;

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

  if (isNaN(start) || isNaN(end)) {
    alert("Please enter valid times.");
    return;
  }

  if (start < 0 || end <= start) {
    alert("Please enter valid Start and End times.");
    return;
  }

  if (end > videoPreview.duration) {
    alert("End time is longer than the video.");
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

    // Load FFmpeg package
    const ffmpegModule = await import(
      "https://esm.sh/@ffmpeg/ffmpeg@0.12.10"
    );

    // Load FFmpeg utility functions
    const utilModule = await import(
      "https://esm.sh/@ffmpeg/util@0.12.2"
    );

    const FFmpeg = ffmpegModule.FFmpeg;

    fetchFile = utilModule.fetchFile;
    toBlobURL = utilModule.toBlobURL;

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

    // Official FFmpeg core CDN
    const baseURL =
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      ),

      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      )
    });

    ffmpegReady = true;

    console.log("FFmpeg loaded successfully.");

  } catch (error) {

    console.error("FFmpeg loading error:", error);

    exportStatus.textContent =
      "❌ Video engine failed to load.";

    throw error;
  }
}


// ===============================
// EXPORT TRIMMED MP4
// ===============================
exportTrim.addEventListener("click", async () => {

  if (!selectedVideo) {
    alert("Please select a video first.");
    return;
  }

  const start = parseFloat(startTime.value);
  const end = parseFloat(endTime.value);

  if (isNaN(start) || isNaN(end)) {
    alert("Please enter valid times.");
    return;
  }

  if (start < 0) {
    alert("Start time cannot be negative.");
    return;
  }

  if (end <= start) {
    alert("End time must be greater than Start time.");
    return;
  }

  if (end > videoPreview.duration) {
    alert("End time is longer than the video.");
    return;
  }

  try {

    exportTrim.disabled = true;
    previewTrim.disabled = true;

    downloadVideo.style.display = "none";

    await loadFFmpeg();

    exportStatus.textContent =
      "Preparing video...";

    const inputName = "input.mp4";
    const outputName = "trimmed.mp4";

    // Put selected video into FFmpeg memory
    await ffmpeg.writeFile(
      inputName,
      await fetchFile(selectedVideo)
    );

    const duration = end - start;

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

    // Read exported MP4
    const data =
      await ffmpeg.readFile(outputName);

    const blob = new Blob(
      [data.buffer],
      {
        type: "video/mp4"
      }
    );

    // Remove previous exported URL
    if (exportedVideoURL) {
      URL.revokeObjectURL(exportedVideoURL);
    }

    exportedVideoURL =
      URL.createObjectURL(blob);

    // Show trimmed video
    videoPreview.src =
      exportedVideoURL;

    videoPreview.load();

    // Download link
    downloadVideo.href =
      exportedVideoURL;

    downloadVideo.download =
      "trimmed-video.mp4";

    downloadVideo.style.display =
      "inline-block";

    exportStatus.textContent =
      "✅ MP4 export completed!";

       } catch (error) {

    console.error("Export error:", error);

    exportStatus.textContent =
      "❌ ERROR: " + (error.message || error);

    alert(
      "Export failed:\n\n" +
      (error.message || error)
    );

  }

});