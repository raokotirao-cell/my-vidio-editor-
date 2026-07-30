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


// ============================================
// MUSIC ELEMENTS
// ============================================

const musicControls = document.getElementById("musicControls");
const audioInput = document.getElementById("audioInput");
const addMusic = document.getElementById("addMusic");
const musicStatus = document.getElementById("musicStatus");
const musicVolume = document.getElementById("musicVolume");
const musicVolumeValue = document.getElementById("musicVolumeValue");
const exportMusic = document.getElementById("exportMusic");
const downloadMusic = document.getElementById("downloadMusic");


// ============================================
// VARIABLES
// ============================================

let videoURL = null;
let downloadURL = null;
let sharedAudioContext = null;
let sharedVideoSource = null;
function getVideoAudioSource() {
  if (!sharedAudioContext) {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    sharedAudioContext =
      new AudioContext();
  }

  if (!sharedVideoSource) {
    sharedVideoSource =
      sharedAudioContext.createMediaElementSource(
        videoPreview
      );
  }

  return {
    audioContext: sharedAudioContext,
    videoSource: sharedVideoSource
  };
}
let musicURL = null;
let selectedMusic = null;
let musicDownloadURL = null;


// ============================================
// SELECT VIDEO
// ============================================

addVideo.addEventListener("click", () => {
  videoInput.click();
});


// ============================================
// LOAD VIDEO
// ============================================

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

  if (musicDownloadURL) {
    URL.revokeObjectURL(musicDownloadURL);
    musicDownloadURL = null;
  }

  downloadVideo.style.display = "none";
  downloadVideo.removeAttribute("href");

  if (downloadMusic) {
    downloadMusic.style.display = "none";
    downloadMusic.removeAttribute("href");
  }

  exportStatus.textContent = "";

  videoURL = URL.createObjectURL(file);

  videoPreview.src = videoURL;
  videoPreview.style.display = "block";

  trimControls.style.display = "block";

  // Show music section
  if (musicControls) {
    musicControls.style.display = "block";
  }

  if (musicStatus) {
    musicStatus.textContent = "No music selected.";
  }
});


// ============================================
// VIDEO METADATA
// ============================================

videoPreview.addEventListener(
  "loadedmetadata",
  () => {
    const duration = videoPreview.duration;

    startTime.value = "0";
    endTime.value = duration.toFixed(1);

    startTime.max = duration;
    endTime.max = duration;
  }
);


// ============================================
// PREVIEW TRIM
// ============================================

previewTrim.addEventListener(
  "click",
  async () => {

    const start = Number(startTime.value);
    const end = Number(endTime.value);

    if (
      start < 0 ||
      end <= start ||
      end > videoPreview.duration
    ) {
      alert(
        "Please enter a valid start and end time."
      );
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
  }
);


// ============================================
// EXPORT TRIM
// ============================================

exportTrim.addEventListener(
  "click",
  async () => {

    const start = Number(startTime.value);
    const end = Number(endTime.value);

    if (!videoPreview.src) {
      alert(
        "Please select a video first."
      );
      return;
    }

    if (
      start < 0 ||
      end <= start ||
      end > videoPreview.duration
    ) {
      alert(
        "Please enter a valid start and end time."
      );
      return;
    }

    try {

      exportTrim.disabled = true;
      previewTrim.disabled = true;

      downloadVideo.style.display =
        "none";

      exportStatus.textContent =
        "Preparing export...";


      // --------------------------------
      // Canvas
      // --------------------------------

      const canvas =
        document.createElement("canvas");

      canvas.width =
        videoPreview.videoWidth;

      canvas.height =
        videoPreview.videoHeight;

      const ctx =
        canvas.getContext("2d");


      // --------------------------------
      // Audio Context
      // --------------------------------

      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      const audioContext =
        new AudioContext();

      const source =
  getVideoAudioSource().videoSource;

      const destination =
        audioContext.createMediaStreamDestination();

      source.connect(destination);


      // --------------------------------
      // Video Stream
      // --------------------------------

      const videoStream =
        canvas.captureStream(30);


      // --------------------------------
      // Combined Stream
      // --------------------------------

      const combinedStream =
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
      // Recorder
      // --------------------------------

      let mimeType = "";

      const formats = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
      ];

      for (const format of formats) {

        if (
          MediaRecorder.isTypeSupported(
            format
          )
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

      recorder.ondataavailable =
        event => {

          if (
            event.data &&
            event.data.size > 0
          ) {
            chunks.push(
              event.data
            );
          }
        };

      const finished =
        new Promise(resolve => {
          recorder.onstop = resolve;
        });


      // --------------------------------
      // Seek
      // --------------------------------

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

        videoPreview.currentTime =
          start;
      });


      // --------------------------------
      // Start
      // --------------------------------

      recorder.start(200);

      await audioContext.resume();

      await videoPreview.play();

      exportStatus.textContent =
        "Exporting video + audio...";


      // --------------------------------
      // Draw Frames
      // --------------------------------

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

        requestAnimationFrame(
          drawFrame
        );
      };

      drawFrame();


      // --------------------------------
      // Stop Export
      // --------------------------------

      const stopExport = () => {

        if (
          videoPreview.currentTime >=
          end
        ) {

          drawing = false;

          videoPreview.pause();

          videoPreview.removeEventListener(
            "timeupdate",
            stopExport
          );

          if (
            recorder.state !==
            "inactive"
          ) {
            recorder.stop();
          }
        }
      };

      videoPreview.addEventListener(
        "timeupdate",
        stopExport
      );


      // --------------------------------
      // Safety Timeout
      // --------------------------------

      const durationMs =
        ((end - start) + 2) * 1000;

      setTimeout(() => {

        drawing = false;

        videoPreview.pause();

        videoPreview.removeEventListener(
          "timeupdate",
          stopExport
        );

        if (
          recorder.state !==
          "inactive"
        ) {
          recorder.stop();
        }

      }, durationMs);


      await finished;


      // --------------------------------
      // Create File
      // --------------------------------

      const blob =
        new Blob(
          chunks,
          {
            type: "video/webm"
          }
        );

      downloadURL =
        URL.createObjectURL(
          blob
        );

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


      // --------------------------------
      // Cleanup
      // --------------------------------

      combinedStream
        .getTracks()
        .forEach(track => {
          track.stop();
        });

      videoStream
        .getTracks()
        .forEach(track => {
          track.stop();
        });

      await audioContext.close();

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
  }
);


