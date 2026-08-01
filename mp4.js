document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("convertToMp4");

  if (!button) {
    alert("NEW MP4 JS LOADED - BUTTON NOT FOUND");
    return;
  }

  alert("NEW MP4 JS LOADED");

  button.onclick = () => {
    alert("NEW MP4 BUTTON CLICKED");
  };

});
