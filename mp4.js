document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("convertToMp4");
  const status = document.getElementById("mp4Status");

  button.onclick = async () => {

    try {

      status.textContent =
        "STEP 1 - Loading FFmpeg module...";

      const { FFmpeg } = await import(
        "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"
      );

      const { toBlobURL } = await import(
        "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js"
      );

      status.textContent =
        "STEP 2 - Creating FFmpeg...";

      const ffmpeg = new FFmpeg();

      status.textContent =
        "STEP 3 - Preparing FFmpeg core...";

      const baseURL =
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      );

      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      );

      status.textContent =
        "STEP 4 - Loading FFmpeg...";

      await ffmpeg.load({
        coreURL,
        wasmURL
      });

      status.textContent =
        "STEP 5 - FFMPEG LOADED ✅";

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
