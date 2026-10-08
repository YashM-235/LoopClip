let loopState = {
    active: false,
    start: 0,
    end: 0,
    loopsRemaining: 0,
    infinite: true
};

let currentVideo = null;
let timeUpdateHandler = null;


/* --------------------------------
   Find the best video element
--------------------------------- */

function findVideo() {
    const videos = Array.from(document.querySelectorAll("video"));

    if (videos.length === 0) {
        return null;
    }

    // Prefer a visible video
    const visibleVideo = videos.find(video => {
        const rect = video.getBoundingClientRect();

        return (
            rect.width > 0 &&
            rect.height > 0
        );
    });

    return visibleVideo || videos[0];
}


/* --------------------------------
   Remove previous listener
--------------------------------- */

function removeLoopListener() {
    if (currentVideo && timeUpdateHandler) {
        currentVideo.removeEventListener(
            "timeupdate",
            timeUpdateHandler
        );
    }

    timeUpdateHandler = null;
}


/* --------------------------------
   Start looping
--------------------------------- */

function startLoop(start, end, repeatCount, infinite) {
    const video = findVideo();

    if (!video) {
        return {
            success: false,
            message: "No video element found on this page."
        };
    }

    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start
    ) {
        return {
            success: false,
            message: "Invalid start or end time."
        };
    }

    if (
        Number.isFinite(video.duration) &&
        start >= video.duration
    ) {
        return {
            success: false,
            message: "Start time is beyond the video duration."
        };
    }

    removeLoopListener();

    currentVideo = video;

    loopState = {
        active: true,
        start,
        end,
        loopsRemaining: infinite ? Infinity : repeatCount,
        infinite
    };

    video.currentTime = start;

    timeUpdateHandler = () => {
        if (!loopState.active) {
            return;
        }

        if (video.currentTime >= loopState.end) {

            if (!loopState.infinite) {
                loopState.loopsRemaining--;

                if (loopState.loopsRemaining <= 0) {
                    stopLoop();
                    return;
                }
            }

            video.currentTime = loopState.start;
        }
    };

    video.addEventListener(
        "timeupdate",
        timeUpdateHandler
    );

    video.play().catch(() => {
        // Browser may block autoplay.
        // User can manually press play.
    });

    return {
        success: true,
        message: "Loop started."
    };
}


/* --------------------------------
   Stop looping
--------------------------------- */

function stopLoop() {
    loopState.active = false;

    removeLoopListener();

    return {
        success: true,
        message: "Loop stopped."
    };
}


/* --------------------------------
   Get video information
--------------------------------- */

function getVideoInfo() {
    const video = findVideo();

    if (!video) {
        return {
            success: false,
            message: "No video found."
        };
    }

    return {
        success: true,
        duration: Number.isFinite(video.duration)
            ? video.duration
            : null,
        currentTime: video.currentTime,
        paused: video.paused
    };
}


/* --------------------------------
   Message handling
--------------------------------- */

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message.action === "getVideoInfo") {
            sendResponse(getVideoInfo());
            return true;
        }

        if (message.action === "startLoop") {

            const result = startLoop(
                message.start,
                message.end,
                message.repeatCount,
                message.infinite
            );

            sendResponse(result);
            return true;
        }

        if (message.action === "stopLoop") {
            sendResponse(stopLoop());
            return true;
        }
    }
);