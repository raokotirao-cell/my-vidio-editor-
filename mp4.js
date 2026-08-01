document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("convertToMp4");

  button.onclick = async () => {

    alert("STEP 1");

    try {

      const module = await import(
        "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"
      );

      alert("STEP 2 - MODULE LOADED");

      const ffmpeg = new module.FFmpeg();

      alert("STEP 3 - CONSTRUCTOR OK");

      alert("STEP 4 - LOADING FFMPEG...");

      await ffmpeg.load({
        coreURL:
          "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js"
      });

      alert("STEP 5 - FFMPEG LOADED ✅");

    } catch (error) {

      alert(
        "FFMPEG LOAD ERROR:\n\n" +
        error.message +
        "\n\n" +
        error.stack
      );

    }

  };

});
