 import { FFmpeg } from "./ffmpeg/index.js";

const ffmpeg = new FFmpeg();

let ffmpegLoaded = false;

const exportMp4 =
  document.getElementById("exportMp4");

const mp4Status =
  document.getElementById("mp4Status");

const downloadMp4 =
  document.getElementById("downloadMp4");

async function loadFFmpeg() {

  if (ffmpegLoaded) {
    return;
  }

  if (mp4Status) {
    mp4Status.textContent =
      "Loading MP4 converter...";
  }

  await ffmpeg.load({
    coreURL: "./ffmpeg/ffmpeg-core.js",
    wasmURL: "./ffmpeg/ffmpeg-core.wasm"
  });

  ffmpegLoaded = true;

  if (mp4Status) {
    mp4Status.textContent =
      "MP4 converter ready ✅";
  }
}


if (exportMp4) {

  exportMp4.addEventListener(
    "click",
    async () => {

      try {

        exportMp4.disabled = true;

        await loadFFmpeg();


        // --------------------------------
        // GET VIDEO
        // --------------------------------

        let videoBlob;

        let inputName;


        // Prefer trimmed WebM if available
        if (
          downloadVideo &&
          downloadVideo.style.display !== "none" &&
          downloadVideo.href
        ) {

          const response =
            await fetch(downloadVideo.href);

          videoBlob =
            await response.blob();

          inputName =
            "input.webm";

        } else {

          const file =
            videoInput.files[0];

          if (!file) {
            throw new Error(
              "Please select a video first."
            );
          }

          videoBlob = file;

          const extension =
            file.name.includes(".")
              ? file.name
                  .split(".")
                  .pop()
                  .toLowerCase()
              : "mp4";

          inputName =
            "input." + extension;

        }


        // --------------------------------
        // WRITE INPUT
        // --------------------------------

        const inputData =
          new Uint8Array(
            await videoBlob.arrayBuffer()
          );


        await ffmpeg.writeFile(
          inputName,
          inputData
        );


        if (mp4Status) {
          mp4Status.textContent =
            "Converting to MP4...";
        }


        // --------------------------------
        // TRIM TIME
        // --------------------------------

        const start =
          Number(
            document.getElementById(
              "startTime"
            ).value
          );

        const end =
          Number(
            document.getElementById(
              "endTime"
            ).value
          );

        const duration =
          end - start;


        // --------------------------------
        // CONVERT
        // --------------------------------

        await ffmpeg.exec([
          "-ss",
          String(start),

          "-i",
          inputName,

          "-t",
          String(duration),

          "-c:v",
          "libx264",

          "-c:a",
          "aac",

          "-movflags",
          "+faststart",

          "output.mp4"
        ]);


        // --------------------------------
        // READ OUTPUT
        // --------------------------------

        const output =
          await ffmpeg.readFile(
            "output.mp4"
          );


        const mp4Blob =
          new Blob(
            [output.buffer],
            {
              type: "video/mp4"
            }
          );


        const mp4URL =
          URL.createObjectURL(
            mp4Blob
          );


        // --------------------------------
        // DOWNLOAD
        // --------------------------------

        downloadMp4.href =
          mp4URL;

        downloadMp4.download =
          "trimmed-video.mp4";

        downloadMp4.textContent =
          "Download MP4";

        downloadMp4.style.display =
          "inline-block";


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
            "❌ MP4 conversion failed: " +
            error.message;
        }

      } finally {

        exportMp4.disabled = false;

      }

    }
  );

}