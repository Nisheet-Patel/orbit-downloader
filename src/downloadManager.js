const { STATUS } = require('./constants');

// In-memory task queue: Map<url, Task>
// Task = { url, title, status, progress, speed, duration, errorMessage, filePath }

class DownloadManager {
  constructor() {
    this.tasks = new Map();
    this.activeDownloads = new Map();
  }

  addTask(url, { format = 'audio', quality = '320', playlistId = null, platform = 'youtube', startTime, endTime } = {}) {
    const key = `${url}#${format}#${quality}`;
    if (this.tasks.has(key)) {
      const existing = this.tasks.get(key);
      if (playlistId && !existing.playlistId) {
        existing.playlistId = playlistId;
      }
      return { added: false, reason: 'duplicate', id: key };
    }
    const newTask = {
      id: key,
      url,
      title: '',
      status: STATUS.PENDING,
      progress: 0,
      speed: '',
      duration: 0,
      errorMessage: '',
      filePath: '',
      format,
      quality,
      playlistId,
      platform,
      startTime,
      endTime
    };
    // Prepend new task to insert at the top of the queue
    const newTasks = new Map();
    newTasks.set(key, newTask);
    for (const [k, v] of this.tasks.entries()) {
      newTasks.set(k, v);
    }
    this.tasks = newTasks;
    return { added: true, id: key };
  }

  addPlaylist(key, playlistUrl, title, format, quality, platform = 'youtube') {
    const newTask = {
      id: key,
      url: playlistUrl,
      title: title || 'Loading playlist...',
      status: STATUS.PENDING,
      progress: 0,
      speed: '0/0 downloaded',
      isPlaylist: true,
      videoIds: [],
      format,
      quality,
      platform
    };
    const newTasks = new Map();
    newTasks.set(key, newTask);
    for (const [k, v] of this.tasks.entries()) {
      newTasks.set(k, v);
    }
    this.tasks = newTasks;
    return newTask;
  }

  removeTask(key) {
    if (this.tasks.has(key)) {
      const task = this.tasks.get(key);
      if (task.isPlaylist && Array.isArray(task.videoIds)) {
        for (const childKey of task.videoIds) {
          const controller = this.activeDownloads.get(childKey);
          if (controller && typeof controller.kill === 'function') {
            try {
              controller.kill();
            } catch (_) {}
          }
          this.activeDownloads.delete(childKey);
          this.tasks.delete(childKey);
        }
      }

      const controller = this.activeDownloads.get(key);
      if (controller && typeof controller.kill === 'function') {
        try {
          controller.kill();
        } catch (err) {
          console.error(`Failed to kill process for key ${key}:`, err);
        }
      }
      this.activeDownloads.delete(key);
      return this.tasks.delete(key);
    }

    let deleted = false;
    for (const [tId, task] of this.tasks.entries()) {
      if (task.url === key || tId === key) {
        const controller = this.activeDownloads.get(tId);
        if (controller && typeof controller.kill === 'function') {
          try {
            controller.kill();
          } catch (_) {}
        }
        this.activeDownloads.delete(tId);
        this.tasks.delete(tId);
        deleted = true;
      }
    }
    return deleted;
  }

  clearAll() {
    for (const [key, controller] of this.activeDownloads.entries()) {
      if (controller && typeof controller.kill === 'function') {
        try {
          controller.kill();
        } catch (_) {}
      }
    }
    this.activeDownloads.clear();
    this.tasks.clear();
  }

  getAll() {
    return Array.from(this.tasks.values());
  }

  getTask(key) {
    if (this.tasks.has(key)) {
      return this.tasks.get(key);
    }
    for (const task of this.tasks.values()) {
      if (task.url === key) return task;
    }
    return null;
  }

  updateTask(key, updates, webContents) {
    let task = this.tasks.get(key);
    if (!task) {
      for (const t of this.tasks.values()) {
        if (t.url === key) {
          task = t;
          break;
        }
      }
    }
    if (!task) return null;

    const prevStatus = task.status;

    Object.assign(task, updates);

    // If this task belongs to a playlist, recalculate parent playlist progress & status
    if (task.playlistId && this.tasks.has(task.playlistId)) {
      const parent = this.tasks.get(task.playlistId);
      const children = Array.from(this.tasks.values()).filter(t => t.playlistId === task.playlistId);
      
      const total = children.length;
      if (total > 0) {
        const completed = children.filter(t => t.status === STATUS.COMPLETED || t.status === STATUS.ALREADY_EXISTS).length;
        const failed = children.filter(t => t.status === STATUS.ERROR).length;
        const downloading = children.filter(t => t.status === STATUS.DOWNLOADING || t.status === STATUS.CONVERTING || t.status === STATUS.EXTRACTING_INFO).length;
        
        let newStatus = STATUS.PENDING;
        if (completed === total) {
          newStatus = STATUS.COMPLETED;
        } else if (downloading > 0) {
          newStatus = STATUS.DOWNLOADING;
        } else if (completed + failed === total) {
          newStatus = STATUS.ERROR;
        } else if (completed > 0 || failed > 0) {
          newStatus = STATUS.DOWNLOADING;
        }

        const sumProgress = children.reduce((sum, c) => sum + (c.progress || 0), 0);
        const avgProgress = sumProgress / total;

        parent.progress = avgProgress;
        parent.status = newStatus;
        parent.speed = `${completed}/${total} downloaded`;

        if (webContents && !webContents.isDestroyed()) {
          webContents.send('queue:taskUpdated', {
            id: parent.id,
            url: parent.url,
            title: parent.title,
            duration: parent.duration,
            status: parent.status,
            errorMessage: parent.errorMessage,
            filePath: parent.filePath,
            format: parent.format,
            quality: parent.quality,
            isPlaylist: true,
            videoIds: parent.videoIds,
            progress: parent.progress,
            speed: parent.speed
          });
        }
      }
    }

    // Push events to renderer if available
    if (webContents && !webContents.isDestroyed()) {
      // Always emit queue:taskUpdated for any status/title/etc change
      webContents.send('queue:taskUpdated', {
        id: task.id,
        url: task.url,
        title: task.title,
        duration: task.duration,
        status: task.status,
        errorMessage: task.errorMessage,
        filePath: task.filePath,
        format: task.format,
        quality: task.quality,
        playlistId: task.playlistId
      });

      // Emit queue:progress during active downloading
      if (task.status === STATUS.DOWNLOADING || (task.status === STATUS.CONVERTING && prevStatus !== STATUS.CONVERTING)) {
        webContents.send('queue:progress', {
          id: task.id,
          url: task.url,
          status: task.status,
          progress: task.progress,
          speed: task.speed
        });
      }
    }

    return task;
  }
}

module.exports = { DownloadManager };
