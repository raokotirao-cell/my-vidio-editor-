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
const previewMusic =
  document.getElementById("previewMusic");

const stopMusic =
  document.getElementById("stopMusic");
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

// --------------------------------------------
// MUSIC PREVIEW
// --------------------------------------------

let previewAudio = null;

if (previewMusic) {

  previewMusic.addEventListener(
    "click",
    () => {

      if (!selectedMusic || !musicURL) {
        alert("Please select music first.");
        return;
      }

      if (previewAudio) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
      }

      previewAudio =
        new Audio(musicURL);

      previewAudio.volume =
        Number(
          musicVolume
            ? musicVolume.value
            : 0.5
        );

      previewAudio.play();

      if (musicStatus) {
        musicStatus.textContent =
          "▶ Playing music preview...";
      }

    }
  );

}


// --------------------------------------------
// STOP MUSIC PREVIEW
// --------------------------------------------

if (stopMusic) {

  stopMusic.addEventListener(
    "click",
    () => {

      if (previewAudio) {

        previewAudio.pause();
        previewAudio.currentTime = 0;

      }

      if (musicStatus) {
        musicStatus.textContent =
          "Music preview stopped.";
      }

    }
  );

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
         const muteOriginalAudio =
  document.getElementById("muteOriginalAudio");

const videoGain =
  audioContext.createGain();

videoGain.gain.value =
  muteOriginalAudio &&
  muteOriginalAudio.checked
    ? 0
    : 1;
          
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
// ============================================
// COMBINE 2 PARTS - ISOLATED CODE
// ============================================

(() => {

  const exportTwoParts =
    document.getElementById("exportTwoParts");

  const twoPartsStatus =
    document.getElementById("twoPartsStatus");

  const downloadTwoParts =
    document.getElementById("downloadTwoParts");

  const part1Start =
    document.getElementById("part1Start");

  const part1End =
    document.getElementById("part1End");

  const part2Start =
    document.getElementById("part2Start");

  const part2End =
    document.getElementById("part2End");


  if (!exportTwoParts) {
    return;
  }


  exportTwoParts.addEventListener(
    "click",
    async () => {

      let video = null;
      let canvas = null;
      let ctx = null;
      let audioContext = null;
      let combinedStream = null;
      let videoStream = null;
      let recorder = null;

      let animationFrame = null;

      try {

        // --------------------------------
        // CHECK VIDEO
        // --------------------------------

        if (!videoURL) {
          alert("Please select a video first.");
          return;
        }


        // --------------------------------
        // GET TIMES
        // --------------------------------

        const p1Start =
          Number(part1Start.value);

        const p1End =
          Number(part1End.value);

        const p2Start =
          Number(part2Start.value);

        const p2End =
          Number(part2End.value);


        if (
          !Number.isFinite(p1Start) ||
          !Number.isFinite(p1End) ||
          !Number.isFinite(p2Start) ||
          !Number.isFinite(p2End)
        ) {
          alert("Please enter valid times.");
          return;
        }


        if (
          p1Start < 0 ||
          p1End <= p1Start ||
          p2Start < 0 ||
          p2End <= p2Start
        ) {
          alert("Please enter valid Part 1 and Part 2 times.");
          return;
        }


        // --------------------------------
        // BUTTON STATE
        // --------------------------------

        exportTwoParts.disabled = true;

        if (twoPartsStatus) {
          twoPartsStatus.textContent =
            "Preparing combined video...";
        }


        // --------------------------------
        // CREATE VIDEO
        // --------------------------------

        video =
          document.createElement("video");

        video.src = videoURL;
        video.preload = "auto";
        video.playsInline = true;


        await new Promise(
          (resolve, reject) => {

            video.onloadedmetadata =
              resolve;

            video.onerror =
              () => {
                reject(
                  new Error(
                    "Could not load video."
                  )
                );
              };

          }
        );


        const duration =
          video.duration;


        // --------------------------------
        // VALIDATE AGAINST VIDEO
        // --------------------------------

        if (
          p1End > duration ||
          p2End > duration
        ) {
          throw new Error(
            "Part time is longer than video duration."
          );
        }


        // --------------------------------
        // CANVAS
        // --------------------------------

        canvas =
          document.createElement("canvas");

        canvas.width =
          video.videoWidth;

        canvas.height =
          video.videoHeight;

        ctx =
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


        const videoSource =
          audioContext.createMediaElementSource(
            video
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
        // MIME TYPE
        // --------------------------------

        let mimeType = "";

        const formats = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm"
        ];


        for (
          const format of formats
        ) {

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


        // --------------------------------
        // RECORDER
        // --------------------------------

        recorder =
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
        // START RECORDING
        // --------------------------------

        await audioContext.resume();

        recorder.start(200);


        // --------------------------------
        // DRAW LOOP
        // --------------------------------

        let drawing = true;

        const drawFrame = () => {

          if (!drawing) {
            return;
          }

          ctx.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
          );

          animationFrame =
            requestAnimationFrame(
              drawFrame
            );

        };


        drawFrame();


        // --------------------------------
        // PLAY PART FUNCTION
        // --------------------------------

        const playPart =
          async (start, end) => {

            return new Promise(
              async (resolve, reject) => {

                try {

                  video.currentTime =
                    start;


                  await new Promise(
                    seekResolve => {

                      const seeked =
                        () => {

                          video.removeEventListener(
                            "seeked",
                            seeked
                          );

                          seekResolve();

                        };

                      video.addEventListener(
                        "seeked",
                        seeked
                      );

                    }
                  );


                  const stopAtEnd =
                    () => {

                      if (
                        video.currentTime >= end
                      ) {

                        video.pause();

                        video.removeEventListener(
                          "timeupdate",
                          stopAtEnd
                        );

                        resolve();

                      }

                    };


                  video.addEventListener(
                    "timeupdate",
                    stopAtEnd
                  );


                  await video.play();

                } catch (error) {

                  reject(error);

                }

              }
            );

          };


        // --------------------------------
        // PART 1
        // --------------------------------

        if (twoPartsStatus) {
          twoPartsStatus.textContent =
            "Exporting Part 1...";
        }


        await playPart(
          p1Start,
          p1End
        );


        // --------------------------------
        // PART 2
        // --------------------------------

        if (twoPartsStatus) {
          twoPartsStatus.textContent =
            "Exporting Part 2...";
        }


        await playPart(
          p2Start,
          p2End
        );


        // --------------------------------
        // STOP
        // --------------------------------

        drawing = false;

        if (animationFrame) {
          cancelAnimationFrame(
            animationFrame
          );
        }


        video.pause();


        if (
          recorder.state !== "inactive"
        ) {
          recorder.stop();
        }


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


        const url =
          URL.createObjectURL(blob);


        downloadTwoParts.href =
          url;

        downloadTwoParts.download =
          "combined-video.webm";

        downloadTwoParts.textContent =
          "Download Combined Video";

        downloadTwoParts.style.display =
          "inline-block";


        const finalDuration =
          (p1End - p1Start) +
          (p2End - p2Start);


        if (twoPartsStatus) {
          twoPartsStatus.textContent =
            "Combined video ready ✅ (" +
            finalDuration.toFixed(1) +
            " sec)";
        }


      } catch (error) {

        console.error(
          "Two parts export error:",
          error
        );


        if (twoPartsStatus) {
          twoPartsStatus.textContent =
            "❌ Export failed: " +
            (
              error.message ||
              String(error)
            );
        }


      } finally {

        if (animationFrame) {
          cancelAnimationFrame(
            animationFrame
          );
        }


        if (video) {
          video.pause();
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


        exportTwoParts.disabled =
          false;

      }

    }
  );

})();
// ============================================
// COMBINE MULTIPLE VIDEOS - ISOLATED CODE
// ============================================

(() => {

  const multiVideoInput =
    document.getElementById("multiVideoInput");

  const selectedVideosStatus =
    document.getElementById("selectedVideosStatus");

  const combineVideosButton =
    document.getElementById("combineVideosButton");

  const combineVideosStatus =
    document.getElementById("combineVideosStatus");

  const downloadCombinedVideos =
    document.getElementById("downloadCombinedVideos");


  if (!multiVideoInput || !combineVideosButton) {
    return;
  }


  let selectedFiles = [];


  // --------------------------------
  // SELECT VIDEOS
  // --------------------------------

  multiVideoInput.addEventListener(
    "change",
    () => {

      selectedFiles =
        Array.from(
          multiVideoInput.files || []
        );


      if (selectedFiles.length === 0) {

        selectedVideosStatus.textContent =
          "No videos selected.";

        return;
      }


      selectedVideosStatus.textContent =
        selectedFiles.length +
        " video(s) selected ✅";

    }
  );


  // --------------------------------
  // COMBINE VIDEOS
  // --------------------------------

  combineVideosButton.addEventListener(
    "click",
    async () => {

      let canvas = null;
      let ctx = null;
      let audioContext = null;
      let destination = null;

      let currentVideo = null;
      let canvasStream = null;
      let combinedStream = null;
      let recorder = null;

      let animationFrame = null;

      const objectUrls = [];


      try {

        // --------------------------------
        // CHECK FILES
        // --------------------------------

        if (selectedFiles.length < 2) {

          alert(
            "Please select at least 2 videos."
          );

          return;
        }


        // --------------------------------
        // BUTTON STATE
        // --------------------------------

        combineVideosButton.disabled = true;

        downloadCombinedVideos.style.display =
          "none";


        combineVideosStatus.textContent =
          "Preparing videos...";


        // --------------------------------
        // LOAD FIRST VIDEO
        // --------------------------------

        currentVideo =
          document.createElement("video");

        currentVideo.playsInline = true;
        currentVideo.preload = "auto";
        currentVideo.muted = false;


        const firstUrl =
          URL.createObjectURL(
            selectedFiles[0]
          );

        objectUrls.push(firstUrl);

        currentVideo.src =
          firstUrl;


        await new Promise(
          (resolve, reject) => {

            currentVideo.onloadedmetadata =
              resolve;

            currentVideo.onerror =
              () => {
                reject(
                  new Error(
                    "Could not load the first video."
                  )
                );
              };

          }
        );


        // --------------------------------
        // CANVAS
        // --------------------------------

        canvas =
          document.createElement("canvas");


        canvas.width =
          currentVideo.videoWidth || 1280;

        canvas.height =
          currentVideo.videoHeight || 720;


        ctx =
          canvas.getContext("2d");


        if (!ctx) {
          throw new Error(
            "Could not create canvas."
          );
        }


        // --------------------------------
        // AUDIO
        // --------------------------------

        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;


        if (!AudioContext) {
          throw new Error(
            "Audio recording is not supported."
          );
        }


        audioContext =
          new AudioContext();


        destination =
          audioContext.createMediaStreamDestination();


        // --------------------------------
        // VIDEO STREAM
        // --------------------------------

        canvasStream =
          canvas.captureStream(30);


        combinedStream =
          new MediaStream();


        canvasStream
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
        // MIME TYPE
        // --------------------------------

        let mimeType = "";


        const formats = [

          "video/webm;codecs=vp9,opus",

          "video/webm;codecs=vp8,opus",

          "video/webm"

        ];


        for (
          const format of formats
        ) {

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


        // --------------------------------
        // RECORDER
        // --------------------------------

        recorder =
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
        // DRAW LOOP
        // --------------------------------

        let drawing = true;


        const drawFrame = () => {

          if (!drawing) {
            return;
          }


          if (
            currentVideo &&
            currentVideo.readyState >= 2
          ) {

            ctx.drawImage(
              currentVideo,
              0,
              0,
              canvas.width,
              canvas.height
            );

          }


          animationFrame =
            requestAnimationFrame(
              drawFrame
            );

        };


        drawFrame();


        // --------------------------------
        // START AUDIO
        // --------------------------------

        await audioContext.resume();


        // --------------------------------
        // START RECORDING
        // --------------------------------

        recorder.start(200);


        // --------------------------------
        // PLAY EACH VIDEO
        // --------------------------------

        for (
          let i = 0;
          i < selectedFiles.length;
          i++
        ) {

          const file =
            selectedFiles[i];


          combineVideosStatus.textContent =
            "Combining video " +
            (i + 1) +
            " of " +
            selectedFiles.length +
            "...";


          // --------------------------------
          // CREATE NEW VIDEO ELEMENT
          // --------------------------------

          const video =
            document.createElement("video");


          video.playsInline = true;
          video.preload = "auto";
          video.crossOrigin = "anonymous";


          const url =
            URL.createObjectURL(file);


          objectUrls.push(url);


          video.src =
            url;


          // --------------------------------
          // LOAD VIDEO
          // --------------------------------

          await new Promise(
            (resolve, reject) => {

              video.onloadedmetadata =
                resolve;

              video.onerror =
                () => {

                  reject(
                    new Error(
                      "Could not load video " +
                      (i + 1)
                    )
                  );

                };

            }
          );


          // --------------------------------
          // KEEP ORIGINAL CANVAS SIZE
          // --------------------------------

          if (
            video.videoWidth &&
            video.videoHeight
          ) {

            // Keep first video's size
            // so all videos fit into one output.

          }


          // --------------------------------
          // CREATE AUDIO SOURCE
          // --------------------------------

          let audioSource = null;


          try {

            audioSource =
              audioContext
                .createMediaElementSource(
                  video
                );


            audioSource.connect(
              destination
            );

          } catch (audioError) {

            console.warn(
              "Audio unavailable for video " +
              (i + 1),
              audioError
            );

          }


          // --------------------------------
          // SWITCH CURRENT VIDEO
          // --------------------------------

          currentVideo =
            video;


          // 
// --------------------------------
// PLAY VIDEO
// --------------------------------

await video.play();

await new Promise((resolve, reject) => {

  let finished = false;

  const finish = () => {

    if (finished) {
      return;
    }

    finished = true;

    clearInterval(checkTimer);
    clearTimeout(forceTimer);

    video.removeEventListener(
      "ended",
      finish
    );

    video.removeEventListener(
      "error",
      handleError
    );

    resolve();

  };


  const handleError = () => {

    if (finished) {
      return;
    }

    finished = true;

    clearInterval(checkTimer);
    clearTimeout(forceTimer);

    reject(
      new Error(
        "Playback failed for video " +
        (i + 1)
      )
    );

  };


  const checkTimer =
    setInterval(() => {

      if (
        Number.isFinite(video.duration) &&
        video.currentTime >=
          video.duration - 0.2
      ) {

        finish();

      }

    }, 100);


  const forceTimer =
    setTimeout(() => {

      finish();

    }, Math.max(
      1000,
      (video.duration * 1000) + 1500
    ));


  video.addEventListener(
    "ended",
    finish
  );

  video.addEventListener(
    "error",
    handleError
  );

});

video.pause();

      

    


                 
}
              
        // --------------------------------
        // STOP DRAWING
        // --------------------------------

        drawing = false;


        if (animationFrame) {

          cancelAnimationFrame(
            animationFrame
          );

        }


   

        // --------------------------------
// STOP RECORDING
// --------------------------------

// Give MediaRecorder time to flush
// the last video frames.

if (
  recorder.state === "recording"
) {

  try {

    recorder.requestData();

  } catch (e) {

    console.log(
      "requestData warning:",
      e
    );

  }


  await new Promise(
    resolve => setTimeout(resolve, 300)
  );


  recorder.stop();

}


await finished;


// Make sure some data was actually received

if (chunks.length === 0) {

  throw new Error(
    "Recorder produced no video data."
  );

}

        // --------------------------------
        // CREATE OUTPUT
        // --------------------------------

        const blob =
          new Blob(
            chunks,
            {
              type: "video/webm"
            }
          );


        if (blob.size === 0) {

          throw new Error(
            "Combined video is empty."
          );

        }


        const outputUrl =
          URL.createObjectURL(
            blob
          );


        // --------------------------------
        // DOWNLOAD LINK
        // --------------------------------

        downloadCombinedVideos.href =
          outputUrl;


        downloadCombinedVideos.download =
          "combined-videos.webm";


        downloadCombinedVideos.textContent =
          "Download Combined Video";


        downloadCombinedVideos.style.display =
          "inline-block";


        combineVideosStatus.textContent =
          "Combined " +
          selectedFiles.length +
          " videos successfully ✅";


      } catch (error) {

        console.error(
          "Multiple video combine error:",
          error
        );


        combineVideosStatus.textContent =
          "❌ Combine failed: " +
          (
            error.message ||
            String(error)
          );


      } finally {

        // --------------------------------
        // CLEANUP
        // --------------------------------

        if (animationFrame) {

          cancelAnimationFrame(
            animationFrame
          );

        }


        if (currentVideo) {

          try {
            currentVideo.pause();
          } catch (e) {}

        }


        if (combinedStream) {

          combinedStream
            .getTracks()
            .forEach(track => {

              try {
                track.stop();
              } catch (e) {}

            });

        }


        if (canvasStream) {

          canvasStream
            .getTracks()
            .forEach(track => {

              try {
                track.stop();
              } catch (e) {}

            });

        }


        if (audioContext) {

          try {

            await audioContext.close();

          } catch (e) {

            console.log(e);

          }

        }


        objectUrls.forEach(url => {

          try {

            URL.revokeObjectURL(url);

          } catch (e) {}

        });


        combineVideosButton.disabled =
          false;

      }

    }
  );

})();

// ============================================
// RECORD OWN VOICE - ISOLATED CODE
// ============================================

(() => {

  const startVoiceRecording =
    document.getElementById("startVoiceRecording");

  const stopVoiceRecording =
    document.getElementById("stopVoiceRecording");

  const voiceRecordingStatus =
    document.getElementById("voiceRecordingStatus");

  const exportVoiceVideo =
    document.getElementById("exportVoiceVideo");

  const voiceExportStatus =
    document.getElementById("voiceExportStatus");
const voiceMusicInput =
  document.getElementById("voiceMusicInput");

const voiceMusicStatus =
  document.getElementById("voiceMusicStatus");

const voiceMusicVolume =
  document.getElementById("voiceMusicVolume");

const voiceMusicVolumeValue =
  document.getElementById("voiceMusicVolumeValue");
const voiceVolume =
  document.getElementById("voiceVolume");

const voiceVolumeValue =
  document.getElementById("voiceVolumeValue");
  const downloadVoiceVideo =
    document.getElementById("downloadVoiceVideo");


  if (
    !startVoiceRecording ||
    !stopVoiceRecording ||
    !exportVoiceVideo
  ) {
    return;
  }


  let mediaRecorder = null;
  let microphoneStream = null;
  let recordedVoiceChunks = [];
  let recordedVoiceBlob = null;
  let recordedVoiceURL = null;
  let voiceMusicFile = null;
let voiceMusicURL = null;
let musicAudio = null;
if (voiceMusicVolume) {

  voiceMusicVolume.addEventListener(
    "input",
    () => {

      const value =
        Math.round(
          Number(
            voiceMusicVolume.value
          ) * 100
        );

      if (voiceMusicVolumeValue) {

        voiceMusicVolumeValue.textContent =
          value + "%";

      }

    }
  );

}
if (voiceMusicInput) {

  voiceMusicInput.addEventListener(
    "change",
    () => {

      const file =
        voiceMusicInput.files[0];

      if (!file) {
        return;
      }

      voiceMusicFile = file;


      if (voiceMusicURL) {

        URL.revokeObjectURL(
          voiceMusicURL
        );

      }


      voiceMusicURL =
        URL.createObjectURL(file);


      if (voiceMusicStatus) {

        voiceMusicStatus.textContent =
          "Background music selected: " +
          file.name;

      }

    }
  );

}
  if (voiceVolume) {

  voiceVolume.addEventListener(
    "input",
    () => {

      const value =
        Math.round(
          Number(voiceVolume.value) * 100
        );

      if (voiceVolumeValue) {

        voiceVolumeValue.textContent =
          value + "%";

      }

    }
  );

}

  // --------------------------------
  // AUDIO MIME TYPE
  // --------------------------------

  const getAudioMimeType = () => {

    const formats = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus"
    ];

    for (const format of formats) {

      if (
        MediaRecorder.isTypeSupported(format)
      ) {
        return format;
      }

    }

    return "";
  };


  // --------------------------------
  // START RECORDING
  // --------------------------------

  startVoiceRecording.addEventListener(
    "click",
    async () => {

      try {

        recordedVoiceChunks = [];
        recordedVoiceBlob = null;


        if (recordedVoiceURL) {

          URL.revokeObjectURL(
            recordedVoiceURL
          );

          recordedVoiceURL = null;

        }


        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {

          throw new Error(
            "Microphone is not supported by this browser."
          );

        }


        voiceRecordingStatus.textContent =
          "Requesting microphone permission...";


        microphoneStream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true
            }
          );


        const mimeType =
          getAudioMimeType();


        if (!mimeType) {

          throw new Error(
            "Audio recording is not supported."
          );

        }


        mediaRecorder =
          new MediaRecorder(
            microphoneStream,
            {
              mimeType: mimeType
            }
          );


        mediaRecorder.ondataavailable =
          event => {

            if (
              event.data &&
              event.data.size > 0
            ) {

              recordedVoiceChunks.push(
                event.data
              );

            }

          };


        mediaRecorder.onstop = () => {

          recordedVoiceBlob =
            new Blob(
              recordedVoiceChunks,
              {
                type: mimeType
              }
            );


          if (
            recordedVoiceBlob.size === 0
          ) {

            voiceRecordingStatus.textContent =
              "❌ Voice recording is empty.";
        exportVoiceVideo.disabled = true;
            return;

          }


          recordedVoiceURL =
            URL.createObjectURL(
              recordedVoiceBlob
            );


          voiceRecordingStatus.textContent =
            "Voice recorded ✅";

exportVoiceVideo.disabled = false;
          if (microphoneStream) {

            microphoneStream
              .getTracks()
              .forEach(track => {
                track.stop();
              });

          }

        };


        mediaRecorder.start(200);


        startVoiceRecording.disabled =
          true;

        stopVoiceRecording.disabled =
          false;

        exportVoiceVideo.disabled =
          true;


        voiceRecordingStatus.textContent =
          "🎙️ Recording your voice...";


      } catch (error) {

        console.error(
          "Voice recording error:",
          error
        );


        voiceRecordingStatus.textContent =
          "❌ Recording failed: " +
          (
            error.message ||
            String(error)
          );


        if (microphoneStream) {

          microphoneStream
            .getTracks()
            .forEach(track => {
              track.stop();
            });

          microphoneStream = null;

        }

        startVoiceRecording.disabled =
          false;

        stopVoiceRecording.disabled =
          true;

        exportVoiceVideo.disabled =
          true;

      }

    }
  );


  // --------------------------------
  // STOP RECORDING
  // --------------------------------

  stopVoiceRecording.addEventListener(
    "click",
    () => {

      if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
      ) {

        mediaRecorder.stop();

      }


      stopVoiceRecording.disabled =
        true;

      startVoiceRecording.disabled =
        false;

      voiceRecordingStatus.textContent =
        "Processing voice...";

    }
  );


  // --------------------------------
  // ADD OWN VOICE TO VIDEO
  // --------------------------------

  exportVoiceVideo.addEventListener(
    "click",
    async () => {

      if (!videoURL) {

        alert(
          "Please select a video first."
        );

        return;

      }


      if (
        !recordedVoiceBlob ||
        !recordedVoiceURL
      ) {

        alert(
          "Please record your voice first."
        );

        return;

      }


      let video = null;
      let voiceAudio = null;
      let canvas = null;
      let ctx = null;

      let audioContext = null;
      let destination = null;

      let videoStream = null;
      let combinedStream = null;
      let recorder = null;

      let animationFrame = null;
      let stopTimer = null;


      try {

        exportVoiceVideo.disabled =
          true;

        startVoiceRecording.disabled =
          true;

        stopVoiceRecording.disabled =
          true;


        if (downloadVoiceVideo) {

          downloadVoiceVideo.style.display =
            "none";

          downloadVoiceVideo.removeAttribute(
            "href"
          );

        }


        if (voiceExportStatus) {

          voiceExportStatus.textContent =
            "Preparing video with your voice...";

        }


        // --------------------------------
        // LOAD VIDEO
        // --------------------------------

        video =
          document.createElement("video");

        video.src =
          videoURL;

        video.preload =
          "auto";

        video.playsInline =
          true;


        await new Promise(
          (resolve, reject) => {

            video.onloadedmetadata =
              resolve;

            video.onerror = () => {

              reject(
                new Error(
                  "Could not load video."
                )
              );

            };

          }
        );


        if (
          !video.videoWidth ||
          !video.videoHeight
        ) {

          throw new Error(
            "Video dimensions are not available."
          );

        }


        // --------------------------------
        // LOAD VOICE
        // --------------------------------

        voiceAudio =
          document.createElement("audio");

        voiceAudio.src =
          recordedVoiceURL;

        voiceAudio.preload =
          "auto";


        await new Promise(
          (resolve, reject) => {

            voiceAudio.onloadedmetadata =
              resolve;

            voiceAudio.onerror = () => {

              reject(
                new Error(
                  "Could not load recorded voice."
                )
              );

            };

          }
        );
// --------------------------------
// LOAD BACKGROUND MUSIC
// --------------------------------

if (voiceMusicURL) {

  musicAudio =
    document.createElement("audio");

  musicAudio.src =
    voiceMusicURL;

  musicAudio.preload =
    "auto";

  musicAudio.loop =
    true;

  await new Promise(
    (resolve, reject) => {

      musicAudio.onloadedmetadata =
        resolve;

      musicAudio.onerror = () => {

        reject(
          new Error(
            "Could not load background music."
          )
              );
    };

  });

}




        // --------------------------------
        // CANVAS
        // --------------------------------

        canvas =
          document.createElement("canvas");

        canvas.width =
          video.videoWidth;

        canvas.height =
          video.videoHeight;


        ctx =
          canvas.getContext("2d");


        if (!ctx) {

          throw new Error(
            "Could not create canvas."
          );

        }


        // --------------------------------
        // AUDIO CONTEXT
        // IMPORTANT:
        // ORIGINAL VIDEO AUDIO IS NOT CONNECTED
        // --------------------------------

        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;


        if (!AudioContext) {

          throw new Error(
            "Audio mixing is not supported."
          );

        }


        audioContext =
          new AudioContext();


        destination =
          audioContext.createMediaStreamDestination();

        // --------------------------------
        // OWN VOICE ONLY
        // --------------------------------

        const voiceSource =
          audioContext.createMediaElementSource(
            voiceAudio
          );


        const voiceGain =
          audioContext.createGain();


        voiceGain.gain.value =
  Number(
    voiceVolume
      ? voiceVolume.value
      : 1
  );


        voiceSource.connect(
          voiceGain
        );


        voiceGain.connect(
          destination
        );
// --------------------------------
// BACKGROUND MUSIC SOURCE
// --------------------------------

if (musicAudio) {

  const musicSource =
    audioContext.createMediaElementSource(
      musicAudio
    );

  const musicGain =
    audioContext.createGain();

  musicGain.gain.value =
    Number(
      voiceMusicVolume
        ? voiceMusicVolume.value
        : 0.3
    );

  musicSource.connect(
    musicGain
  );

  musicGain.connect(
    destination
  );

}


        // --------------------------------
        // VIDEO STREAM
        // --------------------------------

        videoStream =
          canvas.captureStream(30);


        combinedStream =
          new MediaStream();


        videoStream
          .getVideoTracks()
          .forEach(track => {

            combinedStream.addTrack(
              track
            );

          });


        destination
          .stream
          .getAudioTracks()
          .forEach(track => {

            combinedStream.addTrack(
              track
            );

          });


        // --------------------------------
        // MIME TYPE
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


        // --------------------------------
        // RECORDER
        // --------------------------------

        recorder =
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
        // START
        // --------------------------------

        await audioContext.resume();


        video.currentTime = 0;
        voiceAudio.currentTime = 0;

if (musicAudio) {
  musicAudio.currentTime = 0;
}

        recorder.start(200);


        await video.play();


        try {

          await voiceAudio.play();
       if (musicAudio) {

  try {

    await musicAudio.play();

  } catch (musicError) {

    console.warn(
      "Background music warning:",
      musicError
    );

  }

}

        } catch (voiceError) {

          console.warn(
            "Voice playback warning:",
            voiceError
          );

        }


        if (voiceExportStatus) {

          voiceExportStatus.textContent =
            "Exporting video with your own voice...";

        }


        // --------------------------------
        // DRAW VIDEO
        // --------------------------------

        let drawing = true;


        const drawFrame = () => {

          if (!drawing) {
            return;
          }


          if (
            video.readyState >= 2
          ) {

            ctx.drawImage(
              video,
              0,
              0,
              canvas.width,
              canvas.height
            );

          }


          animationFrame =
            requestAnimationFrame(
              drawFrame
            );

        };


        drawFrame();


        // --------------------------------
        // STOP FUNCTION
        // --------------------------------

        let stopped = false;


        const finishExport = () => {

          if (stopped) {
            return;
          }


          stopped = true;
          drawing = false;


          if (animationFrame) {

            cancelAnimationFrame(
              animationFrame
            );

            animationFrame =
              null;

          }


          video.pause();
          voiceAudio.pause();
          


          if (
            recorder &&
            recorder.state === "recording"
          ) {

            recorder.requestData();

            setTimeout(
              () => {

                if (
                  recorder &&
                  recorder.state !==
                    "inactive"
                ) {

                  recorder.stop();

                }

              },
              300
            );

          }

        };


        // --------------------------------
        // VIDEO END
        // --------------------------------

        video.addEventListener(
          "ended",
          finishExport
        );


        video.addEventListener(
          "timeupdate",
          () => {

            if (
              video.duration &&
              video.currentTime >=
                video.duration - 0.15
            ) {

              finishExport();

            }

          }
        );


        // --------------------------------
        // SAFETY TIMER
        // --------------------------------

        stopTimer =
          setTimeout(
            finishExport,
            Math.max(
              3000,
              (video.duration * 1000) + 2000
            )
          );


        await finished;


        if (stopTimer) {

          clearTimeout(
            stopTimer
          );

          stopTimer =
            null;

        }


        // --------------------------------
        // OUTPUT
        // --------------------------------

        if (chunks.length === 0) {

          throw new Error(
            "Voice video recording produced no data."
          );

        }


        const blob =
          new Blob(
            chunks,
            {
              type: "video/webm"
            }
          );


        if (blob.size === 0) {

          throw new Error(
            "Voice video is empty."
          );

        }


        const outputURL =
          URL.createObjectURL(
            blob
          );


        if (downloadVoiceVideo) {

          downloadVoiceVideo.href =
            outputURL;

          downloadVoiceVideo.download =
            "video-with-own-voice.webm";

          downloadVoiceVideo.textContent =
            "Download Video With Own Voice";

          downloadVoiceVideo.style.display =
            "inline-block";

        }


        if (voiceExportStatus) {

          voiceExportStatus.textContent =
            "✅ Video + own voice ready";

        }


      } catch (error) {

        console.error(
          "Own voice export error:",
          error
        );


        if (voiceExportStatus) {

          voiceExportStatus.textContent =
            "❌ Voice export failed: " +
            (
              error.message ||
              String(error)
            );

        }

      } finally {

        if (stopTimer) {

          clearTimeout(
            stopTimer
          );

        }


        if (animationFrame) {

          cancelAnimationFrame(
            animationFrame
          );

        }


        if (video) {

          try {
            video.pause();
          } catch (e) {}

        }


        if (voiceAudio) {

          try {
            voiceAudio.pause();
          } catch (e) {}

        }
if (musicAudio) {

  try {
    musicAudio.pause();
  } catch (e) {}

}


        if (combinedStream) {

          combinedStream
            .getTracks()
            .forEach(track => {

              try {
                track.stop();
              } catch (e) {}

            });

        }


        if (videoStream) {

          videoStream
            .getTracks()
            .forEach(track => {

              try {
                track.stop();
              } catch (e) {}

            });

        }


        if (audioContext) {

          try {

            await audioContext.close();

          } catch (e) {}

        }


        exportVoiceVideo.disabled =
          false;

        startVoiceRecording.disabled =
          false;

        stopVoiceRecording.disabled =
          true;

      }

    }
  );

})();
// ============================================
// FFMPEG MP4 SUPPORT
// ============================================

