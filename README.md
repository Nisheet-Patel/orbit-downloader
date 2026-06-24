# Orbit Downloader

Orbit Downloader is a modern, premium cross-platform media downloader supporting YouTube, Spotify, and other platforms. Built with Electron and HTML5/CSS3, it offers a dual-mode interface (Single vs. Bulk Download), interactive queue controls, real-time download speed trackers, and dynamic light/dark theme persistence.

It uses **yt-dlp** for metadata extraction and media fetching, and **FFmpeg** for high-quality audio extraction and video/audio merging.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: Version 18.x or later is recommended.
* **FFmpeg**: Required for audio conversion (e.g., MP3) and high-resolution video merging.

### Development Setup
1. Clone this repository to your local machine.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application in development mode:
   ```bash
   npm start
   ```

---

## 🛠️ Windows Packaging & Distribution

This release is configured with `electron-builder` to generate standard, release-ready Windows builds:
1. **NSIS Installer**: A clean, guided installation wizard that registers desktop and Start Menu shortcuts.
2. **Portable Executable**: A standalone `.exe` that runs instantly without installation.

### Bundled Binaries
To ensure zero-configuration setup for users, Orbit packages native Windows executables inside `extraResources`:
* **Location**: Place `yt-dlp.exe` and `ffmpeg.exe` inside the `bin/win/` directory of this repository.
* **Packaging**: When building, `electron-builder` copies these binaries into the packaged app's `resources/bin/` folder outside of the `app.asar` archive to keep them fully executable.
* **Resolution**: The app dynamically searches for these bundled binaries on startup using `process.resourcesPath` before falling back to system paths or remote auto-downloads.

### Build Commands
Run the following scripts in the project directory to compile and package the app:

* **Unpacked Directory Build** (For fast local testing):
  ```bash
  npm run pack
  ```
  Creates an unpacked, runnable version of the application inside `dist/win-unpacked/`.

* **Windows Distribution Build** (Generates NSIS installer & Portable builds):
  ```bash
  npm run dist:win
  ```
  Outputs installer executables (`.exe`) to the `dist/` directory.

* **All Hosts Distribution Build**:
  ```bash
  npm run dist
  ```

---

## 🍏 macOS Packaging Disclaimer

* **Unverified Status**: macOS builds (`.dmg` and `.zip` archives) have been configured in `package.json` but **have not been verified or tested** on a real macOS host.
* **macOS Host Requirement**: Building `.dmg` installers requires a macOS host or macOS-based CI server. If compiling macOS versions in the future, test the output executable on a real Mac.
* **Gatekeeper Workaround**: Unsigned macOS builds will trigger a security prompt ("Unidentified Developer"). Users can bypass this by right-clicking the `.app` package and selecting **Open**, or running `xattr -cr /path/to/Orbit.app` in the terminal.

---

## 📂 Application Data & Configuration

Orbit stores configuration settings (e.g., download folder location, active download history, dark mode preference) inside the system's standard user data folder:

* **Windows**: `%APPDATA%/orbit-downloader/` (corresponds to `C:\Users\<Username>\AppData\Roaming\orbit-downloader`)
* **macOS**: `~/Library/Application Support/orbit-downloader/`

To reset the application settings completely, close Orbit and delete the `config.json` file inside the corresponding folder above.

---

## 🔍 Troubleshooting

### 1. FFmpeg Not Found
If the app shows a warning status that FFmpeg is missing:
* **Manual Override**: Open **Settings** inside the application, paste the absolute path to your local `ffmpeg.exe` executable or its containing folder, and click **Save Settings**.
* **System Path**: Alternatively, add your FFmpeg installation `bin` folder to your Windows system `PATH` environment variable and restart Orbit.

### 2. Antivirus Flags yt-dlp or FFmpeg
On Windows, certain antivirus applications may flag auto-downloaded binaries or packaged resources:
* **Resolution**: Add an exclusion directory in your antivirus settings for Orbit's AppData directory: `%APPDATA%/orbit-downloader/bin/`.

### 3. YouTube Bot Block Errors
If downloads fail with errors asking to sign in or confirm you're not a bot:
* **Resolution**: Open **Settings**, select your primary web browser under **Cookies Source** (e.g. Chrome, Edge, Firefox), and click **Save**. Orbit will extract active cookies from your browser to bypass the bot detection.
