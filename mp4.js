  import { FFmpeg } from "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js";
import {
  fetchFile,
  toBlobURL
} from "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js";

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

async function loadFFmpeg() {

  if (ffmpegLoaded) {
    return;
  }

  mp4Status.textContent =
    "Loading MP4 converter...";

  ffmpeg =
    new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    console.log("FFmpeg:", message);
  });

  const baseURL =
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

  await ffmpeg.load({
  classWorkerURL:
  window.location.origin + "/ffmpeg/worker.js",
  coreURL:
    await toBlobURL(
      `${baseURL}/ffmpeg-core.js`,
      "text/javascript"
    ),

  wasmURL:
    await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    )
});
  ffmpegLoaded = true;

  mp4Status.textContent =
    "MP4 converter ready ✅";
}


if (exportMp4) {

  exportMp4.addEventListener(
    "click",
    async () => {

      try {

        exportMp4.disabled = true;

        downloadMp4.style.display =
          "none";

        await loadFFmpeg();


        const file =
          videoInput.files[0];

        if (!file) {
          throw new Error(
            "Please select a video first."
          );
        }


        const start =
          Number(startTime.value);

        const end =
          Number(endTime.value);

        const duration =
          end - start;


        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          duration <= 0
        ) {
          throw new Error(
            "Please enter valid Start and End times."
          );
        }


        mp4Status.textContent =
          "Preparing video...";


        await ffmpeg.writeFile(
          "input",
          await fetchFile(file)
        );


        mp4Status.textContent =
          "Converting to MP4...";


        const exitCode = await ffmpeg.exec([
          "-ss",
          String(start),

          "-i",
          "input",

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


        const data =
          await ffmpeg.readFile(
            "output.mp4"
          );


        const blob =
          new Blob(
            [data.buffer],
            {
              type: "video/mp4"
            }
          );


        const url =
          URL.createObjectURL(blob);


        downloadMp4.href =
          url;

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
          error.message;

      } finally {

        exportMp4.disabled = false;

      }

    }
  );

}