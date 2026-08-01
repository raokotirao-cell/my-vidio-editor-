document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("convertToMp4");

  if (!button) {
    alert("BUTTON NOT FOUND");
    return;
  }

  button.onclick = async () => {

    alert("START FFmpeg TEST");

    try {

      const module = await import("./ffmpeg/index.js");

      alert("FFmpeg INDEX LOADED");

      const FFmpeg = module.FFmpeg;

      if (!FFmpeg) {
        throw new Error("FFmpeg class not found");
      }

      alert("FFmpeg CLASS FOUND");

      const ffmpeg = new FFmpeg();

      alert("FFmpeg CONSTRUCTOR OK");

    } catch (error) {

      alert(
        "FFmpeg ERROR\n\n" +
        error.message +
        "\n\n" +
        error.stack
      );

    }

  };

});
