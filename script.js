const videoInput = document.getElementById("videoInput");
const videoPreview = document.getElementById("videoPreview");
const addVideo = document.getElementById("addVideo");

const trimControls = document.getElementById("trimControls");
const startTime = document.getElementById("startTime");
const endTime = document.getElementById("endTime");
const previewTrim = document.getElementById("previewTrim");

addVideo.addEventListener("click", () => {
  videoInput.click();
});

videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];

  if (!file) return;

  const videoURL = URL.createObjectURL(file);

  videoPreview.src = videoURL;
  videoPreview.style.display = "block";
  trimControls.style.display = "block";
});

videoPreview.addEventListener("loadedmetadata", () => {
  endTime.value = videoPreview.duration.toFixed(1);
  endTime.max = videoPreview.duration;
  startTime.max = videoPreview.duration;
});

previewTrim.addEventListener("click", () => {
  const start = Number(startTime.value);
  const end = Number(endTime.value);

  if (start < 0 || end <= start || end > videoPreview.duration) {
    alert("Please enter a valid start and end time.");
    return;
  }

  videoPreview.currentTime = start;
  videoPreview.play();

  const stopTrim = () => {
    if (videoPreview.currentTime >= end) {
      videoPreview.pause();
      videoPreview.removeEventListener("timeupdate", stopTrim);
    }
  };

  videoPreview.addEventListener("timeupdate", stopTrim);
});