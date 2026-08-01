document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("convertToMp4");
  const status = document.getElementById("mp4Status");

  console.log("MP4.JS LOADED");

  if (!button) {
    alert("CONVERT BUTTON NOT FOUND");
    return;
  }

  button.style.display = "inline-block";

  button.onclick = () => {
    status.textContent = "MP4.JS CLICK WORKING ✅";
    alert("MP4.JS CLICK WORKING");
  };

});
