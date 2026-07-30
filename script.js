const videoInput = document.getElementById("videoInput");
const videoPreview = document.getElementById("videoPreview");
const addVideo = document.getElementById("addVideo");

const trimControls = document.getElementById("trimControls");
const startTime = document.getElementById("startTime");
const endTime = document.getElementById("endTime");

const previewTrim = document.getElementById("previewTrim");
const exportTrim = document.getElementById("exportTrim");
const exportStatus = document.getElementById("exportStatus");
const downloadVideo = document.getElementById("downloadVideo");

let videoURL = null;
let downloadURL = null;

// Select Video
addVideo.addEventListener("click", () => {
  videoInput.click();
});

// Load video
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];

  if (!file) return;

  if (videoURL) {
    URL.revokeObjectURL(videoURL);
  }

  if (downloadURL) {
    URL.revokeObjectURL(downloadURL);
    downloadURL = null;
  }

  downloadVideo.style.display = "none";
  downloadVideo.removeAttribute("href");
  exportStatus.textContent = "";

  videoURL = URL.createObjectURL(file);

  videoPreview.src = videoURL;
  videoPreview.style.display = "block";
  trimControls.style.display = "block";
});

// Metadata loaded
videoPreview.addEventListener("loadedmetadata", () => {
  const duration = videoPreview.duration;

  startTime.value = "0";
  endTime.value = duration.toFixed(1);

  startTime.max = duration;
  endTime.max = duration;
});

// Preview trim
previewTrim.addEventListener("click", async () => {
  const start = Number(startTime.value);
  const end = Number(endTime.value);

  if (
    start < 0 ||
    end <= start ||
    end > videoPreview.duration
  ) {
    alert("Please enter a valid start and end time.");
    return;
  }

  videoPreview.pause();
  videoPreview.currentTime = start;

  await videoPreview.play();

  const stopPreview = () => {
    if (videoPreview.currentTime >= end) {
      videoPreview.pause();

      videoPreview.removeEventListener(
        "timeupdate",
        stopPreview
      );
    }
  };

  videoPreview.addEventListener(
    "timeupdate",
    stopPreview
  );
});

// EXPORT
exportTrim.addEventListener("click", async () => {
  const start = Number(startTime.value);
  const end = Number(endTime.value);

  if (!videoPreview.src) {
    alert("Please select a video first.");
    return;
  }

  if (
    start < 0 ||
    end <= start ||
    end > videoPreview.duration
  ) {
    alert("Please enter a valid start and end time.");
    return;
  }

  try {
    exportTrim.disabled = true;
    previewTrim.disabled = true;

    downloadVideo.style.display = "none";
    exportStatus.textContent = "Preparing export...";

    const canvas = document.createElement("canvas");

    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;

    const ctx = canvas.getContext("2d");

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    const audioContext = new AudioContext();

    const source =
      audioContext.createMediaElementSource(
        videoPreview
      );

    const destination =
      audioContext.createMediaStreamDestination();

    source.connect(destination);

    const videoStream =
      canvas.captureStream(30);

    const combinedStream =
      new MediaStream();

    videoStream.getVideoTracks().forEach(track => {
      combinedStream.addTrack(track);
    });

    destination.stream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track);
    });

    let mimeType = "";

    const formats = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        mimeType = format;
        break;
      }
    }

    if (!mimeType) {
      throw new Error("WebM recording is not supported.");
    }

    const recorder = new MediaRecorder(
      combinedStream,
      {
        mimeType: mimeType
      }
    );

    const chunks = [];

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const finished = new Promise(resolve => {
      recorder.onstop = resolve;
    });

    videoPreview.pause();

    await new Promise(resolve => {
      const ready = () => {
        videoPreview.removeEventListener(
          "seeked",
          ready
        );

        resolve();
      };

      videoPreview.addEventListener(
        "seeked",
        ready
      );

      videoPreview.currentTime = start;
    });

    recorder.start(200);

    await audioContext.resume();

    await videoPreview.play();

    exportStatus.textContent =
      "Exporting video + audio...";

    let drawing = true;

    const drawFrame = () => {
      if (!drawing) return;

      ctx.drawImage(
        videoPreview,
        0,
        0,
        canvas.width,
        canvas.height
      );

      requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const stopExport = () => {
      if (videoPreview.currentTime >= end) {
        drawing = false;

        videoPreview.pause();

        videoPreview.removeEventListener(
          "timeupdate",
          stopExport
        );

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }
    };

    videoPreview.addEventListener(
      "timeupdate",
      stopExport
    );

    const durationMs =
      ((end - start) + 2) * 1000;

    setTimeout(() => {
      drawing = false;

      videoPreview.pause();

      videoPreview.removeEventListener(
        "timeupdate",
        stopExport
      );

      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }, durationMs);

    await finished;

    const blob = new Blob(
      chunks,
      {
        type: "video/webm"
      }
    );

    downloadURL =
      URL.createObjectURL(blob);

    downloadVideo.href =
      downloadURL;

    downloadVideo.download =
      "trimmed-video.webm";

    downloadVideo.textContent =
      "Download Trimmed Video";

    downloadVideo.style.display =
      "inline-block";

    exportStatus.textContent =
      "Trimmed video + audio ready ✅";

    combinedStream.getTracks().forEach(track => {
      track.stop();
    });

    videoStream.getTracks().forEach(track => {
      track.stop();
    });

    audioContext.close();

  } catch (error) {

    console.error(
      "Export error:",
      error
    );

    exportStatus.textContent =
      "Export failed: " +
      error.message;

  } finally {

    exportTrim.disabled = false;
    previewTrim.disabled = false;
  }
});
// ============================================
// MUSIC EXPORT - ISOLATED CODE
// ============================================

