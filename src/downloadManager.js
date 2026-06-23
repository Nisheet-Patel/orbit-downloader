const { STATUS } = require('./constants');

// In-memory task queue: Map<url, Task>
// Task = { url, title, status, progress, speed, duration, errorMessage, filePath }

class DownloadManager {
  constructor() {
    this.tasks = new Map();
    this.activeDownloads = new Map();
  }

  addTask(url, { format = 'audio', quality = '320' } = {}) {
    const key = `${url}#${format}#${quality}`;
    if (this.tasks.has(key)) {
      return { added: false, reason: 'duplicate' };
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
      quality
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

  removeTask(key) {
    if (this.tasks.has(key)) {
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
        quality: task.quality
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
