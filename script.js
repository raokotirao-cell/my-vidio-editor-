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

let videoURL = null;
let downloadURL = null;

// Select Video
addVideo.addEventListener("click", () => {
  videoInput.click();
});

// Load Video
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];

  if (!file) return;

  // Remove old video URL
  if (videoURL) {
    URL.revokeObjectURL(videoURL);
  }

  // Remove old download
  if (downloadURL) {
    URL.revokeObjectURL(downloadURL);
    downloadURL = null;
  }

  downloadVideo.style.display = "none";
  downloadVideo.removeAttribute("href");
  exportStatus.textContent = "";

  videoURL = URL.createObjectURL(file);

  videoPreview.src = videoURL;
  videoPreview.style.display = "block";
  trimControls.style.display = "block";
});

// Video loaded
videoPreview.addEventListener("loadedmetadata", () => {
  const duration = videoPreview.duration;

  startTime.value = "0";
  endTime.value = duration.toFixed(1);

  startTime.max = duration;
  endTime.max = duration;
});

// Preview Trim
previewTrim.addEventListener("click", async () => {
  const start = Number(startTime.value);
  const end = Number(endTime.value);

  if (
    start < 0 ||
    end <= start ||
    end > videoPreview.duration
  ) {
    alert("Please enter a valid start and end time.");
    return;
  }

  videoPreview.pause();
  videoPreview.currentTime = start;

  try {
    await videoPreview.play();
  } catch (error) {
    console.log("Preview play error:", error);
  }

  const stopTrim = () => {
    if (videoPreview.currentTime >= end) {
      videoPreview.pause();
      videoPreview.removeEventListener("timeupdate", stopTrim);
    }
  };

  videoPreview.addEventListener("timeupdate", stopTrim);
});

// Export Trimmed Video
exportTrim.addEventListener("click", async () => {
  const start = Number(startTime.value);
  const end = Number(endTime.value);

  if (!videoPreview.src) {
    alert("Please select a video first.");
    return;
  }

  if (
    start < 0 ||
    end <= start ||
    end > videoPreview.duration
  ) {
    alert("Please enter a valid start and end time.");
    return;
  }

  if (!videoPreview.captureStream) {
    alert("Your browser does not support video export.");
    return;
  }

  if (!window.MediaRecorder) {
    alert("Your browser does not support video recording.");
    return;
  }

  try {
    exportTrim.disabled = true;
    previewTrim.disabled = true;

    downloadVideo.style.display = "none";
    exportStatus.textContent = "Exporting trimmed video...";

    // Move video to start point
    videoPreview.pause();
    videoPreview.currentTime = start;

    await new Promise((resolve) => {
      const checkTime = () => {
        if (Math.abs(videoPreview.currentTime - start) < 0.15) {
          videoPreview.removeEventListener("timeupdate", checkTime);
          resolve();
        }
      };

      videoPreview.addEventListener("timeupdate", checkTime);

      setTimeout(() => {
        videoPreview.removeEventListener("timeupdate", checkTime);
        resolve();
      }, 1000);
    });

    // Capture video stream
    const stream = videoPreview.captureStream();

    // Check supported format
    let mimeType = "";

    const formats = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        mimeType = format;
        break;
      }
    }

    if (!mimeType) {
      throw new Error("WebM format is not supported.");
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType
    });

    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const recordingFinished = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    // Start recording
    recorder.start();

    videoPreview.currentTime = start;

    await videoPreview.play();

    const stopExport = () => {
      if (videoPreview.currentTime >= end) {
        videoPreview.pause();
        videoPreview.removeEventListener("timeupdate", stopExport);

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }
    };

    videoPreview.addEventListener("timeupdate", stopExport);

    // Wait for recorder
    await recordingFinished;

    // Create final file
    const blob = new Blob(chunks, {
      type: "video/webm"
    });

    downloadURL = URL.createObjectURL(blob);

    // Download link
    downloadVideo.href = downloadURL;
    downloadVideo.download = "trimmed-video.webm";
    downloadVideo.textContent = "Download Trimmed Video";
    downloadVideo.style.display = "inline-block";

    exportStatus.textContent = "Trimmed video ready ✅";

  } catch (error) {
    console.error("Export error:", error);
    exportStatus.textContent =
      "Export failed: " + error.message;
  } finally {
    exportTrim.disabled = false;
    previewTrim.disabled = false;
  }
});