// ============================================
// SELECT MUSIC
// ============================================

if (addMusic) {

  addMusic.addEventListener(
    "click",
    () => {
      audioInput.click();
    }
  );
}


// ============================================
// MUSIC SELECTED
// ============================================

if (audioInput) {

  audioInput.addEventListener(
    "change",
    () => {

      const file =
        audioInput.files[0];

      if (!file) return;

      selectedMusic = file;

      if (musicURL) {
        URL.revokeObjectURL(
          musicURL
        );
      }

      musicURL =
        URL.createObjectURL(
          file
        );

      musicStatus.textContent =
        `Music selected: ${file.name}`;

      if (exportMusic) {
        exportMusic.disabled = false;
      }
    }
  );
}


// ============================================
// MUSIC VOLUME
// ============================================

if (musicVolume) {

  musicVolume.addEventListener(
    "input",
    () => {

      const value =
        Math.round(
          Number(musicVolume.value) * 100
        );

      if (musicVolumeValue) {
        musicVolumeValue.textContent =
          `${value}%`;
      }
    }
  );
}


// ============================================
// EXPORT VIDEO WITH MUSIC
// ============================================

if (exportMusic) {

  exportMusic.addEventListener(
    "click",
    async () => {

      if (!videoPreview.src) {

        alert(
          "Please select a video first."
        );

        return;
      }

      if (!selectedMusic) {

        alert(
          "Please select music first."
        );

        return;
      }

      const start =
        Number(startTime.value);

      const end =
        Number(endTime.value);

      if (
        start < 0 ||
        end <= start ||
        end > videoPreview.duration
      ) {

        alert(
          "Please enter a valid start and end time."
        );

        return;
      }

      try {

        exportMusic.disabled = true;
        exportTrim.disabled = true;
        previewTrim.disabled = true;

        if (downloadMusic) {
          downloadMusic.style.display =
            "none";
        }

        if (musicStatus) {
          musicStatus.textContent =
            "Preparing music export...";
        }

        exportStatus.textContent =
          "Preparing video + music...";


        // --------------------------------
        // Canvas
        // --------------------------------

        const canvas =
          document.createElement("canvas");

        canvas.width =
          videoPreview.videoWidth;

        canvas.height =
          videoPreview.videoHeight;

        const ctx =
          canvas.getContext("2d");


        // --------------------------------
        // Audio Context
        // --------------------------------
        const {
  audioContext,
  videoSource
} = getVideoAudioSource();

const source = videoSource;
        ();


        // --------------------------------
        // Original Video Audio
        // --------------------------------

        const videoSource =
          audioContext.createMediaElementSource(
            videoPreview
          ); 

        const videoGain =
          audioContext.createGain();

        videoGain.gain.value = 1;

        videoSource.connect(
          videoGain
        );

        videoGain.connect(
          destination
        );


        // --------------------------------
        // Music Audio
        // --------------------------------

        const musicAudio =
          new Audio();

        musicAudio.src =
          musicURL;

        musicAudio.preload =
          "auto";

        musicAudio.crossOrigin =
          "anonymous";

        const musicSource =
          audioContext.createMediaElementSource(
            musicAudio
          );

        const musicGain =
          audioContext.createGain();

        musicGain.gain.value =
          Number(musicVolume.value);

        musicSource.connect(
          musicGain
        );

        musicGain.connect(
          destination
        );


        // --------------------------------
        // Video Stream
        // --------------------------------

        const videoStream =
          canvas.captureStream(30);


        // --------------------------------
        // Combined Stream
        // --------------------------------

        const combinedStream =
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
        // Recorder
        // --------------------------------

        let mimeType = "";

        const formats = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm"
        ];

        for (const format of formats) {

          if (
            MediaRecorder.isTypeSupported(
              format
            )
          ) {

            mimeType =
              format;

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

        recorder.ondataavailable =
          event => {

            if (
              event.data &&
              event.data.size > 0
            ) {

              chunks.push(
                event.data
              );
            }
          };

        const finished =
          new Promise(resolve => {

            recorder.onstop =
              resolve;
          });


        // --------------------------------
        // Seek Video
        // --------------------------------

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

          videoPreview.currentTime =
            start;
        });


        // --------------------------------
        // Prepare Music
        // --------------------------------

        musicAudio.currentTime = 0;

        await new Promise(resolve => {

          if (
            musicAudio.readyState >= 2
          ) {
            resolve();
            return;
          }

          musicAudio.addEventListener(
            "canplay",
            resolve,
            {
              once: true
            }
          );

          musicAudio.load();
        });


        // --------------------------------
        // Start Recording
        // --------------------------------

        recorder.start(200);

        await audioContext.resume();

        videoPreview.muted = true;

        await videoPreview.play();

        await musicAudio.play();

        exportStatus.textContent =
          "Exporting video with music...";


        // --------------------------------
        // Draw Frames
        // --------------------------------

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

          requestAnimationFrame(
            drawFrame
          );
        };

        drawFrame();


        // --------------------------------
        // Stop
        // --------------------------------

        const stopExport = () => {

          if (
            videoPreview.currentTime >=
            end
          ) {

            drawing = false;

            videoPreview.pause();
            musicAudio.pause();

            videoPreview.removeEventListener(
              "timeupdate",
              stopExport
            );

            if (
              recorder.state !==
              "inactive"
            ) {

              recorder.stop();
            }
          }
        };

        videoPreview.addEventListener(
          "timeupdate",
          stopExport
        );


        // --------------------------------
        // Safety Timeout
        // --------------------------------

        const durationMs =
          ((end - start) + 3) * 1000;

        const timeoutId =
          setTimeout(() => {

            drawing = false;

            videoPreview.pause();
            musicAudio.pause();

            videoPreview.removeEventListener(
              "timeupdate",
              stopExport
            );

            if (
              recorder.state !==
              "inactive"
            ) {

              recorder.stop();
            }

          }, durationMs);


        await finished;

        clearTimeout(
          timeoutId
        );


        // --------------------------------
        // Restore Video
        // --------------------------------

        videoPreview.muted = false;


        // --------------------------------
        // Create Output
        // --------------------------------

        const blob =
          new Blob(
            chunks,
            {
              type: "video/webm"
            }
          );

        musicDownloadURL =
          URL.createObjectURL(
            blob
          );


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

        exportStatus.textContent =
          "✅ Video with music ready!";

        if (musicStatus) {

          musicStatus.textContent =
            "Music export completed ✅";
        }


        // --------------------------------
        // Cleanup
        // --------------------------------

        musicAudio.pause();

        videoPreview.muted = false;

        combinedStream
          .getTracks()
          .forEach(track => {
            track.stop();
          });

        videoStream
          .getTracks()
          .forEach(track => {
            track.stop();
          });

        await audioContext.close();

      } catch (error) {

        console.error(
          "Music export error:",
          error
        );

        videoPreview.muted = false;

        exportStatus.textContent =
          "❌ Music export failed: " +
          error.message;

        if (musicStatus) {

          musicStatus.textContent =
            "Music export failed.";
        }

      } finally {

        exportMusic.disabled = false;
        exportTrim.disabled = false;
        previewTrim.disabled = false;
      }
    }
  );
}