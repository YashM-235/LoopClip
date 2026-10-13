const NOTES_STORAGE_KEY = "loopclip_timestamp_notes";
let activeTab = null;
let currentPageKey = null;
let editingNoteId = null;

const $ = (id) => document.getElementById(id);

async function getActiveTab() {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    return tabs[0] || null;
}

function getPageKey(tab) {
    if (!tab?.url) return null;

    try {
        const url = new URL(tab.url);
        url.hash = "";
        return url.href;
    } catch {
        return tab.url;
    }
}

async function sendToContent(action, payload = {}) {
    if (!activeTab?.id) {
        throw new Error("No active browser tab found.");
    }

    return chrome.tabs.sendMessage(activeTab.id, {
        action,
        ...payload
    });
}

function formatTimestamp(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "00:00";
    }

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

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

function setStatus(elementId, message) {
    $(elementId).textContent = message;
}

async function getCurrentVideoInfo() {
    const result = await sendToContent("getVideoInfo");

    if (!result?.success) {
        throw new Error(
            result?.message || "Could not retrieve video information."
        );
    }

    return result;
}

async function loadAllNotes() {
    const data = await chrome.storage.local.get(NOTES_STORAGE_KEY);
    return data[NOTES_STORAGE_KEY] || {};
}

async function saveAllNotes(notesByPage) {
    await chrome.storage.local.set({
        [NOTES_STORAGE_KEY]: notesByPage
    });
}

async function getPageNotes() {
    if (!currentPageKey) return [];

    const notesByPage = await loadAllNotes();
    const notes = notesByPage[currentPageKey];

    return Array.isArray(notes) ? notes : [];
}

async function refreshVideoStatus() {
    try {
        const info = await getCurrentVideoInfo();

        const duration = info.duration === null
            ? "Duration unavailable"
            : `Duration: ${formatTimestamp(info.duration)}`;

        setStatus(
            "videoStatus",
            `Video detected · ${duration}`
        );

        const availableSpeeds = [
            ...$("speedSelect").options
        ].map((option) => Number(option.value));

        const matchingSpeed = availableSpeeds.find(
            (speed) => Math.abs(speed - info.playbackRate) < 0.001
        );

        if (matchingSpeed !== undefined) {
            $("speedSelect").value = String(matchingSpeed);
        }
    } catch (error) {
        setStatus(
            "videoStatus",
            error.message || "No compatible video detected."
        );
    }
}

function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.addEventListener("click", onClick);
    return button;
}

async function renderNotes() {
    const container = $("notesList");
    container.replaceChildren();

    let notes;

    try {
        notes = await getPageNotes();
    } catch {
        container.textContent = "Unable to load saved notes.";
        return;
    }

    notes.sort((a, b) => a.timestamp - b.timestamp);

    if (notes.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No notes saved for this page yet.";
        container.appendChild(empty);
        return;
    }

    for (const note of notes) {
        const card = document.createElement("article");
        card.className = "note-card";

        const top = document.createElement("div");
        top.className = "note-top";

        const timestamp = document.createElement("span");
        timestamp.className = "note-time";
        timestamp.textContent = formatTimestamp(note.timestamp);

        top.appendChild(timestamp);

        const text = document.createElement("p");
        text.className = "note-text";
        text.textContent = note.text;

        const actions = document.createElement("div");
        actions.className = "note-actions";

        actions.appendChild(
            createButton("Jump to time", "primary", async () => {
                try {
                    const result = await sendToContent("seekTo", {
                        timestamp: note.timestamp
                    });

                    if (!result?.success) {
                        throw new Error(
                            result?.message || "Unable to seek to this note."
                        );
                    }

                    setStatus(
                        "notesStatus",
                        `Jumped to ${formatTimestamp(note.timestamp)}.`
                    );
                } catch (error) {
                    setStatus(
                        "notesStatus",
                        error.message || "Unable to reach the video."
                    );
                }
            })
        );

        actions.appendChild(
            createButton("Edit", "secondary", () => {
                editingNoteId = note.id;
                $("noteText").value = note.text;
                $("saveNoteBtn").textContent = "Update Note";
                $("cancelEditBtn").classList.remove("hidden");
                $("noteText").focus();

                setStatus(
                    "notesStatus",
                    `Editing note at ${formatTimestamp(note.timestamp)}.`
                );
            })
        );

        actions.appendChild(
            createButton("Delete", "secondary", async () => {
                const confirmed = window.confirm(
                    "Delete this note permanently?"
                );

                if (!confirmed) return;

                try {
                    const notesByPage = await loadAllNotes();
                    const pageNotes = notesByPage[currentPageKey] || [];

                    notesByPage[currentPageKey] = pageNotes.filter(
                        (item) => item.id !== note.id
                    );

                    await saveAllNotes(notesByPage);

                    if (editingNoteId === note.id) {
                        resetEditor();
                    }

                    setStatus("notesStatus", "Note deleted.");
                    await renderNotes();
                } catch {
                    setStatus("notesStatus", "Unable to delete the note.");
                }
            })
        );

        card.append(top, text, actions);
        container.appendChild(card);
    }
}

