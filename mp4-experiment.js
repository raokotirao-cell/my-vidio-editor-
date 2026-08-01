// ======================================
// MP4 EXPERIMENT
// ======================================

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

status.textContent =
"🚧 MP4 conversion module is connected successfully.";

download.style.display="none";

});

})();
