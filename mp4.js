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

      const coreBase =
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

      const ffmpegBase =
        "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm";

      status.textContent =
        "STEP 3 - Preparing Worker...";

      /* =========================
         FFmpeg CLASS WORKER
      ========================== */

      const workerResponse =
        await fetch(`${ffmpegBase}/worker.js`);

      if (!workerResponse.ok) {
        throw new Error(
          "FFmpeg worker.js download failed: " +
          workerResponse.status
        );
      }

      let workerCode =
        await workerResponse.text();

      workerCode = workerCode
        .replaceAll(
          'from "./const.js"',
          `from "${ffmpegBase}/const.js"`
        )
        .replaceAll(
          'from "./errors.js"',
          `from "${ffmpegBase}/errors.js"`
        );

      const workerBlob =
        new Blob(
          [workerCode],
          { type: "text/javascript" }
        );

      const classWorkerURL =
        URL.createObjectURL(workerBlob);

      /* =========================
         FFMPEG CORE FILES
      ========================== */

      const coreURL = await toBlobURL(
        `${coreBase}/ffmpeg-core.js`,
        "text/javascript"
      );

      const wasmURL = await toBlobURL(
        `${coreBase}/ffmpeg-core.wasm`,
        "application/wasm"
      );

      const workerURL = await toBlobURL(
        `${coreBase}/ffmpeg-core.worker.js`,
        "text/javascript"
      );

      status.textContent =
        "STEP 4 - Loading FFmpeg...";

      await ffmpeg.load({
        classWorkerURL,
        coreURL,
        wasmURL,
        workerURL
      });

      status.textContent =
        "STEP 5 - FFMPEG LOADED ✅";

      URL.revokeObjectURL(classWorkerURL);

    } catch (error) {

      status.textContent =
        "FFMPEG ERROR: " +
        (error.message || String(error));

      console.error(
        "FFMPEG LOAD ERROR:",
        error
      );

    }

  };

});