function resetEditor() {
    editingNoteId = null;
    $("noteText").value = "";
    $("saveNoteBtn").textContent = "Save at Current Time";
    $("cancelEditBtn").classList.add("hidden");
}

async function saveNote() {
    const text = $("noteText").value.trim();

    if (!text) {
        setStatus("notesStatus", "Enter a note before saving.");
        $("noteText").focus();
        return;
    }

    if (!currentPageKey) {
        setStatus("notesStatus", "This page cannot store notes.");
        return;
    }

    $("saveNoteBtn").disabled = true;

    try {
        const notesByPage = await loadAllNotes();
        const pageNotes = notesByPage[currentPageKey] || [];

        if (editingNoteId) {
            const existingNote = pageNotes.find(
                (note) => note.id === editingNoteId
            );

            if (!existingNote) {
                throw new Error("The note could not be found.");
            }

            existingNote.text = text;
            existingNote.updatedAt = Date.now();

            await saveAllNotes(notesByPage);

            resetEditor();
            setStatus("notesStatus", "Note updated.");
        } else {
            const info = await getCurrentVideoInfo();

            pageNotes.push({
                id: crypto.randomUUID(),
                text,
                timestamp: info.currentTime,
                videoTitle: activeTab.title || "Untitled video",
                videoUrl: currentPageKey,
                createdAt: Date.now()
            });

            notesByPage[currentPageKey] = pageNotes;

            await saveAllNotes(notesByPage);

            resetEditor();
            setStatus(
                "notesStatus",
                `Note saved at ${formatTimestamp(info.currentTime)}.`
            );
        }

        await renderNotes();
    } catch (error) {
        setStatus(
            "notesStatus",
            error.message || "Unable to save the note."
        );
    } finally {
        $("saveNoteBtn").disabled = false;
    }
}

async function setTimestampField(fieldId) {
    try {
        const info = await getCurrentVideoInfo();
        $(fieldId).value = info.currentTime.toFixed(2);
        setStatus(
            "loopStatus",
            `Timestamp set to ${formatTimestamp(info.currentTime)}.`
        );
    } catch (error) {
        setStatus("loopStatus", error.message);
    }
}

async function startLoop() {
    const start = Number($("startTime").value);
    const end = Number($("endTime").value);
    const repeatCount = Number($("repeatCount").value);
    const infinite = $("infiniteLoop").checked;

    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start
    ) {
        setStatus("loopStatus", "Enter a valid start and end time.");
        return;
    }

    if (
        !infinite &&
        (!Number.isInteger(repeatCount) || repeatCount < 1)
    ) {
        setStatus(
            "loopStatus",
            "Repetitions must be a positive whole number."
        );
        return;
    }

    try {
        const result = await sendToContent("startLoop", {
            start,
            end,
            repeatCount,
            infinite
        });

        setStatus(
            "loopStatus",
            result?.message || "Loop request completed."
        );
    } catch (error) {
        setStatus(
            "loopStatus",
            error.message || "Unable to start the loop."
        );
    }
}

async function stopLoop() {
    try {
        const result = await sendToContent("stopLoop");

        setStatus(
            "loopStatus",
            result?.message || "Loop stopped."
        );
    } catch (error) {
        setStatus(
            "loopStatus",
            error.message || "Unable to stop the loop."
        );
    }
}

async function changePlaybackRate() {
    const rate = Number($("speedSelect").value);

    try {
        const result = await sendToContent("setPlaybackRate", { rate });

        if (!result?.success) {
            throw new Error(
                result?.message || "Unable to change playback speed."
            );
        }

        setStatus("loopStatus", result.message);
    } catch (error) {
        setStatus(
            "loopStatus",
            error.message || "Unable to change playback speed."
        );
    }
}

async function initialize() {
    $("startLoop").addEventListener("click", startLoop);
    $("stopLoop").addEventListener("click", stopLoop);

    $("setStartNow").addEventListener(
        "click",
        () => setTimestampField("startTime")
    );

    $("setEndNow").addEventListener(
        "click",
        () => setTimestampField("endTime")
    );

    $("speedSelect").addEventListener("change", changePlaybackRate);
    $("saveNoteBtn").addEventListener("click", saveNote);

    $("cancelEditBtn").addEventListener("click", () => {
        resetEditor();
        setStatus("notesStatus", "Editing cancelled.");
    });

    $("infiniteLoop").addEventListener("change", () => {
        $("repeatCount").disabled = $("infiniteLoop").checked;
    });

    $("repeatCount").disabled = $("infiniteLoop").checked;

    try {
        activeTab = await getActiveTab();
        currentPageKey = getPageKey(activeTab);

        await refreshVideoStatus();
        await renderNotes();
    } catch (error) {
        setStatus(
            "videoStatus",
            error.message || "Unable to initialize LoopClip."
        );
    }
}

document.addEventListener("DOMContentLoaded", initialize);
