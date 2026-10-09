
let activeTabId = null;
let refreshInterval = null;

function parseTime(value) {
    const parts = value.trim().split(":");

    if (
        parts.length < 1 ||
        parts.length > 3 ||
        parts.some(part => part === "" || !/^\d+(\.\d+)?$/.test(part))
    ) {
        return NaN;
    }

    const numbers = parts.map(Number);

    if (numbers.some(number => !Number.isFinite(number) || number < 0)) {
        return NaN;
    }

    if (parts.length === 1) return numbers[0];

    if (parts.length === 2) {
        if (numbers[1] >= 60) return NaN;
        return numbers[0] * 60 + numbers[1];
    }

    if (numbers[1] >= 60 || numbers[2] >= 60) return NaN;

    return numbers[0] * 3600 + numbers[1] * 60 + numbers[2];
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";

    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;

    if (hours > 0) {
        return [
            String(hours).padStart(2, "0"),
            String(minutes).padStart(2, "0"),
            String(remainingSeconds).padStart(2, "0")
        ].join(":");
    }

    return [
        String(minutes).padStart(2, "0"),
        String(remainingSeconds).padStart(2, "0")
    ].join(":");
}

function setMessage(message) {
    document.getElementById("message").textContent = message;
}

function setStatus(message, connected) {
    document.getElementById("statusText").textContent = message;
    document.getElementById("statusDot").style.background =
        connected ? "#55cc88" : "#8b8798";
}

function sendToPage(message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(activeTabId, message, response => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(response);
        });
    });
}

async function getVideoInfo(showErrors = false) {
    try {
        const response = await sendToPage({ action: "getVideoInfo" });

        if (!response?.success) {
            setStatus("No supported video detected", false);
            document.getElementById("currentTime").textContent = "--:--";
            document.getElementById("duration").textContent = "--:--";

            if (showErrors) {
                setMessage(response?.message || "No video found.");
            }

            return null;
        }

        setStatus("Video detected", true);
        document.getElementById("currentTime").textContent =
            formatTime(response.currentTime);
        document.getElementById("duration").textContent =
            formatTime(response.duration);

        const speed = document.getElementById("playbackRate");
        const availableSpeed = [...speed.options].some(
            option => Number(option.value) === response.playbackRate
        );

        speed.value = availableSpeed
            ? String(response.playbackRate)
            : "1";

        return response;
    } catch {
        setStatus("Page unavailable — reopen the extension", false);

        if (showErrors) {
            setMessage("This page may not allow extension scripts.");
        }

        return null;
    }
}

async function captureTime(fieldId) {
    const info = await getVideoInfo(true);

    if (!info) return;

    document.getElementById(fieldId).value =
        formatTime(info.currentTime);

    setMessage(
        `${fieldId === "startTime" ? "Start" : "End"} set to ${formatTime(info.currentTime)}`
    );
}

async function startLoop() {
    const start = parseTime(document.getElementById("startTime").value);
    const end = parseTime(document.getElementById("endTime").value);
    const repeatCount = Number(document.getElementById("repeatCount").value);
    const infinite = document.getElementById("infiniteLoop").checked;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        setMessage("Enter valid timestamps (MM:SS or HH:MM:SS).");
        return;
    }

    if (end <= start) {
        setMessage("End time must be greater than start time.");
        return;
    }

    if (
        !infinite &&
        (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 999)
    ) {
        setMessage("Choose between 1 and 999 repetitions.");
        return;
    }

    const info = await getVideoInfo(true);

    if (!info) return;

    if (!Number.isFinite(info.duration) || end > info.duration) {
        setMessage("The end time exceeds the available video duration.");
        return;
    }

    try {
        const response = await sendToPage({
            action: "startLoop",
            start,
            end,
            repeatCount,
            infinite
        });

        setMessage(response?.message || "Unable to start loop.");
    } catch {
        setMessage("Unable to control this video.");
    }
}

async function stopLoop() {
    try {
        const response = await sendToPage({ action: "stopLoop" });
        setMessage(response?.message || "Loop stopped.");
    } catch {
        setMessage("Unable to stop the loop.");
    }
}

async function changePlaybackRate() {
    const rate = Number(document.getElementById("playbackRate").value);

    try {
        const response = await sendToPage({
            action: "setPlaybackRate",
            rate
        });

        setMessage(response?.message || "Could not change playback speed.");
    } catch {
        setMessage("Unable to change playback speed on this page.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const tab = tabs[0];

    if (!tab?.id || !/^https?:/.test(tab.url || "")) {
        setStatus("Open a video webpage first", false);
        setMessage("Browser-internal pages cannot be controlled.");
        return;
    }

    activeTabId = tab.id;

    document.getElementById("startButton").addEventListener("click", startLoop);
    document.getElementById("stopButton").addEventListener("click", stopLoop);
    document.getElementById("setStartButton").addEventListener(
        "click",
        () => captureTime("startTime")
    );
    document.getElementById("setEndButton").addEventListener(
        "click",
        () => captureTime("endTime")
    );
    document.getElementById("refreshButton").addEventListener(
        "click",
        () => getVideoInfo(true)
    );
    document.getElementById("playbackRate")
        ?.addEventListener("change",changePlaybackRate);

    const infiniteCheckbox = document.getElementById("infiniteLoop");
    const repeatInput = document.getElementById("repeatCount");

    function updateRepeatInput() {
        repeatInput.disabled = infiniteCheckbox.checked;
    }

    infiniteCheckbox.addEventListener("change", updateRepeatInput);
    updateRepeatInput();

    await getVideoInfo(true);

    refreshInterval = setInterval(() => {
        if (activeTabId !== null) getVideoInfo(false);
    }, 1000);
});

window.addEventListener("unload", () => {
    if (refreshInterval !== null) {
        clearInterval(refreshInterval);
    }
});