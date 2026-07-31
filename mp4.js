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
      downloadMp4.style.display = "none";

      const file = videoInput.files[0];

      if (!file) {
        throw new Error("Please select a video first.");
      }

      const start = Number(startTime.value);
      const end = Number(endTime.value);
      const duration = end - start;

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start
      ) {
        throw new Error("Please enter valid Start and End times.");
      }

      mp4Status.textContent =
        "Uploading video to Cloudinary...";

      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "upload_preset",
        "my_video_upload"
      );

      const uploadResponse = await fetch(
        "https://api.cloudinary.com/v1_1/kdcgiald/video/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const uploadData =
        await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.error?.message ||
          "Cloudinary upload failed."
        );
      }

      const publicId =
        uploadData.public_id;

      const version =
        uploadData.version;

      mp4Status.textContent =
        "Creating MP4...";


      // Cloudinary video transformation
      const transformation =
        `so_${start},du_${duration}`;


      const mp4Url =
        `https://res.cloudinary.com/kdcgiald/video/upload/` +
        `${transformation}/f_mp4/${publicId}.mp4`;


      // Give Cloudinary a moment to generate
      await new Promise(resolve =>
        setTimeout(resolve, 1500)
      );


      downloadMp4.href =
        mp4Url;

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