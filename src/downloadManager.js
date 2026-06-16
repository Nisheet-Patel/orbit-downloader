const { STATUS } = require('./constants');

// In-memory task queue: Map<url, Task>
// Task = { url, title, status, progress, speed, duration, errorMessage, filePath }

class DownloadManager {
  constructor() {
    this.tasks = new Map();
  }

  addTask(url) {
    if (this.tasks.has(url)) {
      return { added: false, reason: 'duplicate' };
    }
    this.tasks.set(url, {
      url,
      title: '',
      status: STATUS.PENDING,
      progress: 0,
      speed: '',
      duration: 0,
      errorMessage: '',
      filePath: ''
    });
    return { added: true };
  }

  removeTask(url) {
    return this.tasks.delete(url);
  }

  clearAll() {
    this.tasks.clear();
  }

  getAll() {
    return Array.from(this.tasks.values());
  }

  getTask(url) {
    return this.tasks.get(url);
  }

  updateTask(url, updates, webContents) {
    const task = this.tasks.get(url);
    if (!task) return null;

    const prevStatus = task.status;

    Object.assign(task, updates);

    // Push events to renderer if available
    if (webContents && !webContents.isDestroyed()) {
      // Always emit queue:taskUpdated for any status/title/etc change
      webContents.send('queue:taskUpdated', {
        url: task.url,
        title: task.title,
        duration: task.duration,
        status: task.status,
        errorMessage: task.errorMessage,
        filePath: task.filePath
      });

      // Emit queue:progress during active downloading
      if (task.status === STATUS.DOWNLOADING || (task.status === STATUS.CONVERTING && prevStatus !== STATUS.CONVERTING)) {
        webContents.send('queue:progress', {
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
