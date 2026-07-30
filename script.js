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

  if (!file) {
    return;
  }

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

  videoPreview.addEventListener(
    "timeupdate",
    stopPreview
  );
});


// ===============================
// EXPORT BUTTON
// ===============================

exportTrim.addEventListener("click", () => {

  exportStatus.textContent =
    "MP4 export is temporarily disabled.";

});