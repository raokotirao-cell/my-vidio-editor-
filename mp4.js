document.addEventListener("DOMContentLoaded", () => {

  const button =
    document.getElementById("convertToMp4");

  if (!button) {
    alert("BUTTON NOT FOUND");
    return;
  }

  button.addEventListener("click", async () => {

    alert("MP4 BUTTON CLICKED");

    try {

      const { FFmpeg } =
        await import("./ffmpeg/index.js");

      alert("FFMPEG MODULE LOADED");

      const ffmpeg = new FFmpeg();

      alert("FFMPEG CONSTRUCTOR OK");

    } catch (error) {

      alert(
        "FFMPEG ERROR:\n\n" +
        (error.message || String(error))
      );

    }

  });

});
