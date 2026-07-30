const videoInput = document.getElementById("videoInput");
const videoPreview = document.getElementById("videoPreview");
const addVideo = document.getElementById("addVideo");

addVideo.addEventListener("click", () => {
  videoInput.click();
});

videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];

  if (!file) return;

  const videoURL = URL.createObjectURL(file);

  videoPreview.src = videoURL;
  videoPreview.style.display = "block";
});