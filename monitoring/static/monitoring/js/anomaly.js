// monitoring/static/monitoring/js/anomaly.js

const Monitoring = (function () {
  const WINDOW_MS = 2500;
  const SAMPLE_INTERVAL_MS = 50;
  const MAX_SAMPLES = Math.ceil(WINDOW_MS / SAMPLE_INTERVAL_MS);

  let accelBuffer = [];
  let gyroBuffer = [];

  let watching = false;
  let sensitivity = "medium";
  let DOM = {};
  let alertAudio = null; // sound for alert

  function mag3(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
  }

  function computeFeatures() {
    if (accelBuffer.length === 0) return null;

    const mags = accelBuffer.map((s) => mag3(s.ax, s.ay, s.az));
    const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
    const variance =
      mags.reduce((a, b) => a + (b - mean) * (b - mean), 0) / mags.length;
    const max = Math.max(...mags);

    let jerkVals = [];
    for (let i = 1; i < mags.length; i++) {
      jerkVals.push(Math.abs(mags[i] - mags[i - 1]));
    }
    const meanJerk = jerkVals.length
      ? jerkVals.reduce((a, b) => a + b, 0) / jerkVals.length
      : 0;

    const gyros = gyroBuffer.map((s) => mag3(s.gx || 0, s.gy || 0, s.gz || 0));
    const gyroMean = gyros.length
      ? gyros.reduce((a, b) => a + b, 0) / gyros.length
      : 0;

    const peaks = mags.filter(
      (v) => v > mean + Math.sqrt(variance) * 1.5
    ).length;

    return {
      meanAcc: mean,
      varAcc: variance,
      maxAcc: max,
      meanJerk: meanJerk,
      gyroMean: gyroMean,
      peaks: peaks,
      samples: mags.length,
    };
  }

  function ruleEngine(features, sens) {
    if (!features) return false;

    let acc_peak_thresh = 25;
    let jerk_thresh = 6;

    if (sens === "low") {
      acc_peak_thresh = 35;
      jerk_thresh = 8;
    } else if (sens === "medium") {
      acc_peak_thresh = 20;
      jerk_thresh = 6;
    } else if (sens === "high") {
      acc_peak_thresh = 12;
      jerk_thresh = 3;
    }

    const peakDetected =
      features.maxAcc >= acc_peak_thresh || features.peaks >= 2;
    const jerkDetected = features.meanJerk >= jerk_thresh;

    return peakDetected || jerkDetected;
  }

  function mlClassifier(features) {
    if (!features) return 0;

    if (features.maxAcc > 18 && features.meanJerk > 5 && features.samples > 4) {
      return 1;
    }
    if (features.meanAcc < 1.2 && features.varAcc < 0.5 && features.samples >= 4) {
      return 1;
    }
    if (features.peaks >= 2 && features.gyroMean > 4) {
      return 1;
    }
    return 0;
  }

  function decideAnomaly(features) {
    const rule = ruleEngine(features, sensitivity);
    const ml = mlClassifier(features);

    if (rule && ml) return { flag: true, reason: "rule+ml" };
    if (rule && features.maxAcc > 28) return { flag: true, reason: "rule-strong" };

    // inactivity rule
    if (features.meanAcc < 0.8 && features.samples >= 30) {
      return { flag: true, reason: "inactivity" };
    }

    return { flag: false };
  }

  function pushAccel(t, ax, ay, az) {
    accelBuffer.push({ t, ax, ay, az });
    const cutoff = t - WINDOW_MS;
    accelBuffer = accelBuffer.filter((s) => s.t >= cutoff);
  }

  function pushGyro(t, gx, gy, gz) {
    gyroBuffer.push({ t, gx, gy, gz });
    const cutoff = t - WINDOW_MS;
    gyroBuffer = gyroBuffer.filter((s) => s.t >= cutoff);
  }

  let deviceMotionHandler = null;
  let deviceOrientationHandler = null;
  let lastLocation = null;
  let graphCtx = null,
    graphData = [];

  function start() {
    if (watching) return;
    watching = true;
    DOM.statusText.textContent = "Monitoring";

    deviceMotionHandler = (ev) => {
      const t = Date.now();
      const a =
        ev.accelerationIncludingGravity || ev.acceleration || { x: 0, y: 0, z: 0 };
      pushAccel(t, a.x || 0, a.y || 0, a.z || 0);
      if (ev.rotationRate)
        pushGyro(
          t,
          ev.rotationRate.alpha || 0,
          ev.rotationRate.beta || 0,
          ev.rotationRate.gamma || 0
        );
      DOM.accelVal.textContent = `${(a.x || 0).toFixed(2)}, ${(a.y || 0).toFixed(
        2
      )}, ${(a.z || 0).toFixed(2)}`;

      const features = computeFeatures();
      if (features) {
        graphTick(features.meanAcc);
        const decision = decideAnomaly(features);
        if (decision.flag) {
          triggerAnomaly({ features, reason: decision.reason });
        }
      }
    };

    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      DeviceMotionEvent.requestPermission()
        .then((response) => {
          if (response === "granted") {
            window.addEventListener("devicemotion", deviceMotionHandler);
          } else {
            DOM.statusText.textContent = "DeviceMotion permission denied";
          }
        })
        .catch((err) => {
          console.warn(err);
          DOM.statusText.textContent = "DeviceMotion not available";
        });
    } else {
      window.addEventListener("devicemotion", deviceMotionHandler);
    }

    deviceOrientationHandler = (ev) => {
      DOM.orientVal.textContent = `alpha:${ev.alpha?.toFixed(
        0
      )} beta:${ev.beta?.toFixed(0)} gamma:${ev.gamma?.toFixed(0)}`;
    };
    window.addEventListener("deviceorientation", deviceOrientationHandler);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lastLocation = pos.coords;
          DOM.locVal.textContent = `${pos.coords.latitude.toFixed(
            5
          )}, ${pos.coords.longitude.toFixed(5)}`;
        },
        (err) => {
          console.warn(err);
          DOM.locVal.textContent = "permission denied or unavailable";
        },
        { enableHighAccuracy: true }
      );
    }
  }

  function stop() {
    watching = false;
    DOM.statusText.textContent = "Idle";
    if (deviceMotionHandler)
      window.removeEventListener("devicemotion", deviceMotionHandler);
    if (deviceOrientationHandler)
      window.removeEventListener("deviceorientation", deviceOrientationHandler);
    accelBuffer = [];
    gyroBuffer = [];
    graphData = [];
    drawGraph();
    clearCountdown();
    stopAlertSound();
  }

  function graphTick(val) {
    graphData.push(val);
    if (graphData.length > 50) graphData.shift();
    drawGraph();
  }

  function drawGraph() {
    if (!graphCtx) return;
    const ctx = graphCtx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    graphData.forEach((v, i) => {
      const x = (i / Math.max(1, graphData.length - 1)) * w;
      const y = h - (Math.min(40, v) / 40) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#2c7be5";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ---------- Countdown & Alert Control ----------

  let countdownTimer = null;
  let countdownRemaining = 10;
  let pendingEvent = null;
  let cancelHandlerRef = null;

  // prevent instant re-trigger: only one alert every 30 seconds
  let lastAlertTime = 0;
  const ALERT_COOLDOWN_MS = 30000;
  let alertInProgress = false;

  function clearCountdown() {
    if (countdownTimer !== null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (DOM.countdownOverlay) {
      DOM.countdownOverlay.classList.add("hidden");
    }
    if (DOM.cancelBtn && cancelHandlerRef) {
      DOM.cancelBtn.removeEventListener("click", cancelHandlerRef);
      cancelHandlerRef = null;
    }
  }

  function stopAlertSound() {
    if (alertAudio) {
      alertAudio.pause();
      alertAudio.currentTime = 0;
      alertAudio.loop = false;
    }
  }

  function triggerAnomaly({ features, reason }) {
    if (!DOM.countdownOverlay || !DOM.countdown) return;

    const now = Date.now();

    // Cooldown: ignore anomalies if we recently had one
    if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
      return;
    }

    // if an alert is already running, do nothing
    if (alertInProgress) return;

    alertInProgress = true;
    pendingEvent = {
      features,
      reason,
      timestamp: new Date().toISOString(),
      location: lastLocation,
    };

    clearCountdown(); // safety

    countdownRemaining = 10;
    DOM.countdown.textContent = countdownRemaining.toString();
    DOM.countdownOverlay.classList.remove("hidden");

    // 🔊 start beep immediately when anomaly is detected
    if (alertAudio) {
      alertAudio.loop = true; // continuous until cancel or send
      alertAudio
        .play()
        .catch((err) => console.warn("Failed to play alert sound", err));
    }

    countdownTimer = setInterval(() => {
      countdownRemaining -= 1;
      DOM.countdown.textContent = countdownRemaining.toString();

      if (countdownRemaining <= 0) {
        // countdown finished, send alert
        clearCountdown();
        stopAlertSound(); // stop beep
        lastAlertTime = Date.now();
        sendEventToServer(pendingEvent);
        DOM.lastEvent.textContent = pendingEvent.reason;
        alertInProgress = false;
        pendingEvent = null;
      }
    }, 1000);

    const cancelHandler = () => {
      // user is OK
      clearCountdown();
      stopAlertSound();                    // stop beep on cancel
      lastAlertTime = Date.now();          // also start cooldown
      pendingEvent = null;
      alertInProgress = false;
      DOM.statusText.textContent = "Monitoring (cancelled)";
    };

    cancelHandlerRef = cancelHandler;
    DOM.cancelBtn.addEventListener("click", cancelHandler);
  }

  async function sendEventToServer(eventObj) {
    if (!eventObj) return;

    const payload = {
      userId: null,
      eventType:
        eventObj.reason && eventObj.reason.includes("inactivity")
          ? "inactivity"
          : "fall",
      timestamp: eventObj.timestamp,
      location: eventObj.location
        ? {
            lat: eventObj.location.latitude,
            lng: eventObj.location.longitude,
          }
        : {},
      simulated: false,
      raw: eventObj.features,
    };

    try {
      await apiPost("/api/events/", payload);
      DOM.statusText.textContent = "Alert sent";
    } catch (e) {
      console.error("failed to send event (demo only)", e);
      DOM.statusText.textContent = "Alert sent (demo mode)";
    }
  }

  // ---------- Initialization ----------

  function init(opts) {
    DOM.startBtn = document.getElementById(opts.startBtnId);
    DOM.stopBtn = document.getElementById(opts.stopBtnId);
    DOM.statusText = document.getElementById(opts.statusTextId);
    DOM.accelVal = document.getElementById(opts.accelValId);
    DOM.gyroVal = document.getElementById(opts.gyroValId);
    DOM.orientVal = document.getElementById(opts.orientValId);
    DOM.locVal = document.getElementById(opts.locValId);
    DOM.lastEvent = document.getElementById(opts.lastEventId);
    const gv = document.getElementById(opts.graphCanvasId);
    if (gv) graphCtx = gv.getContext("2d");

    DOM.sensitivity = document.getElementById(opts.sensitivityId);
    DOM.countdownOverlay = document.getElementById(opts.countdownOverlayId);
    DOM.cancelBtn = document.getElementById(opts.cancelBtnId);
    DOM.countdown = document.getElementById(opts.countdownId);

    // prepare alert audio
    try {
      alertAudio = new Audio(
        "/static/monitoring/sound/censor-beep-10-seconds-8113.mp3"
      );
    } catch (e) {
      console.warn("Could not create alert audio", e);
    }

    // Start button
    DOM.startBtn.addEventListener("click", () => {
      sensitivity = DOM.sensitivity.value || "medium";
      start();
      DOM.startBtn.disabled = true;
      DOM.stopBtn.disabled = false;

      // Unlock audio (required on mobile)
      if (alertAudio) {
        alertAudio
          .play()
          .then(() => {
            alertAudio.pause();
            alertAudio.currentTime = 0;
          })
          .catch((err) => {
            console.warn("Alert audio not allowed yet:", err);
          });
      }
    });

    // Stop button
    DOM.stopBtn.addEventListener("click", () => {
      stop();
      DOM.startBtn.disabled = false;
      DOM.stopBtn.disabled = true;
    });
  }

  return { init, start, stop };
})();
