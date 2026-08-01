document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("convertToMp4");
  const status = document.getElementById("mp4Status");

  if (!button || !status) {
    console.error("MP4 elements not found");
    return;
  }

  button.onclick = async () => {

    try {

      status.textContent =
        "STEP 1 - Loading local FFmpeg...";

      const { FFmpeg } =
        await import("/ffmpeg/index.js");

      status.textContent =
        "STEP 2 - Creating FFmpeg...";

      const ffmpeg = new FFmpeg();

      status.textContent =
        "STEP 3 - Loading local FFmpeg core...";

      await ffmpeg.load({
        coreURL:
          window.location.origin +
          "/ffmpeg/ffmpeg-core.js",

        wasmURL:
          window.location.origin +
          "/ffmpeg/ffmpeg-core.wasm"
      });

      status.textContent =
        "STEP 4 - FFMPEG LOADED ✅";

    } catch (error) {

      console.error(
        "FFMPEG ERROR:",
        error
      );

      status.textContent =
        "FFMPEG ERROR: " +
        (error?.message || String(error));

    }

  };

});