(() => {

  let selectedMusic = null;
  let musicURL = null;
  let musicDownloadURL = null;

  const musicControls =
    document.getElementById("musicControls");

  const audioInput =
    document.getElementById("audioInput");

  const addMusic =
    document.getElementById("addMusic");

  const musicStatus =
    document.getElementById("musicStatus");

  const musicVolume =
    document.getElementById("musicVolume");

  const musicVolumeValue =
    document.getElementById("musicVolumeValue");

  const exportMusic =
    document.getElementById("exportMusic");

  const downloadMusic =
    document.getElementById("downloadMusic");


  // Show music section
  if (musicControls) {
    musicControls.style.display = "block";
  }


  // Select music
  if (addMusic && audioInput) {

    addMusic.addEventListener("click", () => {
      audioInput.click();
    });

  }


  // Music selected
  if (audioInput) {

    audioInput.addEventListener("change", () => {

      const file = audioInput.files[0];

      if (!file) return;

      selectedMusic = file;

      if (musicURL) {
        URL.revokeObjectURL(musicURL);
      }

      musicURL =
        URL.createObjectURL(file);

      if (musicStatus) {
        musicStatus.textContent =
          "Music selected: " + file.name;
      }

    });

  }


  // Volume
  if (musicVolume) {

    musicVolume.addEventListener("input", () => {

      const value =
        Math.round(
          Number(musicVolume.value) * 100
        );

      if (musicVolumeValue) {
        musicVolumeValue.textContent =
          value + "%";
      }

    });

  }


  // Export music
  if (exportMusic) {

    exportMusic.addEventListener(
      "click",
      async () => {

        if (!videoURL) {
          alert("Please select a video first.");
          return;
        }

        if (!selectedMusic) {
          alert("Please select music first.");
          return;
        }


        const start =
          Number(startTime.value);

        const end =
          Number(endTime.value);


        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          end <= start
        ) {
          alert("Please enter valid Start and End times.");
          return;
        }


        let exportVideo = null;
        let musicAudio = null;
        let audioContext = null;
        let combinedStream = null;
        let videoStream = null;

        try {

          exportMusic.disabled = true;
          exportTrim.disabled = true;
          previewTrim.disabled = true;

          if (downloadMusic) {
            downloadMusic.style.display = "none";
          }

          if (musicStatus) {
            musicStatus.textContent =
              "Preparing export...";
          }

          exportStatus.textContent =
            "Preparing video with music...";


          // --------------------------------
          // SEPARATE VIDEO
          // --------------------------------

          exportVideo =
            document.createElement("video");

          exportVideo.src = videoURL;
          exportVideo.preload = "auto";
          exportVideo.playsInline = true;


          await new Promise((resolve, reject) => {

            exportVideo.onloadedmetadata = resolve;

            exportVideo.onerror = () => {
              reject(
                new Error("Could not load video.")
              );
            };

          });


          if (end > exportVideo.duration) {
            throw new Error(
              "End time exceeds video duration."
            );
          }


          // --------------------------------
          // CANVAS
          // --------------------------------

          const canvas =
            document.createElement("canvas");

          canvas.width =
            exportVideo.videoWidth;

          canvas.height =
            exportVideo.videoHeight;

          const ctx =
            canvas.getContext("2d");


          // --------------------------------
          // AUDIO
          // --------------------------------

          const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

          audioContext =
            new AudioContext();


          const destination =
            audioContext.createMediaStreamDestination();


          // Original video audio
          const videoSource =
            audioContext.createMediaElementSource(
              exportVideo
            );

          const videoGain =
            audioContext.createGain();

          videoGain.gain.value = 1;

          videoSource.connect(videoGain);
          videoGain.connect(destination);


          // Music audio
          musicAudio =
            document.createElement("audio");

          musicAudio.src = musicURL;
          musicAudio.loop = true;
          musicAudio.preload = "auto";


          await new Promise((resolve, reject) => {

            musicAudio.oncanplay = resolve;

            musicAudio.onerror = () => {
              reject(
                new Error("Could not load music.")
              );
            };

            musicAudio.load();

          });


          const musicSource =
            audioContext.createMediaElementSource(
              musicAudio
            );

          const musicGain =
            audioContext.createGain();

          musicGain.gain.value =
            Number(
              musicVolume
                ? musicVolume.value
                : 0.5
            );

          musicSource.connect(musicGain);
          musicGain.connect(destination);


          // --------------------------------
          // STREAM
          // --------------------------------

          videoStream =
            canvas.captureStream(30);

          combinedStream =
            new MediaStream();


          videoStream
            .getVideoTracks()
            .forEach(track => {
              combinedStream.addTrack(track);
            });


          destination
            .stream
            .getAudioTracks()
            .forEach(track => {
              combinedStream.addTrack(track);
            });


          // --------------------------------
          // RECORDER
          // --------------------------------

          let mimeType = "";

          const formats = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm"
          ];


          for (const format of formats) {

            if (
              MediaRecorder.isTypeSupported(format)
            ) {

              mimeType = format;
              break;

            }

          }


          if (!mimeType) {
            throw new Error(
              "WebM recording is not supported."
            );
          }


          const recorder =
            new MediaRecorder(
              combinedStream,
              {
                mimeType: mimeType
              }
            );


          const chunks = [];


          recorder.ondataavailable = event => {

            if (
              event.data &&
              event.data.size > 0
            ) {
              chunks.push(event.data);
            }

          };


          const finished =
            new Promise(resolve => {

              recorder.onstop = resolve;

            });


          // --------------------------------
          // SEEK START
          // --------------------------------

          await new Promise(resolve => {

            if (
              Math.abs(
                exportVideo.currentTime - start
              ) < 0.05
            ) {
              resolve();
              return;
            }


            const onSeeked = () => {

              exportVideo.removeEventListener(
                "seeked",
                onSeeked
              );

              resolve();

            };


            exportVideo.addEventListener(
              "seeked",
              onSeeked
            );

            exportVideo.currentTime = start;

          });


          // --------------------------------
          // START
          // --------------------------------

          await audioContext.resume();

          recorder.start(250);

          await exportVideo.play();
          await musicAudio.play();


          exportStatus.textContent =
            "Exporting video with music...";


          if (musicStatus) {
            musicStatus.textContent =
              "Exporting...";
          }


          // --------------------------------
          // DRAW
          // --------------------------------

          let drawing = true;

          const drawFrame = () => {

            if (!drawing) return;

            ctx.drawImage(
              exportVideo,
              0,
              0,
              canvas.width,
              canvas.height
            );

            requestAnimationFrame(
              drawFrame
            );

          };


          drawFrame();


          // --------------------------------
          // STOP EXACTLY AT END
          // --------------------------------

          const stopExport = () => {

            if (
              exportVideo.currentTime >= end
            ) {

              drawing = false;

              exportVideo.pause();
              musicAudio.pause();


              exportVideo.removeEventListener(
                "timeupdate",
                stopExport
              );


              if (
                recorder.state !== "inactive"
              ) {
                recorder.stop();
              }

            }

          };


          exportVideo.addEventListener(
            "timeupdate",
            stopExport
          );


          // Start checking
          stopExport();


          await finished;


          // --------------------------------
          // OUTPUT
          // --------------------------------

          const blob =
            new Blob(
              chunks,
              {
                type: "video/webm"
              }
            );


          if (musicDownloadURL) {
            URL.revokeObjectURL(
              musicDownloadURL
            );
          }


          musicDownloadURL =
            URL.createObjectURL(blob);


          if (downloadMusic) {

            downloadMusic.href =
              musicDownloadURL;

            downloadMusic.download =
              "video-with-music.webm";

            downloadMusic.textContent =
              "Download Video With Music";

            downloadMusic.style.display =
              "inline-block";

          }


          const outputDuration =
            end - start;


          exportStatus.textContent =
            "✅ Video with music ready (" +
            outputDuration.toFixed(1) +
            " sec)";


          if (musicStatus) {
            musicStatus.textContent =
              "Music export completed ✅";
          }


        } catch (error) {

          console.error(
            "Music export error:",
            error
          );


          exportStatus.textContent =
            "❌ Music export failed: " +
            error.message;


          if (musicStatus) {
            musicStatus.textContent =
              "Music export failed.";
          }


        } finally {

          if (exportVideo) {
            exportVideo.pause();
          }

          if (musicAudio) {
            musicAudio.pause();
          }

          if (combinedStream) {
            combinedStream
              .getTracks()
              .forEach(track => {
                track.stop();
              });
          }

          if (videoStream) {
            videoStream
              .getTracks()
              .forEach(track => {
                track.stop();
              });
          }

          if (audioContext) {
            try {
              await audioContext.close();
            } catch (e) {
              console.log(e);
            }
          }

          exportMusic.disabled = false;
          exportTrim.disabled = false;
          previewTrim.disabled = false;

        }

      }
    );

  }

})();