# LoopClip

> **Replay the part of a video that actually matters.**

LoopClip is a lightweight browser extension that lets users select a specific portion of a video and replay it automatically.

Instead of repeatedly dragging the video timeline back to the same section, LoopClip turns that section into a simple loop.

## 🎯 Why LoopClip?

Sometimes you don't want to watch an entire video.

You may want to repeatedly listen to:

* 🎧 A section of a podcast
* 🎵 A part of a song
* 🎸 A guitar or music lesson
* 📚 A lecture explanation
* 🗣️ A pronunciation example
* 💻 A programming tutorial
* 🎬 A particular scene

LoopClip is designed for exactly these situations.

## 🚀 Current Prototype

Version `0.1.0` currently provides:

* Start timestamp
* End timestamp
* Infinite looping
* Fixed repetition count
* Start/Stop controls
* HTML5 video detection
* YouTube as the initial testing platform

YouTube is **not the core limitation of the project**. It is simply the first platform used to validate the prototype.

The long-term goal is to support video platforms that expose controllable HTML5 video elements.

## 🧩 How It Works

LoopClip does not download or host videos.

Instead, the extension communicates with the video element already present on the webpage.

```text
User
 │
 ▼
LoopClip Popup
 │
 ├── Start time
 ├── End time
 └── Repeat settings
 │
 ▼
Content Script
 │
 ▼
HTML5 <video>
 │
 ▼
Selected segment repeats
```

## 🛠️ Technology

* JavaScript
* HTML
* CSS
* Chrome Extension Manifest V3

No backend or database is required for the prototype.

## 🧪 Installing the Prototype

### 1. Clone the repository

```bash
git clone https://github.com/YashM-235/LoopClip.git
cd LoopClip
```

### 2. Open Chrome extensions

Open:

```text
chrome://extensions/
```

### 3. Enable Developer Mode

Turn on **Developer mode**.

### 4. Load the extension

Select:

```text
Load unpacked
```

and choose the `LoopClip` project directory.

### 5. Test

Open a video page containing an HTML5 video.

Click the LoopClip extension.

For example:

```text
Start: 01:20
End:   01:35
```

Enable **Infinite loop** and select:

```text
Start Loop
```

The selected section should replay automatically.

## 🗺️ Roadmap

### v0.1 - Working Prototype

* [x] Video detection
* [x] Start/end timestamps
* [x] Segment looping
* [x] Infinite loop
* [x] Fixed repetitions
* [x] YouTube testing

### v0.2 - Usability

* [ ] Current playback time button
* [ ] Set Start from current position
* [ ] Set End from current position
* [ ] Playback speed
* [ ] Better error handling
* [ ] Keyboard shortcuts

### v0.3 - Saved Loops

* [ ] Save loop segments
* [ ] Name saved segments
* [ ] Edit saved segments
* [ ] Local storage

### v0.4 - Platform Compatibility

* [ ] Improve generic HTML5 video detection
* [ ] Test multiple video websites
* [ ] Handle pages with multiple videos
* [ ] Improve dynamic video detection

### v1.0 - Public Demo

* [ ] Polished interface
* [ ] Custom extension icon
* [ ] Demo GIF/video
* [ ] Documentation
* [ ] Compatibility documentation
* [ ] Chrome/Edge testing

## 💡 Future Possibilities

Potential future features include:

* A/B loop controls
* Playback speed control
* Keyboard shortcuts
* Saved segments
* Shareable loop links
* Timestamp bookmarks
* Multiple loops per video
* Learning/practice mode
* Podcast-oriented controls
* Support for additional video platforms

## ⚠️ Current Limitations

LoopClip is an experimental prototype.

Compatibility depends on how a website implements its video player.

Some websites may:

* use multiple video elements
* use custom players
* dynamically replace video elements
* restrict script interaction
* use protected playback mechanisms

These cases will be addressed progressively as platform compatibility improves.

## Testing Stages

<img width="441" height="747" alt="image" src="https://github.com/user-attachments/assets/69e8cec2-bf69-41fc-9b94-b994463b1b59" />
<h3 align="center">v 0.2.0 </h3>

## 📄 License

MIT License.

Copyright (c) 2026 Yash

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
