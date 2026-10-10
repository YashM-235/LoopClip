let loopState = {
    active: false,
    start: 0,
    end: 0,
    loopsRemaining: 0,
    infinite: true
};

let currentVideo = null;
let timeUpdateHandler = null;
let loopCheckTimer = null;

function findVideo() {
    const videos = [...document.querySelectorAll("video")];

    if (!videos.length) return null;

    const visibleVideos = videos
        .filter(video => {
            const rect = video.getBoundingClientRect();

            return (
                video.isConnected &&
                rect.width > 0 &&
                rect.height > 0
            );
        })
        .sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();

            return (
                rectB.width * rectB.height -
                rectA.width * rectA.height
            );
        });

    return visibleVideos[0] || videos[0];
}

function getTargetVideo() {
    if (currentVideo?.isConnected) {
        return currentVideo;
    }

    return findVideo();
}

function removeLoopListener() {
    if (currentVideo && timeUpdateHandler) {
        currentVideo.removeEventListener(
            "timeupdate",
            timeUpdateHandler
        );

        currentVideo.removeEventListener(
            "seeking",
            timeUpdateHandler
        );
    }

    if (loopCheckTimer !== null) {
        clearInterval(loopCheckTimer);
        loopCheckTimer = null;
    }

    timeUpdateHandler = null;
}

function getVideoInfo() {
    const video = getTargetVideo();

    if (!video) {
        return {
            success: false,
            message: "No HTML5 video found on this page."
        };
    }

    return {
        success: true,
        currentTime: video.currentTime,
        duration: Number.isFinite(video.duration)
            ? video.duration
            : null,
        paused: video.paused,
        playbackRate: video.playbackRate
    };
}

function checkLoopBoundary(video) {
    if (
        !loopState.active ||
        currentVideo !== video ||
        !video.isConnected
    ) {
        return;
    }

    if (video.currentTime < loopState.end) {
        return;
    }

    if (!loopState.infinite) {
        loopState.loopsRemaining--;

        if (loopState.loopsRemaining <= 0) {
            // Finish on the selected endpoint.
            loopState.active = false;

            removeLoopListener();

            video.currentTime = loopState.end;
            video.pause();

            currentVideo = null;

            return;
        }
    }

    // Restart the selected segment.
    video.currentTime = loopState.start;
}

function startLoop(start, end, repeatCount, infinite) {
    const video = findVideo();

    if (!video) {
        return {
            success: false,
            message: "No HTML5 video found."
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
            message: "Enter a valid start and end time."
        };
    }

    if (
        !Number.isFinite(video.duration) ||
        end > video.duration
    ) {
        return {
            success: false,
            message: "End time exceeds the available video duration."
        };
    }

    if (
        !infinite &&
        (!Number.isInteger(repeatCount) || repeatCount < 1)
    ) {
        return {
            success: false,
            message: "Repetitions must be a positive whole number."
        };
    }

    // Clean up any previous loop before starting another.
    stopLoop();

    currentVideo = video;

    loopState = {
        active: true,
        start,
        end,
        // The initial playback counts as the first pass.
        loopsRemaining: infinite ? Infinity : repeatCount,
        infinite
    };

    timeUpdateHandler = () => {
        checkLoopBoundary(video);
    };

    video.addEventListener(
        "timeupdate",
        timeUpdateHandler
    );

    video.addEventListener(
        "seeking",
        timeUpdateHandler
    );

    // Additional boundary checks help when timeupdate events are too infrequent at faster playback rates.
    loopCheckTimer = setInterval(() => {
        checkLoopBoundary(video);
    }, 50);

    video.currentTime = start;

    video.play().catch(() => {
        // The website or browser may block playback.
    });

    return {
        success: true,
        message: "Loop started."
    };
}

function stopLoop() {
    loopState.active = false;

    removeLoopListener();

    currentVideo = null;

    return {
        success: true,
        message: "Loop stopped."
    };
}

function setPlaybackRate(rate) {
    const video = getTargetVideo();

    if (!video) {
        return {
            success: false,
            message: "No video found."
        };
    }

    if (
        !Number.isFinite(rate) ||
        rate < 0.25 ||
        rate > 4
    ) {
        return {
            success: false,
            message: "Invalid playback speed."
        };
    }

    video.playbackRate = rate;

    return {
        success: true,
        playbackRate: video.playbackRate,
        message: `Playback speed: ${video.playbackRate}x`
    };
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        try {
            let result;

            switch (message.action) {
                case "getVideoInfo":
                    result = getVideoInfo();
                    break;

                case "startLoop":
                    result = startLoop(
                        message.start,
                        message.end,
                        message.repeatCount,
                        message.infinite
                    );
                    break;

                case "stopLoop":
                    result = stopLoop();
                    break;

                case "setPlaybackRate":
                    result = setPlaybackRate(message.rate);
                    break;

                default:
                    result = {
                        success: false,
                        message: "Unknown action."
                    };
            }

            sendResponse(result);
        } catch (error) {
            sendResponse({
                success: false,
                message: error.message || "Unexpected error."
            });
        }

        return false;
    }
);