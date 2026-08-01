window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("convertToMp4");

  if (!btn) {
    alert("Button NOT FOUND");
    return;
  }

  btn.style.display = "inline-block";

  btn.onclick = () => {
    alert("BUTTON CLICK WORKING");
  };
});
