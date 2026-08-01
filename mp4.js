document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("convertToMp4");

  button.onclick = async () => {

    alert("STEP 1");

    try {
      const module = await import(
        "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"
      );

      alert("STEP 2 - FFMPEG MODULE LOADED");

      const ffmpeg = new module.FFmpeg();

      alert("STEP 3 - CONSTRUCTOR OK");

    } catch (error) {

      alert(
        "ERROR:\n\n" +
        error.message +
        "\n\n" +
        error.stack
      );

    }

  };

});
