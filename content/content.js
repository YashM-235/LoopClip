
let loopState = {
    active: false,
    start: 0,
    end: 0,
    loopsRemaining: 0,
    infinite: true
};

let currentVideo = null;
let timeUpdateHandler = null;

function findVideo() {
    const videos = [...document.querySelectorAll("video")];

    if (!videos.length) return null;

    const visibleVideos = videos
        .filter(video => {
            const rect = video.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        })
        .sort((a, b) => {
            const areaA =
                a.getBoundingClientRect().width *
                a.getBoundingClientRect().height;

            const areaB =
                b.getBoundingClientRect().width *
                b.getBoundingClientRect().height;

            return areaB - areaA;
        });

    return visibleVideos[0] || videos[0];
}

function removeLoopListener() {
    if (currentVideo && timeUpdateHandler) {
        currentVideo.removeEventListener(
            "timeupdate",
            timeUpdateHandler
        );
    }

    timeUpdateHandler = null;
}

function getVideoInfo() {
    const video = findVideo();

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
        if (
            !loopState.active ||
            video.currentTime < loopState.end
        ) {
            return;
        }

        if (!loopState.infinite) {
            loopState.loopsRemaining--;

            if (loopState.loopsRemaining <= 0) {
                stopLoop();
                return;
            }
        }

        video.currentTime = loopState.start;
    };

    video.addEventListener("timeupdate", timeUpdateHandler);

    video.play().catch(() => {
        // Autoplay may be restricted by the website or browser.
    });

    return {
        success: true,
        message: "Loop started."
    };
}

function stopLoop() {
    loopState.active = false;
    removeLoopListener();

    return {
        success: true,
        message: "Loop stopped."
    };
}

function setPlaybackRate(rate) {
    const video = findVideo();

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
        message: `Playback speed: ${rate}x`
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