// monitoring/static/monitoring/js/countdown.js

// Simple countdown manager so we don't create multiple timers.
const CountdownManager = (function () {
  let timerId = null;
  let current = 0;
  let onTimeout = null;
  let overlayEl = null;
  let countSpanEl = null;

  function init(overlayId, countSpanId, cancelBtnId, timeoutCallback) {
    overlayEl = document.getElementById(overlayId);
    countSpanEl = document.getElementById(countSpanId);
    onTimeout = timeoutCallback;

    const cancelBtn = document.getElementById(cancelBtnId);
    if (cancelBtn) {
      cancelBtn.addEventListener("click", cancel);
    }
  }

  function start(seconds) {
    if (!overlayEl || !countSpanEl) return;

    // If a countdown is already running, do nothing
    if (timerId !== null) {
      return;
    }

    current = seconds;
    countSpanEl.textContent = current;
    overlayEl.classList.remove("hidden");

    timerId = setInterval(() => {
      current -= 1;
      countSpanEl.textContent = current;

      if (current <= 0) {
        clearInterval(timerId);
        timerId = null;

        // hide overlay
        overlayEl.classList.add("hidden");

        // call callback ONCE when timer finishes
        if (typeof onTimeout === "function") {
          onTimeout();
        }
      }
    }, 1000);
  }

  function cancel() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    if (overlayEl) {
      overlayEl.classList.add("hidden");
    }
  }

  return {
    init,
    start,
    cancel,
  };
})();