let ffmpegReady = false;

async function loadFFmpeg() {
  if (ffmpegReady) return;

  console.log("FFmpeg loading...");

  // MP4 conversion will be connected in next step
  ffmpegReady = true;

  console.log("FFmpeg ready");
}

// ============================================
// SIGNUP + LOGIN
// ============================================

(() => {

  const studioElements =
    Array.from(document.body.children);

  // Create login screen
  const authScreen =
    document.createElement("div");

  authScreen.id = "authScreen";

  authScreen.innerHTML = `
    <div style="
      max-width:360px;
      margin:60px auto;
      padding:25px;
      text-align:center;
      border:1px solid #ccc;
      border-radius:12px;
      background:#fff;
    ">

      <h2 id="authTitle">Create Account</h2>

      <input
        type="text"
        id="authUsername"
        placeholder="Username"
        autocomplete="username"
        style="
          width:90%;
          padding:12px;
          margin:8px;
          box-sizing:border-box;
        "
      >

      <input
        type="password"
        id="authPassword"
        placeholder="Password"
        autocomplete="new-password"
        style="
          width:90%;
          padding:12px;
          margin:8px;
          box-sizing:border-box;
        "
      >

      <input
        type="password"
        id="authConfirmPassword"
        placeholder="Confirm Password"
        autocomplete="new-password"
        style="
          width:90%;
          padding:12px;
          margin:8px;
          box-sizing:border-box;
        "
      >

      <button
        id="authButton"
        type="button"
        style="
          padding:12px 25px;
          margin:10px;
        "
      >
        Sign Up
      </button>

      <p id="authStatus"></p>

      <button
        id="switchAuth"
        type="button"
        style="
          border:none;
          background:none;
          text-decoration:underline;
          cursor:pointer;
        "
      >
        Already have an account? Login
      </button>

    </div>
  `;

  document.body.appendChild(authScreen);

  // Hide Video Studio initially
  studioElements.forEach(element => {
    element.style.display = "none";
  });

  const authTitle =
    document.getElementById("authTitle");

  const authUsername =
    document.getElementById("authUsername");

  const authPassword =
    document.getElementById("authPassword");

  const authConfirmPassword =
    document.getElementById("authConfirmPassword");

  const authButton =
    document.getElementById("authButton");

  const authStatus =
    document.getElementById("authStatus");

  const switchAuth =
    document.getElementById("switchAuth");


  let signupMode = true;


  // --------------------------------------------
  // SWITCH SIGNUP / LOGIN
  // --------------------------------------------

  switchAuth.addEventListener(
    "click",
    () => {

      signupMode = !signupMode;

      authStatus.textContent = "";
      authUsername.value = "";
      authPassword.value = "";
      authConfirmPassword.value = "";

      if (signupMode) {

        authTitle.textContent =
          "Create Account";

        authButton.textContent =
          "Sign Up";

        authConfirmPassword.style.display =
          "block";

        switchAuth.textContent =
          "Already have an account? Login";

      } else {

        authTitle.textContent =
          "Login";

        authButton.textContent =
          "Login";

        authConfirmPassword.style.display =
          "none";

        switchAuth.textContent =
          "Don't have an account? Sign Up";

      }

    }
  );


  // --------------------------------------------
  // SIGNUP / LOGIN BUTTON
  // --------------------------------------------

  authButton.addEventListener(
    "click",
    () => {

      const username =
        authUsername.value.trim();

      const password =
        authPassword.value;

      const confirmPassword =
        authConfirmPassword.value;


      if (!username || !password) {

        authStatus.textContent =
          "Please enter username and password.";

        authStatus.style.color =
          "red";

        return;

      }


      if (signupMode) {

        // ----------------------------
        // SIGNUP
        // ----------------------------

        if (password.length < 4) {

          authStatus.textContent =
            "Password must be at least 4 characters.";

          authStatus.style.color =
            "red";

          return;

        }


        if (password !== confirmPassword) {

          authStatus.textContent =
            "Passwords do not match.";

          authStatus.style.color =
            "red";

          return;

        }


        const existingUser =
          localStorage.getItem(
            "videoStudioUser"
          );


        if (existingUser) {

          const user =
            JSON.parse(existingUser);

          if (
            user.username === username
          ) {

            authStatus.textContent =
              "Username already exists.";

            authStatus.style.color =
              "red";

            return;

          }

        }


        const user = {
          username: username,
          password: password
        };


        localStorage.setItem(
          "videoStudioUser",
          JSON.stringify(user)
        );


        authStatus.textContent =
          "Account created successfully ✅";

        authStatus.style.color =
          "green";


        // Switch to login
        setTimeout(() => {

          signupMode = false;

          authTitle.textContent =
            "Login";

          authButton.textContent =
            "Login";

          authConfirmPassword.style.display =
            "none";

          switchAuth.textContent =
            "Don't have an account? Sign Up";

          authPassword.value = "";
          authConfirmPassword.value = "";

        }, 800);


      } else {

        // ----------------------------
        // LOGIN
        // ----------------------------

        const savedUser =
          localStorage.getItem(
            "videoStudioUser"
          );


        if (!savedUser) {

          authStatus.textContent =
            "No account found. Please Sign Up first.";

          authStatus.style.color =
            "red";

          return;

        }


        const user =
          JSON.parse(savedUser);


        if (
          user.username === username &&
          user.password === password
        ) {

          sessionStorage.setItem(
            "videoStudioLoggedIn",
            "true"
          );


          authScreen.style.display =
            "none";


          studioElements.forEach(element => {
            element.style.display = "";
          });


          console.log(
            "Login successful ✅"
          );


        } else {

          authStatus.textContent =
            "❌ Incorrect username or password.";

          authStatus.style.color =
            "red";

        }

      }

    }
  );


  // --------------------------------------------
  // AUTO LOGIN
  // --------------------------------------------

  if (
    sessionStorage.getItem(
      "videoStudioLoggedIn"
    ) === "true"
  ) {

    authScreen.style.display =
      "none";

    studioElements.forEach(element => {
      element.style.display = "";
    });

  }

})();
  
