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

        if (
          recorder.state !== "inactive"
        ) {

          recorder.stop();

        }


        await finished;


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