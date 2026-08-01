// ======================================
// MP4 EXPERIMENT
// ======================================
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.10";
import { fetchFile } from "https://esm.sh/@ffmpeg/util@0.12.1";

const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;
(() => {

const convertButton =
document.getElementById("convertToMp4");

const status =
document.getElementById("mp4Status");

const download =
document.getElementById("downloadMp4");

if (!convertButton) return;
  convertButton.style.display = "inline-block";

// Show button when a WebM is ready
const observer = new MutationObserver(() => {

  const webm =
    document.getElementById("downloadVideo");

  if (
    webm &&
    webm.style.display !== "none"
  ) {
    convertButton.style.display =
      "inline-block";
  }

});

observer.observe(document.body,{
  childList:true,
  subtree:true,
  attributes:true
});

convertButton.addEventListener(
"click",
async()=>{

try {

  if (!ffmpegLoaded) {

    status.textContent = "Loading FFmpeg...";

    await ffmpeg.load({
      coreURL: "/ffmpeg/ffmpeg-core.js",
      wasmURL: "/ffmpeg/ffmpeg-core.wasm"
    });

    ffmpegLoaded = true;
  }

  status.textContent = "✅ FFmpeg loaded successfully";

} catch (error) {

  console.error(error);

  status.textContent =
    "❌ FFmpeg load failed: " + error.message;

}
download.style.display="none";

});

})();
