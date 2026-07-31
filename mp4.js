const exportMp4 = document.getElementById("exportMp4");
const mp4Status = document.getElementById("mp4Status");
const downloadMp4 = document.getElementById("downloadMp4");

const videoInput = document.getElementById("videoInput");
const startTime = document.getElementById("startTime");
const endTime = document.getElementById("endTime");

if (exportMp4) {
  exportMp4.addEventListener("click", async () => {

    try {

      exportMp4.disabled = true;

      if (downloadMp4) {
        downloadMp4.style.display = "none";
      }

      mp4Status.textContent =
        "Uploading video to Cloudinary...";

      const file = videoInput.files[0];

      if (!file) {
        throw new Error(
          "Please select a video first."
        );
      }

      const start = Number(startTime.value);
      const end = Number(endTime.value);

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start
      ) {
        throw new Error(
          "Please enter valid Start and End times."
        );
      }

      const formData = new FormData();

      formData.append("video", file);
      formData.append("start", String(start));
      formData.append("end", String(end));

      mp4Status.textContent =
        "Converting video to MP4...";

      const response = await fetch(
        "/api/convert-mp4",
        {
          method: "POST",
          body: formData
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "MP4 conversion failed."
        );
      }

      if (!data.url) {
        throw new Error(
          "MP4 URL was not returned."
        );
      }

      downloadMp4.href =
        data.url;

      downloadMp4.download =
        "trimmed-video.mp4";

      downloadMp4.textContent =
        "Download MP4";

      downloadMp4.style.display =
        "inline-block";

      mp4Status.textContent =
        "MP4 ready ✅";

    } catch (error) {

      console.error(
        "MP4 error:",
        error
      );

      mp4Status.textContent =
        "❌ MP4 failed: " +
        (error.message || String(error));

    } finally {

      exportMp4.disabled = false;

    }

  });
}
 