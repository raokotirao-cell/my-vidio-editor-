const exportMp4 =
  document.getElementById("exportMp4");

const mp4Status =
  document.getElementById("mp4Status");

const downloadMp4 =
  document.getElementById("downloadMp4");

const videoInput =
  document.getElementById("videoInput");

const startTime =
  document.getElementById("startTime");

const endTime =
  document.getElementById("endTime");

let ffmpeg = null;
let ffmpegLoaded = false;


// ============================================
// LOAD FFMPEG
// ============================================

async function loadFFmpeg() {

  if (ffmpegLoaded) {
    return;
  }

  if (mp4Status) {
    mp4Status.textContent =
      "Loading MP4 converter...";
  }


  // Check FFmpeg library
  if (
    !window.FFmpegWASM ||
    !window.FFmpegWASM.FFmpeg
  ) {
    throw new Error(
      "FFmpeg library not loaded."
    );
  }


  ffmpeg =
    new window.FFmpegWASM.FFmpeg();


  // FFmpeg logs
  ffmpeg.on(
    "log",
    ({ message }) => {

      console.log(
        "FFmpeg:",
        message
      );

    }
  );


  // Load local core files
  await ffmpeg.load({

    coreURL:
      window.location.origin +
      "/ffmpeg/ffmpeg-core.js",

    wasmURL:
      window.location.origin +
      "/ffmpeg/ffmpeg-core.wasm",

    classWorkerURL:
      window.location.origin +
      "/ffmpeg/worker.js"

  });


  ffmpegLoaded = true;


  if (mp4Status) {
    mp4Status.textContent =
      "MP4 converter ready ✅";
  }

}


// ============================================
// CONVERT MP4
// ============================================

if (exportMp4) {

  exportMp4.addEventListener(
    "click",
    async () => {

      try {

        exportMp4.disabled = true;


        if (downloadMp4) {
          downloadMp4.style.display =
            "none";
        }


        // -------------------------------
        // LOAD FFMPEG
        // -------------------------------

        await loadFFmpeg();


        // -------------------------------
        // GET VIDEO
        // -------------------------------

        const file =
          videoInput.files[0];


        if (!file) {

          throw new Error(
            "Please select a video first."
          );

        }


        // -------------------------------
        // GET TIME
        // -------------------------------

        const start =
          Number(
            startTime.value
          );

        const end =
          Number(
            endTime.value
          );

        const duration =
          end - start;


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


        // -------------------------------
        // STATUS
        // -------------------------------

        if (mp4Status) {

          mp4Status.textContent =
            "Preparing video...";

        }


        // -------------------------------
        // INPUT FILE
        // -------------------------------

        const inputData =
          new Uint8Array(
            await file.arrayBuffer()
          );


        await ffmpeg.writeFile(
          "input.mp4",
          inputData
        );


        // -------------------------------
        // CONVERT
        // -------------------------------

        if (mp4Status) {

          mp4Status.textContent =
            "Converting to MP4...";

        }


        const exitCode =
          await ffmpeg.exec([

            "-ss",
            String(start),

            "-i",
            "input.mp4",

            "-t",
            String(duration),

            "-c:v",
            "libx264",

            "-preset",
            "veryfast",

            "-crf",
            "23",

            "-c:a",
            "aac",

            "-b:a",
            "128k",

            "-movflags",
            "+faststart",

            "output.mp4"

          ]);


        // -------------------------------
        // CHECK RESULT
        // -------------------------------

        if (exitCode !== 0) {

          throw new Error(
            "FFmpeg conversion failed. Exit code: " +
            exitCode
          );

        }


        // -------------------------------
        // READ OUTPUT
        // -------------------------------

        const output =
          await ffmpeg.readFile(
            "output.mp4"
          );


        // -------------------------------
        // CREATE BLOB
        // -------------------------------

        const blob =
          new Blob(
            [output.buffer],
            {
              type:
                "video/mp4"
            }
          );


        // -------------------------------
        // DOWNLOAD URL
        // -------------------------------

        const mp4URL =
          URL.createObjectURL(blob);


        // -------------------------------
        // DOWNLOAD LINK
        // -------------------------------

        if (downloadMp4) {

          downloadMp4.href =
            mp4URL;

          downloadMp4.download =
            "trimmed-video.mp4";

          downloadMp4.textContent =
            "Download MP4";

          downloadMp4.style.display =
            "inline-block";

        }


        // -------------------------------
        // SUCCESS
        // -------------------------------

        if (mp4Status) {

          mp4Status.textContent =
            "MP4 ready ✅";

        }


      } catch (error) {

        console.error(
          "MP4 error:",
          error
        );


        if (mp4Status) {

          mp4Status.textContent =
            "❌ MP4 failed: " +
            (
              error?.message ||
              String(error)
            );

        }


      } finally {

        exportMp4.disabled =
          false;

      }

    }
  );

}