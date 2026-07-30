
import { FFMessageType } from "./const.js";
import { ERROR_TERMINATED, ERROR_NOT_LOADED } from "./errors.js";

let messageID = 0;

function getMessageID() {
  return messageID++;
}

export class FFmpeg {
  #worker = null;
  #resolves = {};
  #rejects = {};
  #logEventCallbacks = [];
  #progressEventCallbacks = [];

  loaded = false;

  #registerHandlers = () => {
    if (!this.#worker) return;

    this.#worker.onmessage = ({ data }) => {
      const { id, type, data: messageData } = data;

      switch (type) {
        case FFMessageType.LOAD:
          this.loaded = true;
          this.#resolves[id]?.(messageData);
          break;

        case FFMessageType.EXEC:
        case FFMessageType.FFPROBE:
        case FFMessageType.WRITE_FILE:
        case FFMessageType.READ_FILE:
        case FFMessageType.DELETE_FILE:
        case FFMessageType.RENAME:
        case FFMessageType.CREATE_DIR:
        case FFMessageType.LIST_DIR:
        case FFMessageType.DELETE_DIR:
        case FFMessageType.MOUNT:
        case FFMessageType.UNMOUNT:
          this.#resolves[id]?.(messageData);
          break;

        case FFMessageType.LOG:
          this.#logEventCallbacks.forEach((fn) => fn(messageData));
          break;

        case FFMessageType.PROGRESS:
          this.#progressEventCallbacks.forEach((fn) => fn(messageData));
          break;

        case FFMessageType.ERROR:
          this.#rejects[id]?.(messageData);
          break;
      }

      delete this.#resolves[id];
      delete this.#rejects[id];
    };
  };

  #send = ({ type, data }, trans = [], signal) => {
    if (!this.#worker) {
      return Promise.reject(ERROR_TERMINATED);
    }

    const id = getMessageID();

    return new Promise((resolve, reject) => {
      this.#resolves[id] = resolve;
      this.#rejects[id] = reject;

      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            delete this.#resolves[id];
            delete this.#rejects[id];
            reject(signal.reason);
          },
          { once: true }
        );
      }

      this.#worker.postMessage(
        {
          id,
          type,
          data
        },
        trans
      );
    });
  };

  load = async (config = {}) => {
    if (this.#worker) {
      return false;
    }

    const workerURL =
      config.classWorkerURL || "./worker.js";

    this.#worker = new Worker(workerURL, {
      type: "module"
    });

    this.#registerHandlers();

    await this.#send({
      type: FFMessageType.LOAD,
      data: config
    });

    return true;
  };

  exec = async (args, timeout = -1) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.EXEC,
      data: {
        args,
        timeout
      }
    });
  };

  ffprobe = async (args, timeout = -1) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.FFPROBE,
      data: {
        args,
        timeout
      }
    });
  };

  writeFile = async (path, data) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.WRITE_FILE,
      data: {
        path,
        data
      }
    });
  };

  readFile = async (path, encoding = "binary") => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.READ_FILE,
      data: {
        path,
        encoding
      }
    });
  };

  deleteFile = async (path) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.DELETE_FILE,
      data: {
        path
      }
    });
  };

  rename = async (oldPath, newPath) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.RENAME,
      data: {
        oldPath,
        newPath
      }
    });
  };

  createDir = async (path) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.CREATE_DIR,
      data: {
        path
      }
    });
  };

  listDir = async (path) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.LIST_DIR,
      data: {
        path
      }
    });
  };

  deleteDir = async (path) => {
    if (!this.loaded) {
      throw ERROR_NOT_LOADED;
    }

    return this.#send({
      type: FFMessageType.DELETE_DIR,
      data: {
        path
      }
    });
  };

  on = (event, callback) => {
    if (event === "log") {
      this.#logEventCallbacks.push(callback);
    }

    if (event === "progress") {
      this.#progressEventCallbacks.push(callback);
    }
  };

  off = (event, callback) => {
    if (event === "log") {
      this.#logEventCallbacks =
        this.#logEventCallbacks.filter((fn) => fn !== callback);
    }

    if (event === "progress") {
      this.#progressEventCallbacks =
        this.#progressEventCallbacks.filter((fn) => fn !== callback);
    }
  };

  terminate = () => {
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
      this.loaded = false;
    }
  };
}