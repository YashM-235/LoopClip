let activeTabId = null;


/* --------------------------------
   Get active tab
--------------------------------- */

async function getActiveTab() {

    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    return tabs[0];
}


/* --------------------------------
   Convert timestamp to seconds
--------------------------------- */

function parseTime(value) {

    value = value.trim();

    if (!value) {
        return NaN;
    }

    const parts = value.split(":");

    if (parts.length === 1) {
        return Number(parts[0]);
    }

    if (parts.length === 2) {

        const minutes = Number(parts[0]);
        const seconds = Number(parts[1]);

        if (
            !Number.isFinite(minutes) ||
            !Number.isFinite(seconds)
        ) {
            return NaN;
        }

        return minutes * 60 + seconds;
    }

    if (parts.length === 3) {

        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        const seconds = Number(parts[2]);

        if (
            !Number.isFinite(hours) ||
            !Number.isFinite(minutes) ||
            !Number.isFinite(seconds)
        ) {
            return NaN;
        }

        return (
            hours * 3600 +
            minutes * 60 +
            seconds
        );
    }

    return NaN;
}


/* --------------------------------
   Format seconds
--------------------------------- */

function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {
        return "--:--";
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds =
        Math.floor(seconds % 60);

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}


/* --------------------------------
   UI helpers
--------------------------------- */

function setMessage(message) {
    document.getElementById("message").textContent =
        message;
}


function setStatus(message, connected) {

    document.getElementById("statusText").textContent =
        message;

    document.getElementById("statusDot").style.background =
        connected ? "#55cc77" : "#777";
}


/* --------------------------------
   Send message to content script
--------------------------------- */

function sendToPage(message) {

    return new Promise((resolve, reject) => {

        chrome.tabs.sendMessage(
            activeTabId,
            message,
            response => {

                if (chrome.runtime.lastError) {
                    reject(
                        chrome.runtime.lastError
                    );

                    return;
                }

                resolve(response);
            }
        );
    });
}


/* --------------------------------
   Detect video
--------------------------------- */

async function detectVideo() {

    try {

        const response =
            await sendToPage({
                action: "getVideoInfo"
            });

        if (!response || !response.success) {

            setStatus(
                "No video detected",
                false
            );

            return;
        }

        setStatus(
            "Video detected",
            true
        );

        if (response.duration) {

            const duration =
                formatTime(response.duration);

            setMessage(
                `Duration: ${duration}`
            );
        }

    } catch (error) {

        setStatus(
            "Video unavailable",
            false
        );
    }
}


/* --------------------------------
   Start loop
--------------------------------- */

async function startLoop() {

    const start =
        parseTime(
            document.getElementById(
                "startTime"
            ).value
        );

    const end =
        parseTime(
            document.getElementById(
                "endTime"
            ).value
        );

    const repeatCount =
        Number(
            document.getElementById(
                "repeatCount"
            ).value
        );

    const infinite =
        document.getElementById(
            "infiniteLoop"
        ).checked;


    if (!Number.isFinite(start)) {

        setMessage(
            "Enter a valid start time."
        );

        return;
    }


    if (!Number.isFinite(end)) {

        setMessage(
            "Enter a valid end time."
        );

        return;
    }


    if (end <= start) {

        setMessage(
            "End time must be greater than start."
        );

        return;
    }


    if (!infinite && repeatCount < 1) {

        setMessage(
            "Repetitions must be at least 1."
        );

        return;
    }


    try {

        const response =
            await sendToPage({

                action: "startLoop",

                start,
                end,

                repeatCount:
                    repeatCount,

                infinite
            });


        if (!response.success) {

            setMessage(
                response.message
            );

            return;
        }


        setMessage(
            `Looping ${formatTime(start)} → ${formatTime(end)}`
        );

    } catch (error) {

        setMessage(
            "Unable to control the video."
        );
    }
}


/* --------------------------------
   Stop loop
--------------------------------- */

async function stopLoop() {

    try {

        const response =
            await sendToPage({
                action: "stopLoop"
            });

        setMessage(
            response.message
        );

    } catch (error) {

        setMessage(
            "Unable to stop loop."
        );
    }
}


/* --------------------------------
   Initialization
--------------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const tab =
            await getActiveTab();

        if (!tab || !tab.id) {

            setStatus(
                "No active page",
                false
            );

            return;
        }

        activeTabId = tab.id;

        await detectVideo();


        document
            .getElementById("startButton")
            .addEventListener(
                "click",
                startLoop
            );


        document
            .getElementById("stopButton")
            .addEventListener(
                "click",
                stopLoop
            );


        document
            .getElementById("infiniteLoop")
            .addEventListener(
                "change",
                event => {

                    document
                        .getElementById(
                            "repeatCount"
                        )
                        .disabled =
                            event.target.checked;
                }
            );

    }
);