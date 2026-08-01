document.addEventListener("DOMContentLoaded", () => {

  const button =
    document.getElementById("convertToMp4");

  if (!button) {
    alert("BUTTON NOT FOUND");
    return;
  }

  button.addEventListener("click", () => {
    alert("MP4.JS CLICK WORKING");
  });

});
