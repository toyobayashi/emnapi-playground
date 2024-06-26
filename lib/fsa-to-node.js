(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["memfsFsaToNode"] = factory();
	else
		root["memfsFsaToNode"] = factory();
})((typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this)) || self, function() {
return /******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__(1)
module.exports.FsaNodeSyncWorker = __webpack_require__(103).FsaNodeSyncWorker


/***/ }),
/* 1 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeSyncAdapterWorker = exports.FsaNodeFs = void 0;
var FsaNodeFs_1 = __webpack_require__(2);
Object.defineProperty(exports, "FsaNodeFs", ({ enumerable: true, get: function () { return FsaNodeFs_1.FsaNodeFs; } }));
var FsaNodeSyncAdapterWorker_1 = __webpack_require__(81);
Object.defineProperty(exports, "FsaNodeSyncAdapterWorker", ({ enumerable: true, get: function () { return FsaNodeSyncAdapterWorker_1.FsaNodeSyncAdapterWorker; } }));
//# sourceMappingURL=index.js.map

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeFs = void 0;
const tslib_1 = __webpack_require__(3);
const optHelpers = __webpack_require__(4);
const util = __webpack_require__(38);
const buffer_1 = __webpack_require__(8);
const FsPromises_1 = __webpack_require__(41);
const util_1 = __webpack_require__(42);
const constants_1 = __webpack_require__(5);
const encoding_1 = __webpack_require__(7);
const FsaNodeDirent_1 = __webpack_require__(43);
const constants_2 = __webpack_require__(6);
const FsaNodeStats_1 = __webpack_require__(44);
const queueMicrotask_1 = __webpack_require__(39);
const FsaNodeWriteStream_1 = __webpack_require__(45);
const FsaNodeReadStream_1 = __webpack_require__(77);
const FsaNodeCore_1 = __webpack_require__(78);
const FileHandle_1 = __webpack_require__(80);
const notSupported = () => {
    throw new Error('Method not supported by the File System Access API.');
};
const notImplemented = () => {
    throw new Error('Not implemented');
};
const noop = () => { };
/**
 * Constructs a Node.js `fs` API from a File System Access API
 * [`FileSystemDirectoryHandle` object](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle).
 */
class FsaNodeFs extends FsaNodeCore_1.FsaNodeCore {
    constructor() {
        // ------------------------------------------------------------ FsPromisesApi
        super(...arguments);
        this.promises = new FsPromises_1.FsPromises(this, FileHandle_1.FileHandle);
        // ------------------------------------------------------------ FsCallbackApi
        this.open = (path, flags, a, b) => {
            let mode = a;
            let callback = b;
            if (typeof a === 'function') {
                mode = 438 /* MODE.DEFAULT */;
                callback = a;
            }
            mode = mode || 438 /* MODE.DEFAULT */;
            const modeNum = util.modeToNumber(mode);
            const filename = util.pathToFilename(path);
            const flagsNum = util.flagsToNumber(flags);
            this.__open(filename, flagsNum, modeNum).then(openFile => callback(null, openFile.fd), error => callback(error));
        };
        this.close = (fd, callback) => {
            util.validateFd(fd);
            this.__close(fd).then(() => callback(null), error => callback(error));
        };
        this.read = (fd, buffer, offset, length, position, callback) => {
            util.validateCallback(callback);
            // This `if` branch is from Node.js
            if (length === 0) {
                return (0, queueMicrotask_1.default)(() => {
                    if (callback)
                        callback(null, 0, buffer);
                });
            }
            (async () => {
                const openFile = await this.getFileByFd(fd, 'read');
                const file = await openFile.file.getFile();
                const src = await file.arrayBuffer();
                const slice = new Uint8Array(src, Number(position), Number(length));
                const dest = new Uint8Array(buffer.buffer, buffer.byteOffset + offset, slice.length);
                dest.set(slice, 0);
                return slice.length;
            })().then(bytesWritten => callback(null, bytesWritten, buffer), error => callback(error));
        };
        this.readFile = (id, a, b) => {
            const [opts, callback] = optHelpers.optsAndCbGenerator(optHelpers.getReadFileOptions)(a, b);
            const flagsNum = util.flagsToNumber(opts.flag);
            (async () => {
                let fd = typeof id === 'number' ? id : -1;
                const originalFd = fd;
                try {
                    if (fd === -1) {
                        const filename = util.pathToFilename(id);
                        fd = (await this.__open(filename, flagsNum, 0)).fd;
                    }
                    const handle = await this.__getFileById(fd, 'readFile');
                    const file = await handle.getFile();
                    const buffer = buffer_1.Buffer.from(await file.arrayBuffer());
                    return util.bufferToEncoding(buffer, opts.encoding);
                }
                finally {
                    try {
                        const idWasFd = typeof originalFd === 'number' && originalFd >= 0;
                        if (idWasFd)
                            await this.__close(originalFd);
                    }
                    catch (_a) { }
                }
            })()
                .then(data => callback(null, data))
                .catch(error => callback(error));
        };
        this.write = (fd, a, b, c, d, e) => {
            const [, asStr, buf, offset, length, position, cb] = util.getWriteArgs(fd, a, b, c, d, e);
            (async () => {
                const openFile = await this.getFileByFd(fd, 'write');
                const data = buf.subarray(offset, offset + length);
                await openFile.write(data, position);
                return length;
            })().then(bytesWritten => cb(null, bytesWritten, asStr ? a : buf), error => cb(error));
        };
        this.writev = (fd, buffers, a, b) => {
            util.validateFd(fd);
            let position = null;
            let callback;
            if (typeof a === 'function') {
                callback = a;
            }
            else {
                position = Number(a);
                callback = b;
            }
            util.validateCallback(callback);
            (async () => {
                const openFile = await this.getFileByFd(fd, 'writev');
                const length = buffers.length;
                let bytesWritten = 0;
                for (let i = 0; i < length; i++) {
                    const data = buffers[i];
                    await openFile.write(data, position);
                    bytesWritten += data.byteLength;
                    position = null;
                }
                return bytesWritten;
            })().then(bytesWritten => callback(null, bytesWritten, buffers), error => callback(error));
        };
        this.writeFile = (id, data, a, b) => {
            let options = a;
            let callback = b;
            if (typeof a === 'function') {
                options = optHelpers.writeFileDefaults;
                callback = a;
            }
            const cb = util.validateCallback(callback);
            const opts = optHelpers.getWriteFileOptions(options);
            const flagsNum = util.flagsToNumber(opts.flag);
            const modeNum = util.modeToNumber(opts.mode);
            const buf = util.dataToBuffer(data, opts.encoding);
            (async () => {
                let fd = typeof id === 'number' ? id : -1;
                const originalFd = fd;
                try {
                    if (fd === -1) {
                        const filename = util.pathToFilename(id);
                        fd = (await this.__open(filename, flagsNum, modeNum)).fd;
                    }
                    const file = await this.__getFileById(fd, 'writeFile');
                    const writable = await file.createWritable({ keepExistingData: false });
                    await writable.write(buf);
                    await writable.close();
                }
                finally {
                    try {
                        const idWasFd = typeof originalFd === 'number' && originalFd >= 0;
                        if (idWasFd)
                            await this.__close(originalFd);
                    }
                    catch (_a) { }
                }
            })().then(() => cb(null), error => cb(error));
        };
        this.copyFile = (src, dest, a, b) => {
            const srcFilename = util.pathToFilename(src);
            const destFilename = util.pathToFilename(dest);
            let flags;
            let callback;
            if (typeof a === 'function') {
                flags = 0;
                callback = a;
            }
            else {
                flags = a;
                callback = b;
            }
            util.validateCallback(callback);
            const [oldFolder, oldName] = (0, util_1.pathToLocation)(srcFilename);
            const [newFolder, newName] = (0, util_1.pathToLocation)(destFilename);
            (async () => {
                const oldFile = await this.getFile(oldFolder, oldName, 'copyFile');
                const newDir = await this.getDir(newFolder, false, 'copyFile');
                const newFile = await newDir.getFileHandle(newName, { create: true });
                const writable = await newFile.createWritable({ keepExistingData: false });
                const oldData = await oldFile.getFile();
                await writable.write(await oldData.arrayBuffer());
                await writable.close();
            })().then(() => callback(null), error => callback(error));
        };
        /**
         * @todo There is a proposal for native "self remove" operation.
         * @see https://github.com/whatwg/fs/blob/main/proposals/Remove.md
         */
        this.unlink = (path, callback) => {
            const filename = util.pathToFilename(path);
            const [folder, name] = (0, util_1.pathToLocation)(filename);
            this.getDir(folder, false, 'unlink')
                .then(dir => dir.removeEntry(name))
                .then(() => callback(null), error => {
                if (error && typeof error === 'object') {
                    switch (error.name) {
                        case 'NotFoundError': {
                            callback(util.createError('ENOENT', 'unlink', filename));
                            return;
                        }
                        case 'InvalidModificationError': {
                            callback(util.createError('EISDIR', 'unlink', filename));
                            return;
                        }
                    }
                }
                callback(error);
            });
        };
        this.realpath = (path, a, b) => {
            const [opts, callback] = optHelpers.getRealpathOptsAndCb(a, b);
            let pathFilename = util.pathToFilename(path);
            if (pathFilename[0] !== "/" /* FsaToNodeConstants.Separator */)
                pathFilename = "/" /* FsaToNodeConstants.Separator */ + pathFilename;
            callback(null, (0, encoding_1.strToEncoding)(pathFilename, opts.encoding));
        };
        this.stat = (path, a, b) => {
            const [{ bigint = false, throwIfNoEntry = true }, callback] = optHelpers.getStatOptsAndCb(a, b);
            const filename = util.pathToFilename(path);
            const [folder, name] = (0, util_1.pathToLocation)(filename);
            (async () => {
                const handle = await this.getFileOrDir(folder, name, 'stat');
                return await this.getHandleStats(bigint, handle);
            })().then(stats => callback(null, stats), error => callback(error));
        };
        this.lstat = this.stat;
        this.fstat = (fd, a, b) => {
            const [{ bigint = false, throwIfNoEntry = true }, callback] = optHelpers.getStatOptsAndCb(a, b);
            (async () => {
                const openFile = await this.getFileByFd(fd, 'fstat');
                return await this.getHandleStats(bigint, openFile.file);
            })().then(stats => callback(null, stats), error => callback(error));
        };
        /**
         * @todo There is a proposal for native move support.
         * @see https://github.com/whatwg/fs/blob/main/proposals/MovingNonOpfsFiles.md
         */
        this.rename = (oldPath, newPath, callback) => {
            const oldPathFilename = util.pathToFilename(oldPath);
            const newPathFilename = util.pathToFilename(newPath);
            const [oldFolder, oldName] = (0, util_1.pathToLocation)(oldPathFilename);
            const [newFolder, newName] = (0, util_1.pathToLocation)(newPathFilename);
            (async () => {
                const oldFile = await this.getFile(oldFolder, oldName, 'rename');
                const newDir = await this.getDir(newFolder, false, 'rename');
                const newFile = await newDir.getFileHandle(newName, { create: true });
                const writable = await newFile.createWritable({ keepExistingData: false });
                const oldData = await oldFile.getFile();
                await writable.write(await oldData.arrayBuffer());
                await writable.close();
                const oldDir = await this.getDir(oldFolder, false, 'rename');
                await oldDir.removeEntry(oldName);
            })().then(() => callback(null), error => callback(error));
        };
        this.exists = (path, callback) => {
            const filename = util.pathToFilename(path);
            if (typeof callback !== 'function')
                throw Error(constants_1.ERRSTR.CB);
            this.access(path, 0 /* AMODE.F_OK */, error => callback(!error));
        };
        this.access = (path, a, b) => {
            let mode = 0 /* AMODE.F_OK */;
            let callback;
            if (typeof a !== 'function') {
                mode = a | 0; // cast to number
                callback = util.validateCallback(b);
            }
            else {
                callback = a;
            }
            const filename = util.pathToFilename(path);
            const [folder, name] = (0, util_1.pathToLocation)(filename);
            (async () => {
                const node = folder.length || name ? await this.getFileOrDir(folder, name, 'access') : await this.root;
                const checkIfCanExecute = mode & 1 /* AMODE.X_OK */;
                if (checkIfCanExecute)
                    throw util.createError('EACCESS', 'access', filename);
                const checkIfCanWrite = mode & 2 /* AMODE.W_OK */;
                switch (node.kind) {
                    case 'file': {
                        if (checkIfCanWrite) {
                            try {
                                const file = node;
                                const writable = await file.createWritable();
                                await writable.close();
                            }
                            catch (_a) {
                                throw util.createError('EACCESS', 'access', filename);
                            }
                        }
                        break;
                    }
                    case 'directory': {
                        if (checkIfCanWrite) {
                            const dir = node;
                            const canWrite = await (0, util_1.testDirectoryIsWritable)(dir);
                            if (!canWrite)
                                throw util.createError('EACCESS', 'access', filename);
                        }
                        break;
                    }
                    default: {
                        throw util.createError('EACCESS', 'access', filename);
                    }
                }
            })().then(() => callback(null), error => callback(error));
        };
        this.appendFile = (id, data, a, b) => {
            const [opts, callback] = optHelpers.getAppendFileOptsAndCb(a, b);
            const buffer = util.dataToBuffer(data, opts.encoding);
            this.getFileByIdOrCreate(id, 'appendFile')
                .then(file => (async () => {
                const blob = await file.getFile();
                const writable = await file.createWritable({ keepExistingData: true });
                await writable.write({
                    type: 'write',
                    data: buffer,
                    position: blob.size,
                });
                await writable.close();
            })())
                .then(() => callback(null), error => callback(error));
        };
        this.readdir = (path, a, b) => {
            const [options, callback] = optHelpers.getReaddirOptsAndCb(a, b);
            const filename = util.pathToFilename(path);
            const [folder, name] = (0, util_1.pathToLocation)(filename);
            if (name)
                folder.push(name);
            this.getDir(folder, false, 'readdir')
                .then(dir => (async () => {
                var _a, e_1, _b, _c, _d, e_2, _e, _f;
                if (options.withFileTypes) {
                    const list = [];
                    try {
                        for (var _g = true, _h = tslib_1.__asyncValues(dir.entries()), _j; _j = await _h.next(), _a = _j.done, !_a; _g = true) {
                            _c = _j.value;
                            _g = false;
                            const [name, handle] = _c;
                            const dirent = new FsaNodeDirent_1.FsaNodeDirent(name, handle.kind);
                            list.push(dirent);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_g && !_a && (_b = _h.return)) await _b.call(_h);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    if (!util.isWin && options.encoding !== 'buffer')
                        list.sort((a, b) => {
                            if (a.name < b.name)
                                return -1;
                            if (a.name > b.name)
                                return 1;
                            return 0;
                        });
                    return list;
                }
                else {
                    const list = [];
                    try {
                        for (var _k = true, _l = tslib_1.__asyncValues(dir.keys()), _m; _m = await _l.next(), _d = _m.done, !_d; _k = true) {
                            _f = _m.value;
                            _k = false;
                            const key = _f;
                            list.push(key);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (!_k && !_d && (_e = _l.return)) await _e.call(_l);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    if (!util.isWin && options.encoding !== 'buffer')
                        list.sort();
                    return list;
                }
            })())
                .then(res => callback(null, res), err => callback(err));
        };
        this.readlink = (path, a, b) => {
            const [opts, callback] = optHelpers.getDefaultOptsAndCb(a, b);
            const filename = util.pathToFilename(path);
            const buffer = buffer_1.Buffer.from(filename);
            callback(null, util.bufferToEncoding(buffer, opts.encoding));
        };
        /** @todo Could this use `FileSystemSyncAccessHandle.flush` through a Worker thread? */
        this.fsync = (fd, callback) => {
            callback(null);
        };
        this.fdatasync = (fd, callback) => {
            callback(null);
        };
        this.ftruncate = (fd, a, b) => {
            const len = typeof a === 'number' ? a : 0;
            const callback = util.validateCallback(typeof a === 'number' ? b : a);
            this.getFileByFdAsync(fd)
                .then(file => file.file.createWritable({ keepExistingData: true }))
                .then(writable => writable.truncate(len).then(() => writable.close()))
                .then(() => callback(null), error => callback(error));
        };
        this.truncate = (path, a, b) => {
            const len = typeof a === 'number' ? a : 0;
            const callback = util.validateCallback(typeof a === 'number' ? b : a);
            this.open(path, 'r+', (error, fd) => {
                if (error)
                    callback(error);
                else {
                    this.ftruncate(fd, len, error => {
                        if (error)
                            this.close(fd, () => callback(error));
                        else
                            this.close(fd, callback);
                    });
                }
            });
        };
        this.futimes = (fd, atime, mtime, callback) => {
            callback(null);
        };
        this.utimes = (path, atime, mtime, callback) => {
            callback(null);
        };
        this.mkdir = (path, a, b) => {
            var _a;
            const opts = optHelpers.getMkdirOptions(a);
            const callback = util.validateCallback(typeof a === 'function' ? a : b);
            // const modeNum = modeToNumber(opts.mode, 0o777);
            const filename = util.pathToFilename(path);
            const [folder, name] = (0, util_1.pathToLocation)(filename);
            // TODO: need to throw if directory already exists
            this.getDir(folder, (_a = opts.recursive) !== null && _a !== void 0 ? _a : false)
                .then(dir => dir.getDirectoryHandle(name, { create: true }))
                .then(() => callback(null), error => {
                if (error && typeof error === 'object') {
                    switch (error.name) {
                        case 'NotFoundError': {
                            const err = util.createError('ENOENT', 'mkdir', folder.join('/'));
                            callback(err);
                            return;
                        }
                    }
                }
                callback(error);
            });
        };
        this.mkdtemp = (prefix, a, b) => {
            const [{ encoding }, callback] = optHelpers.getDefaultOptsAndCb(a, b);
            if (!prefix || typeof prefix !== 'string')
                throw new TypeError('filename prefix is required');
            if (!util.nullCheck(prefix))
                return;
            const filename = prefix + util.genRndStr6();
            this.mkdir(filename, 511 /* MODE.DIR */, err => {
                if (err)
                    callback(err);
                else
                    callback(null, (0, encoding_1.strToEncoding)(filename, encoding));
            });
        };
        this.rmdir = (path, a, b) => {
            const options = optHelpers.getRmdirOptions(a);
            const callback = util.validateCallback(typeof a === 'function' ? a : b);
            const [folder, name] = (0, util_1.pathToLocation)(util.pathToFilename(path));
            if (!name && options.recursive)
                return this.rmAll(callback);
            this.getDir(folder, false, 'rmdir')
                .then(dir => dir.getDirectoryHandle(name).then(() => dir))
                .then(dir => { var _a; return dir.removeEntry(name, { recursive: (_a = options.recursive) !== null && _a !== void 0 ? _a : false }); })
                .then(() => callback(null), error => {
                if (error && typeof error === 'object') {
                    switch (error.name) {
                        case 'NotFoundError': {
                            const err = util.createError('ENOENT', 'rmdir', folder.join('/'));
                            callback(err);
                            return;
                        }
                        case 'InvalidModificationError': {
                            const err = util.createError('ENOTEMPTY', 'rmdir', folder.join('/'));
                            callback(err);
                            return;
                        }
                    }
                }
                callback(error);
            });
        };
        this.rm = (path, a, b) => {
            const [options, callback] = optHelpers.getRmOptsAndCb(a, b);
            const [folder, name] = (0, util_1.pathToLocation)(util.pathToFilename(path));
            if (!name && options.recursive)
                return this.rmAll(callback);
            this.getDir(folder, false, 'rmdir')
                .then(dir => { var _a; return dir.removeEntry(name, { recursive: (_a = options.recursive) !== null && _a !== void 0 ? _a : false }); })
                .then(() => callback(null), error => {
                if (options.force) {
                    callback(null);
                    return;
                }
                if (error && typeof error === 'object') {
                    switch (error.name) {
                        case 'NotFoundError': {
                            const err = util.createError('ENOENT', 'rmdir', folder.join('/'));
                            callback(err);
                            return;
                        }
                        case 'InvalidModificationError': {
                            const err = util.createError('ENOTEMPTY', 'rmdir', folder.join('/'));
                            callback(err);
                            return;
                        }
                    }
                }
                callback(error);
            });
        };
        this.fchmod = (fd, mode, callback) => {
            callback(null);
        };
        this.chmod = (path, mode, callback) => {
            callback(null);
        };
        this.lchmod = (path, mode, callback) => {
            callback(null);
        };
        this.fchown = (fd, uid, gid, callback) => {
            callback(null);
        };
        this.chown = (path, uid, gid, callback) => {
            callback(null);
        };
        this.lchown = (path, uid, gid, callback) => {
            callback(null);
        };
        this.createWriteStream = (path, options) => {
            var _a;
            const defaults = {
                encoding: 'utf8',
                flags: 'w',
                autoClose: true,
                emitClose: true,
            };
            const optionsObj = optHelpers.getOptions(defaults, options);
            const filename = util.pathToFilename(path);
            const flags = util.flagsToNumber((_a = optionsObj.flags) !== null && _a !== void 0 ? _a : 'w');
            const fd = optionsObj.fd ? (typeof optionsObj.fd === 'number' ? optionsObj.fd : optionsObj.fd.fd) : 0;
            const handle = fd ? this.getFileByFdAsync(fd) : this.__open(filename, flags, 0);
            const stream = new FsaNodeWriteStream_1.FsaNodeWriteStream(handle, filename, optionsObj);
            if (optionsObj.autoClose) {
                stream.once('finish', () => {
                    handle.then(file => this.close(file.fd, () => { }));
                });
                stream.once('error', () => {
                    handle.then(file => this.close(file.fd, () => { }));
                });
            }
            return stream;
        };
        this.createReadStream = (path, options) => {
            const defaults = {
                flags: 'r',
                fd: null,
                mode: 0o666,
                autoClose: true,
                emitClose: true,
                start: 0,
                end: Infinity,
                highWaterMark: 64 * 1024,
                fs: null,
                signal: null,
            };
            const optionsObj = optHelpers.getOptions(defaults, options);
            const filename = util.pathToFilename(path);
            const flags = util.flagsToNumber(optionsObj.flags);
            const fd = optionsObj.fd ? (typeof optionsObj.fd === 'number' ? optionsObj.fd : optionsObj.fd.fd) : 0;
            const handle = fd ? this.getFileByFdAsync(fd) : this.__open(filename, flags, 0);
            const stream = new FsaNodeReadStream_1.FsaNodeReadStream(this, handle, filename, optionsObj);
            return stream;
        };
        this.cp = notImplemented;
        this.lutimes = notImplemented;
        this.openAsBlob = notImplemented;
        this.opendir = notImplemented;
        this.readv = notImplemented;
        this.statfs = notImplemented;
        /**
         * @todo Watchers could be implemented in the future on top of `FileSystemObserver`,
         * which is currently a proposal.
         * @see https://github.com/whatwg/fs/blob/main/proposals/FileSystemObserver.md
         */
        this.watchFile = notSupported;
        this.unwatchFile = notSupported;
        this.watch = notSupported;
        this.symlink = notSupported;
        this.link = notSupported;
        // --------------------------------------------------------- FsSynchronousApi
        this.statSync = (path, options) => {
            var _a;
            const { bigint = true, throwIfNoEntry = true } = optHelpers.getStatOptions(options);
            const filename = util.pathToFilename(path);
            const location = (0, util_1.pathToLocation)(filename);
            const adapter = this.getSyncAdapter();
            const res = adapter.call('stat', location);
            const stats = new FsaNodeStats_1.FsaNodeStats(bigint, (_a = res.size) !== null && _a !== void 0 ? _a : 0, res.kind);
            return stats;
        };
        this.lstatSync = this.statSync;
        this.fstatSync = (fd, options) => {
            const filename = this.getFileName(fd);
            return this.statSync(filename, options);
        };
        this.accessSync = (path, mode = 0 /* AMODE.F_OK */) => {
            const filename = util.pathToFilename(path);
            mode = mode | 0;
            const adapter = this.getSyncAdapter();
            adapter.call('access', [filename, mode]);
        };
        this.readFileSync = (id, options) => {
            const opts = optHelpers.getReadFileOptions(options);
            const flagsNum = util.flagsToNumber(opts.flag);
            const filename = this.getFileName(id);
            const adapter = this.getSyncAdapter();
            const uint8 = adapter.call('readFile', [filename, opts]);
            const buffer = buffer_1.Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength);
            return util.bufferToEncoding(buffer, opts.encoding);
        };
        this.writeFileSync = (id, data, options) => {
            const opts = optHelpers.getWriteFileOptions(options);
            const flagsNum = util.flagsToNumber(opts.flag);
            const modeNum = util.modeToNumber(opts.mode);
            const buf = util.dataToBuffer(data, opts.encoding);
            const filename = this.getFileName(id);
            const adapter = this.getSyncAdapter();
            adapter.call('writeFile', [filename, util.bufToUint8(buf), opts]);
        };
        this.appendFileSync = (id, data, options) => {
            const opts = optHelpers.getAppendFileOpts(options);
            if (!opts.flag || util.isFd(id))
                opts.flag = 'a';
            const filename = this.getFileName(id);
            const buf = util.dataToBuffer(data, opts.encoding);
            const adapter = this.getSyncAdapter();
            adapter.call('appendFile', [filename, util.bufToUint8(buf), opts]);
        };
        this.closeSync = (fd) => {
            util.validateFd(fd);
            const file = this.getFileByFd(fd, 'close');
            file.close().catch(() => { });
            this.fds.delete(fd);
            this.releasedFds.push(fd);
        };
        this.existsSync = (path) => {
            try {
                this.statSync(path);
                return true;
            }
            catch (_a) {
                return false;
            }
        };
        this.copyFileSync = (src, dest, flags) => {
            const srcFilename = util.pathToFilename(src);
            const destFilename = util.pathToFilename(dest);
            const adapter = this.getSyncAdapter();
            adapter.call('copy', [srcFilename, destFilename, flags]);
        };
        this.renameSync = (oldPath, newPath) => {
            const srcFilename = util.pathToFilename(oldPath);
            const destFilename = util.pathToFilename(newPath);
            const adapter = this.getSyncAdapter();
            adapter.call('move', [srcFilename, destFilename]);
        };
        this.rmdirSync = (path, opts) => {
            const filename = util.pathToFilename(path);
            const adapter = this.getSyncAdapter();
            adapter.call('rmdir', [filename, opts]);
        };
        this.rmSync = (path, options) => {
            const filename = util.pathToFilename(path);
            const adapter = this.getSyncAdapter();
            adapter.call('rm', [filename, options]);
        };
        this.mkdirSync = (path, options) => {
            const opts = optHelpers.getMkdirOptions(options);
            const modeNum = util.modeToNumber(opts.mode, 0o777);
            const filename = util.pathToFilename(path);
            return this.getSyncAdapter().call('mkdir', [filename, options]);
        };
        this.mkdtempSync = (prefix, options) => {
            const { encoding } = optHelpers.getDefaultOpts(options);
            if (!prefix || typeof prefix !== 'string')
                throw new TypeError('filename prefix is required');
            util.nullCheck(prefix);
            const result = this.getSyncAdapter().call('mkdtemp', [prefix, options]);
            return (0, encoding_1.strToEncoding)(result, encoding);
        };
        this.readlinkSync = (path, options) => {
            const opts = optHelpers.getDefaultOpts(options);
            const filename = util.pathToFilename(path);
            const buffer = buffer_1.Buffer.from(filename);
            return util.bufferToEncoding(buffer, opts.encoding);
        };
        this.truncateSync = (id, len) => {
            if (util.isFd(id))
                return this.ftruncateSync(id, len);
            const filename = util.pathToFilename(id);
            this.getSyncAdapter().call('trunc', [filename, Number(len) || 0]);
        };
        this.ftruncateSync = (fd, len) => {
            const filename = this.getFileName(fd);
            this.truncateSync(filename, len);
        };
        this.unlinkSync = (path) => {
            const filename = util.pathToFilename(path);
            this.getSyncAdapter().call('unlink', [filename]);
        };
        this.readdirSync = (path, options) => {
            const opts = optHelpers.getReaddirOptions(options);
            const filename = util.pathToFilename(path);
            const adapter = this.getSyncAdapter();
            const list = adapter.call('readdir', [filename]);
            if (opts.withFileTypes) {
                const res = [];
                for (const entry of list)
                    res.push(new FsaNodeDirent_1.FsaNodeDirent(entry.name, entry.kind));
                return res;
            }
            else {
                const res = [];
                for (const entry of list) {
                    const buffer = buffer_1.Buffer.from(entry.name);
                    res.push(util.bufferToEncoding(buffer, opts.encoding));
                }
                return res;
            }
        };
        this.realpathSync = (path, options) => {
            let filename = util.pathToFilename(path);
            const { encoding } = optHelpers.getRealpathOptions(options);
            if (filename[0] !== "/" /* FsaToNodeConstants.Separator */)
                filename = "/" /* FsaToNodeConstants.Separator */ + filename;
            return (0, encoding_1.strToEncoding)(filename, encoding);
        };
        this.readSync = (fd, buffer, offset, length, position) => {
            util.validateFd(fd);
            const filename = this.getFileName(fd);
            const adapter = this.getSyncAdapter();
            const uint8 = adapter.call('read', [filename, position, length]);
            const dest = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            dest.set(uint8, offset);
            return uint8.length;
        };
        this.writeSync = (fd, a, b, c, d) => {
            const [, buf, offset, length, position] = util.getWriteSyncArgs(fd, a, b, c, d);
            const filename = this.getFileName(fd);
            const data = new Uint8Array(buf.buffer, buf.byteOffset + offset, length);
            return this.getSyncAdapter().call('write', [filename, data, position || null]);
        };
        this.openSync = (path, flags, mode = 438 /* MODE.DEFAULT */) => {
            const modeNum = util.modeToNumber(mode);
            const filename = util.pathToFilename(path);
            const flagsNum = util.flagsToNumber(flags);
            const adapter = this.getSyncAdapter();
            const handle = adapter.call('open', [filename, flagsNum, modeNum]);
            const openFile = this.__open2(handle, filename, flagsNum, modeNum);
            return openFile.fd;
        };
        this.writevSync = (fd, buffers, position) => {
            if (buffers.length === 0)
                return;
            this.writeSync(fd, buffers[0], 0, buffers[0].byteLength, position);
            for (let i = 1; i < buffers.length; i++) {
                this.writeSync(fd, buffers[i], 0, buffers[i].byteLength, null);
            }
        };
        this.fdatasyncSync = noop;
        this.fsyncSync = noop;
        this.chmodSync = noop;
        this.chownSync = noop;
        this.fchmodSync = noop;
        this.fchownSync = noop;
        this.futimesSync = noop;
        this.lchmodSync = noop;
        this.lchownSync = noop;
        this.utimesSync = noop;
        this.lutimesSync = noop;
        this.cpSync = notImplemented;
        this.opendirSync = notImplemented;
        this.statfsSync = notImplemented;
        this.readvSync = notImplemented;
        this.symlinkSync = notSupported;
        this.linkSync = notSupported;
        // ---------------------------------------------------------- FsCommonObjects
        this.F_OK = constants_2.constants.F_OK;
        this.R_OK = constants_2.constants.R_OK;
        this.W_OK = constants_2.constants.W_OK;
        this.X_OK = constants_2.constants.X_OK;
        this.constants = constants_2.constants;
        this.Dirent = FsaNodeDirent_1.FsaNodeDirent;
        this.Stats = (FsaNodeStats_1.FsaNodeStats);
        this.WriteStream = FsaNodeWriteStream_1.FsaNodeWriteStream;
        this.ReadStream = FsaNodeReadStream_1.FsaNodeReadStream;
        this.StatFs = 0;
        this.Dir = 0;
        this.StatsWatcher = 0;
        this.FSWatcher = 0;
    }
    async getHandleStats(bigint, handle) {
        let size = 0;
        if (handle.kind === 'file') {
            const file = handle;
            const fileData = await file.getFile();
            size = fileData.size;
        }
        const stats = new FsaNodeStats_1.FsaNodeStats(bigint, bigint ? BigInt(size) : size, handle.kind);
        return stats;
    }
    rmAll(callback) {
        (async () => {
            var _a, e_3, _b, _c;
            const root = await this.root;
            try {
                for (var _d = true, _e = tslib_1.__asyncValues(root.keys()), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const name = _c;
                    await root.removeEntry(name, { recursive: true });
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
        })().then(() => callback(null), error => callback(error));
    }
}
exports.FsaNodeFs = FsaNodeFs;
//# sourceMappingURL=FsaNodeFs.js.map

/***/ }),
/* 3 */
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __addDisposableResource: function() { return /* binding */ __addDisposableResource; },
/* harmony export */   __assign: function() { return /* binding */ __assign; },
/* harmony export */   __asyncDelegator: function() { return /* binding */ __asyncDelegator; },
/* harmony export */   __asyncGenerator: function() { return /* binding */ __asyncGenerator; },
/* harmony export */   __asyncValues: function() { return /* binding */ __asyncValues; },
/* harmony export */   __await: function() { return /* binding */ __await; },
/* harmony export */   __awaiter: function() { return /* binding */ __awaiter; },
/* harmony export */   __classPrivateFieldGet: function() { return /* binding */ __classPrivateFieldGet; },
/* harmony export */   __classPrivateFieldIn: function() { return /* binding */ __classPrivateFieldIn; },
/* harmony export */   __classPrivateFieldSet: function() { return /* binding */ __classPrivateFieldSet; },
/* harmony export */   __createBinding: function() { return /* binding */ __createBinding; },
/* harmony export */   __decorate: function() { return /* binding */ __decorate; },
/* harmony export */   __disposeResources: function() { return /* binding */ __disposeResources; },
/* harmony export */   __esDecorate: function() { return /* binding */ __esDecorate; },
/* harmony export */   __exportStar: function() { return /* binding */ __exportStar; },
/* harmony export */   __extends: function() { return /* binding */ __extends; },
/* harmony export */   __generator: function() { return /* binding */ __generator; },
/* harmony export */   __importDefault: function() { return /* binding */ __importDefault; },
/* harmony export */   __importStar: function() { return /* binding */ __importStar; },
/* harmony export */   __makeTemplateObject: function() { return /* binding */ __makeTemplateObject; },
/* harmony export */   __metadata: function() { return /* binding */ __metadata; },
/* harmony export */   __param: function() { return /* binding */ __param; },
/* harmony export */   __propKey: function() { return /* binding */ __propKey; },
/* harmony export */   __read: function() { return /* binding */ __read; },
/* harmony export */   __rest: function() { return /* binding */ __rest; },
/* harmony export */   __runInitializers: function() { return /* binding */ __runInitializers; },
/* harmony export */   __setFunctionName: function() { return /* binding */ __setFunctionName; },
/* harmony export */   __spread: function() { return /* binding */ __spread; },
/* harmony export */   __spreadArray: function() { return /* binding */ __spreadArray; },
/* harmony export */   __spreadArrays: function() { return /* binding */ __spreadArrays; },
/* harmony export */   __values: function() { return /* binding */ __values; }
/* harmony export */ });
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */

var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
  return extendStatics(d, b);
};

function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
  __assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
  }
  return __assign.apply(this, arguments);
}

function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
      }
  return t;
}

function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
  return function (target, key) { decorator(target, key, paramIndex); }
}

function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
          if (result === void 0) continue;
          if (result === null || typeof result !== "object") throw new TypeError("Object expected");
          if (_ = accept(result.get)) descriptor.get = _;
          if (_ = accept(result.set)) descriptor.set = _;
          if (_ = accept(result.init)) initializers.unshift(_);
      }
      else if (_ = accept(result)) {
          if (kind === "field") initializers.unshift(_);
          else descriptor[key] = _;
      }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};

function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};

function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
};

function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};

function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
              case 0: case 1: t = op; break;
              case 4: _.label++; return { value: op[1], done: false };
              case 5: _.label++; y = op[1]; op = [0]; continue;
              case 7: op = _.ops.pop(); _.trys.pop(); continue;
              default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                  if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                  if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                  if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                  if (t[2]) _.ops.pop();
                  _.trys.pop(); continue;
          }
          op = body.call(thisArg, _);
      } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
      if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
      next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
      }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  }
  catch (error) { e = { error: error }; }
  finally {
      try {
          if (r && !r.done && (m = i["return"])) m.call(i);
      }
      finally { if (e) throw e.error; }
  }
  return ar;
}

/** @deprecated */
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
      ar = ar.concat(__read(arguments[i]));
  return ar;
}

/** @deprecated */
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
          r[k] = a[j];
  return r;
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
      }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
  function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
  function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
  function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
  function fulfill(value) { resume("next", value); }
  function reject(value) { resume("throw", value); }
  function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
  function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
  function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
  function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
  return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
  o["default"] = v;
};

function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
}

function __importDefault(mod) {
  return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}

function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose;
    if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    env.stack.push({ value: value, dispose: dispose, async: async });
  }
  else if (async) {
    env.stack.push({ async: true });
  }
  return value;
}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  function next() {
    while (env.stack.length) {
      var rec = env.stack.pop();
      try {
        var result = rec.dispose && rec.dispose.call(rec.value);
        if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
      }
      catch (e) {
          fail(e);
      }
    }
    if (env.hasError) throw env.error;
  }
  return next();
}

/* harmony default export */ __webpack_exports__["default"] = ({
  __extends,
  __assign,
  __rest,
  __decorate,
  __param,
  __metadata,
  __awaiter,
  __generator,
  __createBinding,
  __exportStar,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __spreadArray,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
  __addDisposableResource,
  __disposeResources,
});


/***/ }),
/* 4 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getWriteFileOptions = exports.writeFileDefaults = exports.getRealpathOptsAndCb = exports.getRealpathOptions = exports.getStatOptsAndCb = exports.getStatOptions = exports.getAppendFileOptsAndCb = exports.getAppendFileOpts = exports.getReaddirOptsAndCb = exports.getReaddirOptions = exports.getReadFileOptions = exports.getRmOptsAndCb = exports.getRmdirOptions = exports.getDefaultOptsAndCb = exports.getDefaultOpts = exports.optsDefaults = exports.optsAndCbGenerator = exports.optsGenerator = exports.getOptions = exports.getMkdirOptions = void 0;
const constants_1 = __webpack_require__(5);
const encoding_1 = __webpack_require__(7);
const util_1 = __webpack_require__(38);
const mkdirDefaults = {
    mode: 511 /* MODE.DIR */,
    recursive: false,
};
const getMkdirOptions = (options) => {
    if (typeof options === 'number')
        return Object.assign({}, mkdirDefaults, { mode: options });
    return Object.assign({}, mkdirDefaults, options);
};
exports.getMkdirOptions = getMkdirOptions;
const ERRSTR_OPTS = tipeof => `Expected options to be either an object or a string, but got ${tipeof} instead`;
function getOptions(defaults, options) {
    let opts;
    if (!options)
        return defaults;
    else {
        const tipeof = typeof options;
        switch (tipeof) {
            case 'string':
                opts = Object.assign({}, defaults, { encoding: options });
                break;
            case 'object':
                opts = Object.assign({}, defaults, options);
                break;
            default:
                throw TypeError(ERRSTR_OPTS(tipeof));
        }
    }
    if (opts.encoding !== 'buffer')
        (0, encoding_1.assertEncoding)(opts.encoding);
    return opts;
}
exports.getOptions = getOptions;
function optsGenerator(defaults) {
    return options => getOptions(defaults, options);
}
exports.optsGenerator = optsGenerator;
function optsAndCbGenerator(getOpts) {
    return (options, callback) => typeof options === 'function' ? [getOpts(), options] : [getOpts(options), (0, util_1.validateCallback)(callback)];
}
exports.optsAndCbGenerator = optsAndCbGenerator;
exports.optsDefaults = {
    encoding: 'utf8',
};
exports.getDefaultOpts = optsGenerator(exports.optsDefaults);
exports.getDefaultOptsAndCb = optsAndCbGenerator(exports.getDefaultOpts);
const rmdirDefaults = {
    recursive: false,
};
const getRmdirOptions = (options) => {
    return Object.assign({}, rmdirDefaults, options);
};
exports.getRmdirOptions = getRmdirOptions;
const getRmOpts = optsGenerator(exports.optsDefaults);
exports.getRmOptsAndCb = optsAndCbGenerator(getRmOpts);
const readFileOptsDefaults = {
    flag: 'r',
};
exports.getReadFileOptions = optsGenerator(readFileOptsDefaults);
const readdirDefaults = {
    encoding: 'utf8',
    recursive: false,
    withFileTypes: false,
};
exports.getReaddirOptions = optsGenerator(readdirDefaults);
exports.getReaddirOptsAndCb = optsAndCbGenerator(exports.getReaddirOptions);
const appendFileDefaults = {
    encoding: 'utf8',
    mode: 438 /* MODE.DEFAULT */,
    flag: constants_1.FLAGS[constants_1.FLAGS.a],
};
exports.getAppendFileOpts = optsGenerator(appendFileDefaults);
exports.getAppendFileOptsAndCb = optsAndCbGenerator(exports.getAppendFileOpts);
const statDefaults = {
    bigint: false,
};
const getStatOptions = (options = {}) => Object.assign({}, statDefaults, options);
exports.getStatOptions = getStatOptions;
const getStatOptsAndCb = (options, callback) => typeof options === 'function' ? [(0, exports.getStatOptions)(), options] : [(0, exports.getStatOptions)(options), (0, util_1.validateCallback)(callback)];
exports.getStatOptsAndCb = getStatOptsAndCb;
const realpathDefaults = exports.optsDefaults;
exports.getRealpathOptions = optsGenerator(realpathDefaults);
exports.getRealpathOptsAndCb = optsAndCbGenerator(exports.getRealpathOptions);
exports.writeFileDefaults = {
    encoding: 'utf8',
    mode: 438 /* MODE.DEFAULT */,
    flag: constants_1.FLAGS[constants_1.FLAGS.w],
};
exports.getWriteFileOptions = optsGenerator(exports.writeFileDefaults);
//# sourceMappingURL=options.js.map

/***/ }),
/* 5 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FLAGS = exports.ERRSTR = void 0;
const constants_1 = __webpack_require__(6);
exports.ERRSTR = {
    PATH_STR: 'path must be a string or Buffer',
    // FD:             'file descriptor must be a unsigned 32-bit integer',
    FD: 'fd must be a file descriptor',
    MODE_INT: 'mode must be an int',
    CB: 'callback must be a function',
    UID: 'uid must be an unsigned int',
    GID: 'gid must be an unsigned int',
    LEN: 'len must be an integer',
    ATIME: 'atime must be an integer',
    MTIME: 'mtime must be an integer',
    PREFIX: 'filename prefix is required',
    BUFFER: 'buffer must be an instance of Buffer or StaticBuffer',
    OFFSET: 'offset must be an integer',
    LENGTH: 'length must be an integer',
    POSITION: 'position must be an integer',
};
const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_SYNC } = constants_1.constants;
// List of file `flags` as defined by Node.
var FLAGS;
(function (FLAGS) {
    // Open file for reading. An exception occurs if the file does not exist.
    FLAGS[FLAGS["r"] = O_RDONLY] = "r";
    // Open file for reading and writing. An exception occurs if the file does not exist.
    FLAGS[FLAGS["r+"] = O_RDWR] = "r+";
    // Open file for reading in synchronous mode. Instructs the operating system to bypass the local file system cache.
    FLAGS[FLAGS["rs"] = O_RDONLY | O_SYNC] = "rs";
    FLAGS[FLAGS["sr"] = FLAGS.rs] = "sr";
    // Open file for reading and writing, telling the OS to open it synchronously. See notes for 'rs' about using this with caution.
    FLAGS[FLAGS["rs+"] = O_RDWR | O_SYNC] = "rs+";
    FLAGS[FLAGS["sr+"] = FLAGS['rs+']] = "sr+";
    // Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
    FLAGS[FLAGS["w"] = O_WRONLY | O_CREAT | O_TRUNC] = "w";
    // Like 'w' but fails if path exists.
    FLAGS[FLAGS["wx"] = O_WRONLY | O_CREAT | O_TRUNC | O_EXCL] = "wx";
    FLAGS[FLAGS["xw"] = FLAGS.wx] = "xw";
    // Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
    FLAGS[FLAGS["w+"] = O_RDWR | O_CREAT | O_TRUNC] = "w+";
    // Like 'w+' but fails if path exists.
    FLAGS[FLAGS["wx+"] = O_RDWR | O_CREAT | O_TRUNC | O_EXCL] = "wx+";
    FLAGS[FLAGS["xw+"] = FLAGS['wx+']] = "xw+";
    // Open file for appending. The file is created if it does not exist.
    FLAGS[FLAGS["a"] = O_WRONLY | O_APPEND | O_CREAT] = "a";
    // Like 'a' but fails if path exists.
    FLAGS[FLAGS["ax"] = O_WRONLY | O_APPEND | O_CREAT | O_EXCL] = "ax";
    FLAGS[FLAGS["xa"] = FLAGS.ax] = "xa";
    // Open file for reading and appending. The file is created if it does not exist.
    FLAGS[FLAGS["a+"] = O_RDWR | O_APPEND | O_CREAT] = "a+";
    // Like 'a+' but fails if path exists.
    FLAGS[FLAGS["ax+"] = O_RDWR | O_APPEND | O_CREAT | O_EXCL] = "ax+";
    FLAGS[FLAGS["xa+"] = FLAGS['ax+']] = "xa+";
})(FLAGS || (exports.FLAGS = FLAGS = {}));
//# sourceMappingURL=constants.js.map

/***/ }),
/* 6 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.constants = void 0;
exports.constants = {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    S_IFMT: 61440,
    S_IFREG: 32768,
    S_IFDIR: 16384,
    S_IFCHR: 8192,
    S_IFBLK: 24576,
    S_IFIFO: 4096,
    S_IFLNK: 40960,
    S_IFSOCK: 49152,
    O_CREAT: 64,
    O_EXCL: 128,
    O_NOCTTY: 256,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536,
    O_NOATIME: 262144,
    O_NOFOLLOW: 131072,
    O_SYNC: 1052672,
    O_SYMLINK: 2097152,
    O_DIRECT: 16384,
    O_NONBLOCK: 2048,
    S_IRWXU: 448,
    S_IRUSR: 256,
    S_IWUSR: 128,
    S_IXUSR: 64,
    S_IRWXG: 56,
    S_IRGRP: 32,
    S_IWGRP: 16,
    S_IXGRP: 8,
    S_IRWXO: 7,
    S_IROTH: 4,
    S_IWOTH: 2,
    S_IXOTH: 1,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    UV_FS_SYMLINK_DIR: 1,
    UV_FS_SYMLINK_JUNCTION: 2,
    UV_FS_COPYFILE_EXCL: 1,
    UV_FS_COPYFILE_FICLONE: 2,
    UV_FS_COPYFILE_FICLONE_FORCE: 4,
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4,
};
//# sourceMappingURL=constants.js.map

/***/ }),
/* 7 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.strToEncoding = exports.assertEncoding = exports.ENCODING_UTF8 = void 0;
const buffer_1 = __webpack_require__(8);
const errors = __webpack_require__(10);
exports.ENCODING_UTF8 = 'utf8';
function assertEncoding(encoding) {
    if (encoding && !buffer_1.Buffer.isEncoding(encoding))
        throw new errors.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', encoding);
}
exports.assertEncoding = assertEncoding;
function strToEncoding(str, encoding) {
    if (!encoding || encoding === exports.ENCODING_UTF8)
        return str; // UTF-8
    if (encoding === 'buffer')
        return new buffer_1.Buffer(str); // `buffer` encoding
    return new buffer_1.Buffer(str).toString(encoding); // Custom encoding
}
exports.strToEncoding = strToEncoding;
//# sourceMappingURL=encoding.js.map

/***/ }),
/* 8 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bufferFrom = exports.bufferAllocUnsafe = exports.Buffer = void 0;
const buffer_1 = __webpack_require__(9);
Object.defineProperty(exports, "Buffer", ({ enumerable: true, get: function () { return buffer_1.Buffer; } }));
function bufferV0P12Ponyfill(arg0, ...args) {
    return new buffer_1.Buffer(arg0, ...args);
}
const bufferAllocUnsafe = buffer_1.Buffer.allocUnsafe || bufferV0P12Ponyfill;
exports.bufferAllocUnsafe = bufferAllocUnsafe;
const bufferFrom = buffer_1.Buffer.from || bufferV0P12Ponyfill;
exports.bufferFrom = bufferFrom;
//# sourceMappingURL=buffer.js.map

/***/ }),
/* 9 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

var _Buffer = typeof __webpack_require__.g.Buffer === 'function'
  ? __webpack_require__.g.Buffer
  : /*#__PURE__*/ (function () {
      try {
        return require('buffer').Buffer
      } catch (_) {
        throw new Error('The current runtime does not support "Buffer". Consider using buffer polyfill to make sure `globalThis.Buffer` is defined.')
      }
    })()

exports.Buffer = _Buffer


/***/ }),
/* 10 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// The whole point behind this internal module is to allow Node.js to no
// longer be forced to treat every error message change as a semver-major
// change. The NodeError classes here all expose a `code` property whose
// value statically and permanently identifies the error. While the error
// message may change, the code should not.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.E = exports.AssertionError = exports.message = exports.RangeError = exports.TypeError = exports.Error = void 0;
const assert = __webpack_require__(11);
const util = __webpack_require__(12);
const kCode = typeof Symbol === 'undefined' ? '_kCode' : Symbol('code');
const messages = {}; // new Map();
function makeNodeError(Base) {
    return class NodeError extends Base {
        constructor(key, ...args) {
            super(message(key, args));
            this.code = key;
            this[kCode] = key;
            this.name = `${super.name} [${this[kCode]}]`;
        }
    };
}
const g = typeof globalThis !== 'undefined' ? globalThis : __webpack_require__.g;
class AssertionError extends g.Error {
    constructor(options) {
        if (typeof options !== 'object' || options === null) {
            throw new exports.TypeError('ERR_INVALID_ARG_TYPE', 'options', 'object');
        }
        if (options.message) {
            super(options.message);
        }
        else {
            super(`${util.inspect(options.actual).slice(0, 128)} ` +
                `${options.operator} ${util.inspect(options.expected).slice(0, 128)}`);
        }
        this.generatedMessage = !options.message;
        this.name = 'AssertionError [ERR_ASSERTION]';
        this.code = 'ERR_ASSERTION';
        this.actual = options.actual;
        this.expected = options.expected;
        this.operator = options.operator;
        exports.Error.captureStackTrace(this, options.stackStartFunction);
    }
}
exports.AssertionError = AssertionError;
function message(key, args) {
    assert.strictEqual(typeof key, 'string');
    // const msg = messages.get(key);
    const msg = messages[key];
    assert(msg, `An invalid error message key was used: ${key}.`);
    let fmt;
    if (typeof msg === 'function') {
        fmt = msg;
    }
    else {
        fmt = util.format;
        if (args === undefined || args.length === 0)
            return msg;
        args.unshift(msg);
    }
    return String(fmt.apply(null, args));
}
exports.message = message;
// Utility function for registering the error codes. Only used here. Exported
// *only* to allow for testing.
function E(sym, val) {
    messages[sym] = typeof val === 'function' ? val : String(val);
}
exports.E = E;
exports.Error = makeNodeError(g.Error);
exports.TypeError = makeNodeError(g.TypeError);
exports.RangeError = makeNodeError(g.RangeError);
// To declare an error message, use the E(sym, val) function above. The sym
// must be an upper case string. The val can be either a function or a string.
// The return value of the function must be a string.
// Examples:
// E('EXAMPLE_KEY1', 'This is the error value');
// E('EXAMPLE_KEY2', (a, b) => return `${a} ${b}`);
//
// Once an error code has been assigned, the code itself MUST NOT change and
// any given error code must never be reused to identify a different error.
//
// Any error code added here should also be added to the documentation
//
// Note: Please try to keep these in alphabetical order
E('ERR_ARG_NOT_ITERABLE', '%s must be iterable');
E('ERR_ASSERTION', '%s');
E('ERR_BUFFER_OUT_OF_BOUNDS', bufferOutOfBounds);
E('ERR_CHILD_CLOSED_BEFORE_REPLY', 'Child closed before reply received');
E('ERR_CONSOLE_WRITABLE_STREAM', 'Console expects a writable stream instance for %s');
E('ERR_CPU_USAGE', 'Unable to obtain cpu usage %s');
E('ERR_DNS_SET_SERVERS_FAILED', (err, servers) => `c-ares failed to set servers: "${err}" [${servers}]`);
E('ERR_FALSY_VALUE_REJECTION', 'Promise was rejected with falsy value');
E('ERR_ENCODING_NOT_SUPPORTED', enc => `The "${enc}" encoding is not supported`);
E('ERR_ENCODING_INVALID_ENCODED_DATA', enc => `The encoded data was not valid for encoding ${enc}`);
E('ERR_HTTP_HEADERS_SENT', 'Cannot render headers after they are sent to the client');
E('ERR_HTTP_INVALID_STATUS_CODE', 'Invalid status code: %s');
E('ERR_HTTP_TRAILER_INVALID', 'Trailers are invalid with this transfer encoding');
E('ERR_INDEX_OUT_OF_RANGE', 'Index out of range');
E('ERR_INVALID_ARG_TYPE', invalidArgType);
E('ERR_INVALID_ARRAY_LENGTH', (name, len, actual) => {
    assert.strictEqual(typeof actual, 'number');
    return `The array "${name}" (length ${actual}) must be of length ${len}.`;
});
E('ERR_INVALID_BUFFER_SIZE', 'Buffer size must be a multiple of %s');
E('ERR_INVALID_CALLBACK', 'Callback must be a function');
E('ERR_INVALID_CHAR', 'Invalid character in %s');
E('ERR_INVALID_CURSOR_POS', 'Cannot set cursor row without setting its column');
E('ERR_INVALID_FD', '"fd" must be a positive integer: %s');
E('ERR_INVALID_FILE_URL_HOST', 'File URL host must be "localhost" or empty on %s');
E('ERR_INVALID_FILE_URL_PATH', 'File URL path %s');
E('ERR_INVALID_HANDLE_TYPE', 'This handle type cannot be sent');
E('ERR_INVALID_IP_ADDRESS', 'Invalid IP address: %s');
E('ERR_INVALID_OPT_VALUE', (name, value) => {
    return `The value "${String(value)}" is invalid for option "${name}"`;
});
E('ERR_INVALID_OPT_VALUE_ENCODING', value => `The value "${String(value)}" is invalid for option "encoding"`);
E('ERR_INVALID_REPL_EVAL_CONFIG', 'Cannot specify both "breakEvalOnSigint" and "eval" for REPL');
E('ERR_INVALID_SYNC_FORK_INPUT', 'Asynchronous forks do not support Buffer, Uint8Array or string input: %s');
E('ERR_INVALID_THIS', 'Value of "this" must be of type %s');
E('ERR_INVALID_TUPLE', '%s must be an iterable %s tuple');
E('ERR_INVALID_URL', 'Invalid URL: %s');
E('ERR_INVALID_URL_SCHEME', expected => `The URL must be ${oneOf(expected, 'scheme')}`);
E('ERR_IPC_CHANNEL_CLOSED', 'Channel closed');
E('ERR_IPC_DISCONNECTED', 'IPC channel is already disconnected');
E('ERR_IPC_ONE_PIPE', 'Child process can have only one IPC pipe');
E('ERR_IPC_SYNC_FORK', 'IPC cannot be used with synchronous forks');
E('ERR_MISSING_ARGS', missingArgs);
E('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
E('ERR_NAPI_CONS_FUNCTION', 'Constructor must be a function');
E('ERR_NAPI_CONS_PROTOTYPE_OBJECT', 'Constructor.prototype must be an object');
E('ERR_NO_CRYPTO', 'Node.js is not compiled with OpenSSL crypto support');
E('ERR_NO_LONGER_SUPPORTED', '%s is no longer supported');
E('ERR_PARSE_HISTORY_DATA', 'Could not parse history data in %s');
E('ERR_SOCKET_ALREADY_BOUND', 'Socket is already bound');
E('ERR_SOCKET_BAD_PORT', 'Port should be > 0 and < 65536');
E('ERR_SOCKET_BAD_TYPE', 'Bad socket type specified. Valid types are: udp4, udp6');
E('ERR_SOCKET_CANNOT_SEND', 'Unable to send data');
E('ERR_SOCKET_CLOSED', 'Socket is closed');
E('ERR_SOCKET_DGRAM_NOT_RUNNING', 'Not running');
E('ERR_STDERR_CLOSE', 'process.stderr cannot be closed');
E('ERR_STDOUT_CLOSE', 'process.stdout cannot be closed');
E('ERR_STREAM_WRAP', 'Stream has StringDecoder set or is in objectMode');
E('ERR_TLS_CERT_ALTNAME_INVALID', "Hostname/IP does not match certificate's altnames: %s");
E('ERR_TLS_DH_PARAM_SIZE', size => `DH parameter size ${size} is less than 2048`);
E('ERR_TLS_HANDSHAKE_TIMEOUT', 'TLS handshake timeout');
E('ERR_TLS_RENEGOTIATION_FAILED', 'Failed to renegotiate');
E('ERR_TLS_REQUIRED_SERVER_NAME', '"servername" is required parameter for Server.addContext');
E('ERR_TLS_SESSION_ATTACK', 'TSL session renegotiation attack detected');
E('ERR_TRANSFORM_ALREADY_TRANSFORMING', 'Calling transform done when still transforming');
E('ERR_TRANSFORM_WITH_LENGTH_0', 'Calling transform done when writableState.length != 0');
E('ERR_UNKNOWN_ENCODING', 'Unknown encoding: %s');
E('ERR_UNKNOWN_SIGNAL', 'Unknown signal: %s');
E('ERR_UNKNOWN_STDIN_TYPE', 'Unknown stdin file type');
E('ERR_UNKNOWN_STREAM_TYPE', 'Unknown stream file type');
E('ERR_V8BREAKITERATOR', 'Full ICU data not installed. ' + 'See https://github.com/nodejs/node/wiki/Intl');
function invalidArgType(name, expected, actual) {
    assert(name, 'name is required');
    // determiner: 'must be' or 'must not be'
    let determiner;
    if (expected.includes('not ')) {
        determiner = 'must not be';
        expected = expected.split('not ')[1];
    }
    else {
        determiner = 'must be';
    }
    let msg;
    if (Array.isArray(name)) {
        const names = name.map(val => `"${val}"`).join(', ');
        msg = `The ${names} arguments ${determiner} ${oneOf(expected, 'type')}`;
    }
    else if (name.includes(' argument')) {
        // for the case like 'first argument'
        msg = `The ${name} ${determiner} ${oneOf(expected, 'type')}`;
    }
    else {
        const type = name.includes('.') ? 'property' : 'argument';
        msg = `The "${name}" ${type} ${determiner} ${oneOf(expected, 'type')}`;
    }
    // if actual value received, output it
    if (arguments.length >= 3) {
        msg += `. Received type ${actual !== null ? typeof actual : 'null'}`;
    }
    return msg;
}
function missingArgs(...args) {
    assert(args.length > 0, 'At least one arg needs to be specified');
    let msg = 'The ';
    const len = args.length;
    args = args.map(a => `"${a}"`);
    switch (len) {
        case 1:
            msg += `${args[0]} argument`;
            break;
        case 2:
            msg += `${args[0]} and ${args[1]} arguments`;
            break;
        default:
            msg += args.slice(0, len - 1).join(', ');
            msg += `, and ${args[len - 1]} arguments`;
            break;
    }
    return `${msg} must be specified`;
}
function oneOf(expected, thing) {
    assert(expected, 'expected is required');
    assert(typeof thing === 'string', 'thing is required');
    if (Array.isArray(expected)) {
        const len = expected.length;
        assert(len > 0, 'At least one expected value needs to be specified');
        // tslint:disable-next-line
        expected = expected.map(i => String(i));
        if (len > 2) {
            return `one of ${thing} ${expected.slice(0, len - 1).join(', ')}, or ` + expected[len - 1];
        }
        else if (len === 2) {
            return `one of ${thing} ${expected[0]} or ${expected[1]}`;
        }
        else {
            return `of ${thing} ${expected[0]}`;
        }
    }
    else {
        return `of ${thing} ${String(expected)}`;
    }
}
function bufferOutOfBounds(name, isWriting) {
    if (isWriting) {
        return 'Attempt to write outside buffer bounds';
    }
    else {
        return `"${name}" is outside of buffer bounds`;
    }
}
//# sourceMappingURL=errors.js.map

/***/ }),
/* 11 */
/***/ (function(module) {

function assert (v, m) {
  if (!v) {
    throw new Error(m || 'AssertionError')
  }
}

assert.strictEqual = function (a, b, m) {
  if (!Object.is(a, b)) {
    throw new Error(m || 'AssertionError')
  }
}

module.exports = assert


/***/ }),
/* 12 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

/* provided dependency */ var process = __webpack_require__(13);
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if (false) { var debugEnv; }
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').slice(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.slice(1, -1);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = __webpack_require__(14);

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = __webpack_require__(36);

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = __webpack_require__(37);

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
}

exports.promisify.custom = kCustomPromisifiedSymbol

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;


/***/ }),
/* 13 */
/***/ (function(module) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 14 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
// Currently in sync with Node.js lib/internal/util/types.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9



var isArgumentsObject = __webpack_require__(15);
var isGeneratorFunction = __webpack_require__(30);
var whichTypedArray = __webpack_require__(31);
var isTypedArray = __webpack_require__(35);

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBufferCopy === 'undefined') {
    return false;
  }

  if (typeof isSharedArrayBufferToString.working === 'undefined') {
    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBufferCopy;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});


/***/ }),
/* 15 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var hasToStringTag = __webpack_require__(16)();
var callBound = __webpack_require__(18);

var $toString = callBound('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString(value) !== '[object Array]' &&
		$toString(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;


/***/ }),
/* 16 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var hasSymbols = __webpack_require__(17);

module.exports = function hasToStringTagShams() {
	return hasSymbols() && !!Symbol.toStringTag;
};


/***/ }),
/* 17 */
/***/ (function(module) {

"use strict";


/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};


/***/ }),
/* 18 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var GetIntrinsic = __webpack_require__(19);

var callBind = __webpack_require__(25);

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};


/***/ }),
/* 19 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = __webpack_require__(20)();
var hasProto = __webpack_require__(21)();

var getProto = Object.getPrototypeOf || (
	hasProto
		? function (x) { return x.__proto__; } // eslint-disable-line no-proto
		: null
);

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' || !getProto ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols && getProto ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

if (getProto) {
	try {
		null.error; // eslint-disable-line no-unused-expressions
	} catch (e) {
		// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
		var errorProto = getProto(getProto(e));
		INTRINSICS['%Error.prototype%'] = errorProto;
	}
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen && getProto) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = __webpack_require__(22);
var hasOwn = __webpack_require__(24);
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};


/***/ }),
/* 20 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = __webpack_require__(17);

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};


/***/ }),
/* 21 */
/***/ (function(module) {

"use strict";


var test = {
	foo: {}
};

var $Object = Object;

module.exports = function hasProto() {
	return { __proto__: test }.foo === test.foo && !({ __proto__: null } instanceof $Object);
};


/***/ }),
/* 22 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var implementation = __webpack_require__(23);

module.exports = Function.prototype.bind || implementation;


/***/ }),
/* 23 */
/***/ (function(module) {

"use strict";


/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var toStr = Object.prototype.toString;
var max = Math.max;
var funcType = '[object Function]';

var concatty = function concatty(a, b) {
    var arr = [];

    for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
    }
    for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
    }

    return arr;
};

var slicy = function slicy(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
    }
    return arr;
};

var joiny = function (arr, joiner) {
    var str = '';
    for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
            str += joiner;
        }
    }
    return str;
};

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                concatty(args, arguments)
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        }
        return target.apply(
            that,
            concatty(args, arguments)
        );

    };

    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = '$' + i;
    }

    bound = Function('binder', 'return function (' + joiny(boundArgs, ',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};


/***/ }),
/* 24 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var call = Function.prototype.call;
var $hasOwn = Object.prototype.hasOwnProperty;
var bind = __webpack_require__(22);

/** @type {(o: {}, p: PropertyKey) => p is keyof o} */
module.exports = bind.call(call, $hasOwn);


/***/ }),
/* 25 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var bind = __webpack_require__(22);
var GetIntrinsic = __webpack_require__(19);
var setFunctionLength = __webpack_require__(26);

var $TypeError = GetIntrinsic('%TypeError%');
var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	if (typeof originalFunction !== 'function') {
		throw new $TypeError('a function is required');
	}
	var func = $reflectApply(bind, $call, arguments);
	return setFunctionLength(
		func,
		1 + $max(0, originalFunction.length - (arguments.length - 1)),
		true
	);
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}


/***/ }),
/* 26 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var GetIntrinsic = __webpack_require__(19);
var define = __webpack_require__(27);
var hasDescriptors = __webpack_require__(28)();
var gOPD = __webpack_require__(29);

var $TypeError = GetIntrinsic('%TypeError%');
var $floor = GetIntrinsic('%Math.floor%');

module.exports = function setFunctionLength(fn, length) {
	if (typeof fn !== 'function') {
		throw new $TypeError('`fn` is not a function');
	}
	if (typeof length !== 'number' || length < 0 || length > 0xFFFFFFFF || $floor(length) !== length) {
		throw new $TypeError('`length` must be a positive 32-bit integer');
	}

	var loose = arguments.length > 2 && !!arguments[2];

	var functionLengthIsConfigurable = true;
	var functionLengthIsWritable = true;
	if ('length' in fn && gOPD) {
		var desc = gOPD(fn, 'length');
		if (desc && !desc.configurable) {
			functionLengthIsConfigurable = false;
		}
		if (desc && !desc.writable) {
			functionLengthIsWritable = false;
		}
	}

	if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
		if (hasDescriptors) {
			define(fn, 'length', length, true, true);
		} else {
			define(fn, 'length', length);
		}
	}
	return fn;
};


/***/ }),
/* 27 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var hasPropertyDescriptors = __webpack_require__(28)();

var GetIntrinsic = __webpack_require__(19);

var $defineProperty = hasPropertyDescriptors && GetIntrinsic('%Object.defineProperty%', true);
if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = false;
	}
}

var $SyntaxError = GetIntrinsic('%SyntaxError%');
var $TypeError = GetIntrinsic('%TypeError%');

var gopd = __webpack_require__(29);

/** @type {(obj: Record<PropertyKey, unknown>, property: PropertyKey, value: unknown, nonEnumerable?: boolean | null, nonWritable?: boolean | null, nonConfigurable?: boolean | null, loose?: boolean) => void} */
module.exports = function defineDataProperty(
	obj,
	property,
	value
) {
	if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
		throw new $TypeError('`obj` must be an object or a function`');
	}
	if (typeof property !== 'string' && typeof property !== 'symbol') {
		throw new $TypeError('`property` must be a string or a symbol`');
	}
	if (arguments.length > 3 && typeof arguments[3] !== 'boolean' && arguments[3] !== null) {
		throw new $TypeError('`nonEnumerable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 4 && typeof arguments[4] !== 'boolean' && arguments[4] !== null) {
		throw new $TypeError('`nonWritable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 5 && typeof arguments[5] !== 'boolean' && arguments[5] !== null) {
		throw new $TypeError('`nonConfigurable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 6 && typeof arguments[6] !== 'boolean') {
		throw new $TypeError('`loose`, if provided, must be a boolean');
	}

	var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
	var nonWritable = arguments.length > 4 ? arguments[4] : null;
	var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
	var loose = arguments.length > 6 ? arguments[6] : false;

	/* @type {false | TypedPropertyDescriptor<unknown>} */
	var desc = !!gopd && gopd(obj, property);

	if ($defineProperty) {
		$defineProperty(obj, property, {
			configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
			enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
			value: value,
			writable: nonWritable === null && desc ? desc.writable : !nonWritable
		});
	} else if (loose || (!nonEnumerable && !nonWritable && !nonConfigurable)) {
		// must fall back to [[Set]], and was not explicitly asked to make non-enumerable, non-writable, or non-configurable
		obj[property] = value; // eslint-disable-line no-param-reassign
	} else {
		throw new $SyntaxError('This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.');
	}
};


/***/ }),
/* 28 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var GetIntrinsic = __webpack_require__(19);

var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);

var hasPropertyDescriptors = function hasPropertyDescriptors() {
	if ($defineProperty) {
		try {
			$defineProperty({}, 'a', { value: 1 });
			return true;
		} catch (e) {
			// IE 8 has a broken defineProperty
			return false;
		}
	}
	return false;
};

hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
	// node v0.6 has a bug where array lengths can be Set but not Defined
	if (!hasPropertyDescriptors()) {
		return null;
	}
	try {
		return $defineProperty([], 'length', { value: 1 }).length !== 1;
	} catch (e) {
		// In Firefox 4-22, defining length on an array throws an exception.
		return true;
	}
};

module.exports = hasPropertyDescriptors;


/***/ }),
/* 29 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var GetIntrinsic = __webpack_require__(19);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;


/***/ }),
/* 30 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag = __webpack_require__(16)();
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var GeneratorFunction;

module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}
	return getProto(fn) === GeneratorFunction;
};


/***/ }),
/* 31 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var forEach = __webpack_require__(32);
var availableTypedArrays = __webpack_require__(34);
var callBind = __webpack_require__(25);
var callBound = __webpack_require__(18);
var gOPD = __webpack_require__(29);

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = __webpack_require__(16)();

var g = typeof globalThis === 'undefined' ? __webpack_require__.g : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');

var $indexOf = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};
var cache = { __proto__: null };
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		if (Symbol.toStringTag in arr) {
			var proto = getPrototypeOf(arr);
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			cache['$' + typedArray] = callBind(descriptor.get);
		}
	});
} else {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		var fn = arr.slice || arr.set;
		if (fn) {
			cache['$' + typedArray] = callBind(fn);
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var found = false;
	forEach(cache, function (getter, typedArray) {
		if (!found) {
			try {
				if ('$' + getter(value) === typedArray) {
					found = $slice(typedArray, 1);
				}
			} catch (e) { /**/ }
		}
	});
	return found;
};

var trySlices = function tryAllSlices(value) {
	var found = false;
	forEach(cache, function (getter, name) {
		if (!found) {
			try {
				getter(value);
				found = $slice(name, 1);
			} catch (e) { /**/ }
		}
	});
	return found;
};

module.exports = function whichTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag) {
		var tag = $slice($toString(value), 8, -1);
		if ($indexOf(typedArrays, tag) > -1) {
			return tag;
		}
		if (tag !== 'Object') {
			return false;
		}
		// node < 0.6 hits here on real Typed Arrays
		return trySlices(value);
	}
	if (!gOPD) { return null; } // unknown engine
	return tryTypedArrays(value);
};


/***/ }),
/* 32 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var isCallable = __webpack_require__(33);

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

module.exports = forEach;


/***/ }),
/* 33 */
/***/ (function(module) {

"use strict";


var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var objectClass = '[object Object]';
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var ddaClass = '[object HTMLAllCollection]'; // IE 11
var ddaClass2 = '[object HTML document.all class]';
var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
var hasToStringTag = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

var isDDA = function isDocumentDotAll() { return false; };
if (typeof document === 'object') {
	// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
	var all = document.all;
	if (toStr.call(all) === toStr.call(document.all)) {
		isDDA = function isDocumentDotAll(value) {
			/* globals document: false */
			// in IE 6-8, typeof document.all is "object" and it's truthy
			if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
				try {
					var str = toStr.call(value);
					return (
						str === ddaClass
						|| str === ddaClass2
						|| str === ddaClass3 // opera 12.16
						|| str === objectClass // IE 6-8
					) && value('') == null; // eslint-disable-line eqeqeq
				} catch (e) { /**/ }
			}
			return false;
		};
	}
}

module.exports = reflectApply
	? function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value) && tryFunctionObject(value);
	}
	: function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr.call(value);
		if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
		return tryFunctionObject(value);
	};


/***/ }),
/* 34 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var possibleNames = [
	'BigInt64Array',
	'BigUint64Array',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray'
];

var g = typeof globalThis === 'undefined' ? __webpack_require__.g : globalThis;

module.exports = function availableTypedArrays() {
	var out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g[possibleNames[i]] === 'function') {
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};


/***/ }),
/* 35 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


var whichTypedArray = __webpack_require__(31);

module.exports = function isTypedArray(value) {
	return !!whichTypedArray(value);
};


/***/ }),
/* 36 */
/***/ (function(module) {

module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}

/***/ }),
/* 37 */
/***/ (function(module) {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),
/* 38 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
/* provided dependency */ var process = __webpack_require__(13);

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.unixify = exports.bufferToEncoding = exports.getWriteSyncArgs = exports.getWriteArgs = exports.bufToUint8 = exports.dataToBuffer = exports.validateFd = exports.isFd = exports.flagsToNumber = exports.genRndStr6 = exports.createError = exports.pathToFilename = exports.nullCheck = exports.modeToNumber = exports.validateCallback = exports.promisify = exports.isWin = void 0;
const constants_1 = __webpack_require__(5);
const errors = __webpack_require__(10);
const buffer_1 = __webpack_require__(8);
const encoding_1 = __webpack_require__(7);
const buffer_2 = __webpack_require__(8);
const queueMicrotask_1 = __webpack_require__(39);
exports.isWin = process.platform === 'win32';
function promisify(fs, fn, getResult = input => input) {
    return (...args) => new Promise((resolve, reject) => {
        fs[fn].bind(fs)(...args, (error, result) => {
            if (error)
                return reject(error);
            return resolve(getResult(result));
        });
    });
}
exports.promisify = promisify;
function validateCallback(callback) {
    if (typeof callback !== 'function')
        throw TypeError(constants_1.ERRSTR.CB);
    return callback;
}
exports.validateCallback = validateCallback;
function _modeToNumber(mode, def) {
    if (typeof mode === 'number')
        return mode;
    if (typeof mode === 'string')
        return parseInt(mode, 8);
    if (def)
        return modeToNumber(def);
    return undefined;
}
function modeToNumber(mode, def) {
    const result = _modeToNumber(mode, def);
    if (typeof result !== 'number' || isNaN(result))
        throw new TypeError(constants_1.ERRSTR.MODE_INT);
    return result;
}
exports.modeToNumber = modeToNumber;
function nullCheck(path, callback) {
    if (('' + path).indexOf('\u0000') !== -1) {
        const er = new Error('Path must be a string without null bytes');
        er.code = 'ENOENT';
        if (typeof callback !== 'function')
            throw er;
        (0, queueMicrotask_1.default)(() => {
            callback(er);
        });
        return false;
    }
    return true;
}
exports.nullCheck = nullCheck;
function getPathFromURLPosix(url) {
    if (url.hostname !== '') {
        throw new errors.TypeError('ERR_INVALID_FILE_URL_HOST', process.platform);
    }
    const pathname = url.pathname;
    for (let n = 0; n < pathname.length; n++) {
        if (pathname[n] === '%') {
            const third = pathname.codePointAt(n + 2) | 0x20;
            if (pathname[n + 1] === '2' && third === 102) {
                throw new errors.TypeError('ERR_INVALID_FILE_URL_PATH', 'must not include encoded / characters');
            }
        }
    }
    return decodeURIComponent(pathname);
}
function pathToFilename(path) {
    if (typeof path !== 'string' && !buffer_1.Buffer.isBuffer(path)) {
        try {
            if (!(path instanceof (__webpack_require__(40).URL)))
                throw new TypeError(constants_1.ERRSTR.PATH_STR);
        }
        catch (err) {
            throw new TypeError(constants_1.ERRSTR.PATH_STR);
        }
        path = getPathFromURLPosix(path);
    }
    const pathString = String(path);
    nullCheck(pathString);
    // return slash(pathString);
    return pathString;
}
exports.pathToFilename = pathToFilename;
const ENOENT = 'ENOENT';
const EBADF = 'EBADF';
const EINVAL = 'EINVAL';
const EPERM = 'EPERM';
const EPROTO = 'EPROTO';
const EEXIST = 'EEXIST';
const ENOTDIR = 'ENOTDIR';
const EMFILE = 'EMFILE';
const EACCES = 'EACCES';
const EISDIR = 'EISDIR';
const ENOTEMPTY = 'ENOTEMPTY';
const ENOSYS = 'ENOSYS';
const ERR_FS_EISDIR = 'ERR_FS_EISDIR';
const ERR_OUT_OF_RANGE = 'ERR_OUT_OF_RANGE';
function formatError(errorCode, func = '', path = '', path2 = '') {
    let pathFormatted = '';
    if (path)
        pathFormatted = ` '${path}'`;
    if (path2)
        pathFormatted += ` -> '${path2}'`;
    switch (errorCode) {
        case ENOENT:
            return `ENOENT: no such file or directory, ${func}${pathFormatted}`;
        case EBADF:
            return `EBADF: bad file descriptor, ${func}${pathFormatted}`;
        case EINVAL:
            return `EINVAL: invalid argument, ${func}${pathFormatted}`;
        case EPERM:
            return `EPERM: operation not permitted, ${func}${pathFormatted}`;
        case EPROTO:
            return `EPROTO: protocol error, ${func}${pathFormatted}`;
        case EEXIST:
            return `EEXIST: file already exists, ${func}${pathFormatted}`;
        case ENOTDIR:
            return `ENOTDIR: not a directory, ${func}${pathFormatted}`;
        case EISDIR:
            return `EISDIR: illegal operation on a directory, ${func}${pathFormatted}`;
        case EACCES:
            return `EACCES: permission denied, ${func}${pathFormatted}`;
        case ENOTEMPTY:
            return `ENOTEMPTY: directory not empty, ${func}${pathFormatted}`;
        case EMFILE:
            return `EMFILE: too many open files, ${func}${pathFormatted}`;
        case ENOSYS:
            return `ENOSYS: function not implemented, ${func}${pathFormatted}`;
        case ERR_FS_EISDIR:
            return `[ERR_FS_EISDIR]: Path is a directory: ${func} returned EISDIR (is a directory) ${path}`;
        case ERR_OUT_OF_RANGE:
            return `[ERR_OUT_OF_RANGE]: value out of range, ${func}${pathFormatted}`;
        default:
            return `${errorCode}: error occurred, ${func}${pathFormatted}`;
    }
}
function createError(errorCode, func = '', path = '', path2 = '', Constructor = Error) {
    const error = new Constructor(formatError(errorCode, func, path, path2));
    error.code = errorCode;
    if (path) {
        error.path = path;
    }
    return error;
}
exports.createError = createError;
function genRndStr6() {
    const str = (Math.random() + 1).toString(36).substring(2, 8);
    if (str.length === 6)
        return str;
    else
        return genRndStr6();
}
exports.genRndStr6 = genRndStr6;
function flagsToNumber(flags) {
    if (typeof flags === 'number')
        return flags;
    if (typeof flags === 'string') {
        const flagsNum = constants_1.FLAGS[flags];
        if (typeof flagsNum !== 'undefined')
            return flagsNum;
    }
    // throw new TypeError(formatError(ERRSTR_FLAG(flags)));
    throw new errors.TypeError('ERR_INVALID_OPT_VALUE', 'flags', flags);
}
exports.flagsToNumber = flagsToNumber;
function isFd(path) {
    return path >>> 0 === path;
}
exports.isFd = isFd;
function validateFd(fd) {
    if (!isFd(fd))
        throw TypeError(constants_1.ERRSTR.FD);
}
exports.validateFd = validateFd;
function dataToBuffer(data, encoding = encoding_1.ENCODING_UTF8) {
    if (buffer_1.Buffer.isBuffer(data))
        return data;
    else if (data instanceof Uint8Array)
        return (0, buffer_2.bufferFrom)(data);
    else
        return (0, buffer_2.bufferFrom)(String(data), encoding);
}
exports.dataToBuffer = dataToBuffer;
const bufToUint8 = (buf) => new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
exports.bufToUint8 = bufToUint8;
const getWriteArgs = (fd, a, b, c, d, e) => {
    validateFd(fd);
    let offset = 0;
    let length;
    let position = null;
    let encoding;
    let callback;
    const tipa = typeof a;
    const tipb = typeof b;
    const tipc = typeof c;
    const tipd = typeof d;
    if (tipa !== 'string') {
        if (tipb === 'function') {
            callback = b;
        }
        else if (tipc === 'function') {
            offset = b | 0;
            callback = c;
        }
        else if (tipd === 'function') {
            offset = b | 0;
            length = c;
            callback = d;
        }
        else {
            offset = b | 0;
            length = c;
            position = d;
            callback = e;
        }
    }
    else {
        if (tipb === 'function') {
            callback = b;
        }
        else if (tipc === 'function') {
            position = b;
            callback = c;
        }
        else if (tipd === 'function') {
            position = b;
            encoding = c;
            callback = d;
        }
    }
    const buf = dataToBuffer(a, encoding);
    if (tipa !== 'string') {
        if (typeof length === 'undefined')
            length = buf.length;
    }
    else {
        offset = 0;
        length = buf.length;
    }
    const cb = validateCallback(callback);
    return [fd, tipa === 'string', buf, offset, length, position, cb];
};
exports.getWriteArgs = getWriteArgs;
const getWriteSyncArgs = (fd, a, b, c, d) => {
    validateFd(fd);
    let encoding;
    let offset;
    let length;
    let position;
    const isBuffer = typeof a !== 'string';
    if (isBuffer) {
        offset = (b || 0) | 0;
        length = c;
        position = d;
    }
    else {
        position = b;
        encoding = c;
    }
    const buf = dataToBuffer(a, encoding);
    if (isBuffer) {
        if (typeof length === 'undefined') {
            length = buf.length;
        }
    }
    else {
        offset = 0;
        length = buf.length;
    }
    return [fd, buf, offset || 0, length, position];
};
exports.getWriteSyncArgs = getWriteSyncArgs;
function bufferToEncoding(buffer, encoding) {
    if (!encoding || encoding === 'buffer')
        return buffer;
    else
        return buffer.toString(encoding);
}
exports.bufferToEncoding = bufferToEncoding;
const isSeparator = (str, i) => {
    let char = str[i];
    return i > 0 && (char === '/' || (exports.isWin && char === '\\'));
};
const removeTrailingSeparator = (str) => {
    let i = str.length - 1;
    if (i < 2)
        return str;
    while (isSeparator(str, i))
        i--;
    return str.substr(0, i + 1);
};
const normalizePath = (str, stripTrailing) => {
    if (typeof str !== 'string')
        throw new TypeError('expected a string');
    str = str.replace(/[\\\/]+/g, '/');
    if (stripTrailing !== false)
        str = removeTrailingSeparator(str);
    return str;
};
const unixify = (filepath, stripTrailing = true) => {
    if (exports.isWin) {
        filepath = normalizePath(filepath, stripTrailing);
        return filepath.replace(/^([a-zA-Z]+:|\.\/)/, '');
    }
    return filepath;
};
exports.unixify = unixify;
//# sourceMappingURL=util.js.map

/***/ }),
/* 39 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports["default"] = typeof queueMicrotask === 'function' ? queueMicrotask : (cb => Promise.resolve()
    .then(() => cb())
    .catch(() => { }));
//# sourceMappingURL=queueMicrotask.js.map

/***/ }),
/* 40 */
/***/ (function(__unused_webpack_module, exports) {

if (typeof URL === 'undefined') {
  throw new Error('URL is not supported in this environment')
}

exports.URL = URL


/***/ }),
/* 41 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsPromises = void 0;
const util_1 = __webpack_require__(38);
const constants_1 = __webpack_require__(6);
class FsPromises {
    constructor(fs, FileHandle) {
        this.fs = fs;
        this.FileHandle = FileHandle;
        this.constants = constants_1.constants;
        this.cp = (0, util_1.promisify)(this.fs, 'cp');
        this.opendir = (0, util_1.promisify)(this.fs, 'opendir');
        this.statfs = (0, util_1.promisify)(this.fs, 'statfs');
        this.lutimes = (0, util_1.promisify)(this.fs, 'lutimes');
        this.access = (0, util_1.promisify)(this.fs, 'access');
        this.chmod = (0, util_1.promisify)(this.fs, 'chmod');
        this.chown = (0, util_1.promisify)(this.fs, 'chown');
        this.copyFile = (0, util_1.promisify)(this.fs, 'copyFile');
        this.lchmod = (0, util_1.promisify)(this.fs, 'lchmod');
        this.lchown = (0, util_1.promisify)(this.fs, 'lchown');
        this.link = (0, util_1.promisify)(this.fs, 'link');
        this.lstat = (0, util_1.promisify)(this.fs, 'lstat');
        this.mkdir = (0, util_1.promisify)(this.fs, 'mkdir');
        this.mkdtemp = (0, util_1.promisify)(this.fs, 'mkdtemp');
        this.readdir = (0, util_1.promisify)(this.fs, 'readdir');
        this.readlink = (0, util_1.promisify)(this.fs, 'readlink');
        this.realpath = (0, util_1.promisify)(this.fs, 'realpath');
        this.rename = (0, util_1.promisify)(this.fs, 'rename');
        this.rmdir = (0, util_1.promisify)(this.fs, 'rmdir');
        this.rm = (0, util_1.promisify)(this.fs, 'rm');
        this.stat = (0, util_1.promisify)(this.fs, 'stat');
        this.symlink = (0, util_1.promisify)(this.fs, 'symlink');
        this.truncate = (0, util_1.promisify)(this.fs, 'truncate');
        this.unlink = (0, util_1.promisify)(this.fs, 'unlink');
        this.utimes = (0, util_1.promisify)(this.fs, 'utimes');
        this.readFile = (id, options) => {
            return (0, util_1.promisify)(this.fs, 'readFile')(id instanceof this.FileHandle ? id.fd : id, options);
        };
        this.appendFile = (path, data, options) => {
            return (0, util_1.promisify)(this.fs, 'appendFile')(path instanceof this.FileHandle ? path.fd : path, data, options);
        };
        this.open = (path, flags = 'r', mode) => {
            return (0, util_1.promisify)(this.fs, 'open', fd => new this.FileHandle(this.fs, fd))(path, flags, mode);
        };
        this.writeFile = (id, data, options) => {
            return (0, util_1.promisify)(this.fs, 'writeFile')(id instanceof this.FileHandle ? id.fd : id, data, options);
        };
        this.watch = () => {
            throw new Error('Not implemented');
        };
    }
}
exports.FsPromises = FsPromises;
//# sourceMappingURL=FsPromises.js.map

/***/ }),
/* 42 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.testDirectoryIsWritable = exports.pathToLocation = void 0;
const pathToLocation = (path) => {
    if (path[0] === "/" /* FsaToNodeConstants.Separator */)
        path = path.slice(1);
    if (path[path.length - 1] === "/" /* FsaToNodeConstants.Separator */)
        path = path.slice(0, -1);
    const lastSlashIndex = path.lastIndexOf("/" /* FsaToNodeConstants.Separator */);
    if (lastSlashIndex === -1)
        return [[], path];
    const file = path.slice(lastSlashIndex + 1);
    const folder = path.slice(0, lastSlashIndex).split("/" /* FsaToNodeConstants.Separator */);
    return [folder, file];
};
exports.pathToLocation = pathToLocation;
const testDirectoryIsWritable = async (dir) => {
    const testFileName = '__memfs_writable_test_file_' + Math.random().toString(36).slice(2) + Date.now();
    try {
        await dir.getFileHandle(testFileName, { create: true });
        return true;
    }
    catch (_a) {
        return false;
    }
    finally {
        try {
            await dir.removeEntry(testFileName);
        }
        catch (e) { }
    }
};
exports.testDirectoryIsWritable = testDirectoryIsWritable;
//# sourceMappingURL=util.js.map

/***/ }),
/* 43 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeDirent = void 0;
class FsaNodeDirent {
    constructor(name, kind) {
        this.name = name;
        this.kind = kind;
    }
    isDirectory() {
        return this.kind === 'directory';
    }
    isFile() {
        return this.kind === 'file';
    }
    isBlockDevice() {
        return false;
    }
    isCharacterDevice() {
        return false;
    }
    isSymbolicLink() {
        return false;
    }
    isFIFO() {
        return false;
    }
    isSocket() {
        return false;
    }
}
exports.FsaNodeDirent = FsaNodeDirent;
//# sourceMappingURL=FsaNodeDirent.js.map

/***/ }),
/* 44 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeStats = void 0;
const time = 0;
const timex = typeof BigInt === 'function' ? BigInt(time) : time;
const date = new Date(time);
class FsaNodeStats {
    constructor(isBigInt, size, kind) {
        this.kind = kind;
        const dummy = (isBigInt ? timex : time);
        this.uid = dummy;
        this.gid = dummy;
        this.rdev = dummy;
        this.blksize = dummy;
        this.ino = dummy;
        this.size = size;
        this.blocks = dummy;
        this.atime = date;
        this.mtime = date;
        this.ctime = date;
        this.birthtime = date;
        this.atimeMs = dummy;
        this.mtimeMs = dummy;
        this.ctimeMs = dummy;
        this.birthtimeMs = dummy;
        this.dev = dummy;
        this.mode = dummy;
        this.nlink = dummy;
    }
    isDirectory() {
        return this.kind === 'directory';
    }
    isFile() {
        return this.kind === 'file';
    }
    isBlockDevice() {
        return false;
    }
    isCharacterDevice() {
        return false;
    }
    isSymbolicLink() {
        return false;
    }
    isFIFO() {
        return false;
    }
    isSocket() {
        return false;
    }
}
exports.FsaNodeStats = FsaNodeStats;
//# sourceMappingURL=FsaNodeStats.js.map

/***/ }),
/* 45 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeWriteStream = void 0;
const stream_1 = __webpack_require__(46);
const Defer_1 = __webpack_require__(74);
const concurrency_1 = __webpack_require__(75);
const util_1 = __webpack_require__(38);
const queueMicrotask_1 = __webpack_require__(39);
/**
 * This WriteStream implementation does not build on top of the `fs` module,
 * but instead uses the lower-level `FileSystemFileHandle` interface. The reason
 * is the different semantics in `fs` and FSA (File System Access API) write streams.
 *
 * When data is written to an FSA file, a new FSA stream is created, it copies
 * the file to a temporary swap file. After each written chunk, that swap file
 * is closed and the original file is replaced with the swap file. This means,
 * if WriteStream was built on top of `fs`, each chunk write would result in
 * a file copy, write, close, rename operations, which is not what we want.
 *
 * Instead this implementation hooks into the lower-level and closes the swap
 * file only once the stream is closed. The downside is that the written data
 * is not immediately visible to other processes (because it is written to the
 * swap file), but that is the trade-off we have to make.
 *
 * @todo Could make this flush the data to the original file periodically, so that
 *       the data is visible to other processes.
 * @todo This stream could work through `FileSystemSyncAccessHandle.write` in a
 *       Worker thread instead.
 */
class FsaNodeWriteStream extends stream_1.Writable {
    constructor(handle, path, options) {
        super();
        this.path = path;
        this.options = options;
        this.__pending__ = true;
        this.__closed__ = false;
        this.__bytes__ = 0;
        this.__mutex__ = (0, concurrency_1.concurrency)(1);
        if (options.start !== undefined) {
            if (typeof options.start !== 'number') {
                throw new TypeError('"start" option must be a Number');
            }
            if (options.start < 0) {
                throw new TypeError('"start" must be >= zero');
            }
        }
        const stream = new Defer_1.Defer();
        this.__stream__ = stream.promise;
        (async () => {
            var _a, _b;
            const fsaHandle = await handle;
            const fileWasOpened = !options.fd;
            if (fileWasOpened)
                this.emit('open', fsaHandle.fd);
            const flags = (0, util_1.flagsToNumber)((_a = options.flags) !== null && _a !== void 0 ? _a : 'w');
            const keepExistingData = flags & 1024 /* FLAG.O_APPEND */ ? true : false;
            const writable = await fsaHandle.file.createWritable({ keepExistingData });
            if (keepExistingData) {
                const start = Number((_b = options.start) !== null && _b !== void 0 ? _b : 0);
                if (start)
                    await writable.seek(start);
            }
            this.__pending__ = false;
            stream.resolve(writable);
        })().catch(error => {
            stream.reject(error);
        });
    }
    async ___write___(buffers) {
        await this.__mutex__(async () => {
            if (this.__closed__)
                return;
            // if (this.__closed__) throw new Error('WriteStream is closed');
            const writable = await this.__stream__;
            for (const buffer of buffers) {
                await writable.write(buffer);
                this.__bytes__ += buffer.byteLength;
            }
        });
    }
    async __close__() {
        const emitClose = this.options.emitClose;
        await this.__mutex__(async () => {
            if (this.__closed__ && emitClose) {
                (0, queueMicrotask_1.default)(() => this.emit('close'));
                return;
            }
            try {
                const writable = await this.__stream__;
                this.__closed__ = true;
                await writable.close();
                if (emitClose)
                    this.emit('close');
            }
            catch (error) {
                this.emit('error', error);
                if (emitClose)
                    this.emit('close', error);
            }
        });
    }
    // ------------------------------------------------------------- IWriteStream
    get bytesWritten() {
        return this.__bytes__;
    }
    get pending() {
        return this.__pending__;
    }
    close(cb) {
        if (cb)
            this.once('close', cb);
        this.__close__().catch(() => { });
    }
    // ----------------------------------------------------------------- Writable
    _write(chunk, encoding, callback) {
        this.___write___([chunk])
            .then(() => {
            if (callback)
                callback(null);
        })
            .catch(error => {
            if (callback)
                callback(error);
        });
    }
    _writev(chunks, callback) {
        const buffers = chunks.map(({ chunk }) => chunk);
        this.___write___(buffers)
            .then(() => {
            if (callback)
                callback(null);
        })
            .catch(error => {
            if (callback)
                callback(error);
        });
    }
    _final(callback) {
        this.__close__()
            .then(() => {
            if (callback)
                callback(null);
        })
            .catch(error => {
            if (callback)
                callback(error);
        });
    }
}
exports.FsaNodeWriteStream = FsaNodeWriteStream;
//# sourceMappingURL=FsaNodeWriteStream.js.map

/***/ }),
/* 46 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const CustomStream = __webpack_require__(47)
const promises = __webpack_require__(73)
const originalDestroy = CustomStream.Readable.destroy
module.exports = CustomStream.Readable

// Explicit export naming is needed for ESM
module.exports._uint8ArrayToBuffer = CustomStream._uint8ArrayToBuffer
module.exports._isUint8Array = CustomStream._isUint8Array
module.exports.isDisturbed = CustomStream.isDisturbed
module.exports.isErrored = CustomStream.isErrored
module.exports.isReadable = CustomStream.isReadable
module.exports.Readable = CustomStream.Readable
module.exports.Writable = CustomStream.Writable
module.exports.Duplex = CustomStream.Duplex
module.exports.Transform = CustomStream.Transform
module.exports.PassThrough = CustomStream.PassThrough
module.exports.addAbortSignal = CustomStream.addAbortSignal
module.exports.finished = CustomStream.finished
module.exports.destroy = CustomStream.destroy
module.exports.destroy = originalDestroy
module.exports.pipeline = CustomStream.pipeline
module.exports.compose = CustomStream.compose
Object.defineProperty(CustomStream, 'promises', {
  configurable: true,
  enumerable: true,
  get() {
    return promises
  }
})
module.exports.Stream = CustomStream.Stream

// Allow default importing
module.exports["default"] = module.exports


/***/ }),
/* 47 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* replacement start */

const { Buffer } = __webpack_require__(9)

/* replacement end */
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

;('use strict')
const { ObjectDefineProperty, ObjectKeys, ReflectApply } = __webpack_require__(48)
const {
  promisify: { custom: customPromisify }
} = __webpack_require__(49)
const { streamReturningOperators, promiseReturningOperators } = __webpack_require__(52)
const {
  codes: { ERR_ILLEGAL_CONSTRUCTOR }
} = __webpack_require__(53)
const compose = __webpack_require__(57)
const { setDefaultHighWaterMark, getDefaultHighWaterMark } = __webpack_require__(65)
const { pipeline } = __webpack_require__(58)
const { destroyer } = __webpack_require__(59)
const eos = __webpack_require__(55)
const internalBuffer = {}
const promises = __webpack_require__(73)
const utils = __webpack_require__(56)
const Stream = (module.exports = __webpack_require__(62).Stream)
Stream.isDestroyed = utils.isDestroyed
Stream.isDisturbed = utils.isDisturbed
Stream.isErrored = utils.isErrored
Stream.isReadable = utils.isReadable
Stream.isWritable = utils.isWritable
Stream.Readable = __webpack_require__(61)
for (const key of ObjectKeys(streamReturningOperators)) {
  const op = streamReturningOperators[key]
  function fn(...args) {
    if (new.target) {
      throw ERR_ILLEGAL_CONSTRUCTOR()
    }
    return Stream.Readable.from(ReflectApply(op, this, args))
  }
  ObjectDefineProperty(fn, 'name', {
    __proto__: null,
    value: op.name
  })
  ObjectDefineProperty(fn, 'length', {
    __proto__: null,
    value: op.length
  })
  ObjectDefineProperty(Stream.Readable.prototype, key, {
    __proto__: null,
    value: fn,
    enumerable: false,
    configurable: true,
    writable: true
  })
}
for (const key of ObjectKeys(promiseReturningOperators)) {
  const op = promiseReturningOperators[key]
  function fn(...args) {
    if (new.target) {
      throw ERR_ILLEGAL_CONSTRUCTOR()
    }
    return ReflectApply(op, this, args)
  }
  ObjectDefineProperty(fn, 'name', {
    __proto__: null,
    value: op.name
  })
  ObjectDefineProperty(fn, 'length', {
    __proto__: null,
    value: op.length
  })
  ObjectDefineProperty(Stream.Readable.prototype, key, {
    __proto__: null,
    value: fn,
    enumerable: false,
    configurable: true,
    writable: true
  })
}
Stream.Writable = __webpack_require__(69)
Stream.Duplex = __webpack_require__(60)
Stream.Transform = __webpack_require__(72)
Stream.PassThrough = __webpack_require__(71)
Stream.pipeline = pipeline
const { addAbortSignal } = __webpack_require__(63)
Stream.addAbortSignal = addAbortSignal
Stream.finished = eos
Stream.destroy = destroyer
Stream.compose = compose
Stream.setDefaultHighWaterMark = setDefaultHighWaterMark
Stream.getDefaultHighWaterMark = getDefaultHighWaterMark
ObjectDefineProperty(Stream, 'promises', {
  __proto__: null,
  configurable: true,
  enumerable: true,
  get() {
    return promises
  }
})
ObjectDefineProperty(pipeline, customPromisify, {
  __proto__: null,
  enumerable: true,
  get() {
    return promises.pipeline
  }
})
ObjectDefineProperty(eos, customPromisify, {
  __proto__: null,
  enumerable: true,
  get() {
    return promises.finished
  }
})

// Backwards-compat with node 0.4.x
Stream.Stream = Stream
Stream._isUint8Array = function isUint8Array(value) {
  return value instanceof Uint8Array
}
Stream._uint8ArrayToBuffer = function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
}


/***/ }),
/* 48 */
/***/ (function(module) {

"use strict";


/*
  This file is a reduced and adapted version of the main lib/internal/per_context/primordials.js file defined at

  https://github.com/nodejs/node/blob/master/lib/internal/per_context/primordials.js

  Don't try to replace with the original file and keep it up to date with the upstream file.
*/
module.exports = {
  ArrayIsArray(self) {
    return Array.isArray(self)
  },
  ArrayPrototypeIncludes(self, el) {
    return self.includes(el)
  },
  ArrayPrototypeIndexOf(self, el) {
    return self.indexOf(el)
  },
  ArrayPrototypeJoin(self, sep) {
    return self.join(sep)
  },
  ArrayPrototypeMap(self, fn) {
    return self.map(fn)
  },
  ArrayPrototypePop(self, el) {
    return self.pop(el)
  },
  ArrayPrototypePush(self, el) {
    return self.push(el)
  },
  ArrayPrototypeSlice(self, start, end) {
    return self.slice(start, end)
  },
  Error,
  FunctionPrototypeCall(fn, thisArgs, ...args) {
    return fn.call(thisArgs, ...args)
  },
  FunctionPrototypeSymbolHasInstance(self, instance) {
    return Function.prototype[Symbol.hasInstance].call(self, instance)
  },
  MathFloor: Math.floor,
  Number,
  NumberIsInteger: Number.isInteger,
  NumberIsNaN: Number.isNaN,
  NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
  NumberParseInt: Number.parseInt,
  ObjectDefineProperties(self, props) {
    return Object.defineProperties(self, props)
  },
  ObjectDefineProperty(self, name, prop) {
    return Object.defineProperty(self, name, prop)
  },
  ObjectGetOwnPropertyDescriptor(self, name) {
    return Object.getOwnPropertyDescriptor(self, name)
  },
  ObjectKeys(obj) {
    return Object.keys(obj)
  },
  ObjectSetPrototypeOf(target, proto) {
    return Object.setPrototypeOf(target, proto)
  },
  Promise,
  PromisePrototypeCatch(self, fn) {
    return self.catch(fn)
  },
  PromisePrototypeThen(self, thenFn, catchFn) {
    return self.then(thenFn, catchFn)
  },
  PromiseReject(err) {
    return Promise.reject(err)
  },
  PromiseResolve(val) {
    return Promise.resolve(val)
  },
  ReflectApply: Reflect.apply,
  RegExpPrototypeTest(self, value) {
    return self.test(value)
  },
  SafeSet: Set,
  String,
  StringPrototypeSlice(self, start, end) {
    return self.slice(start, end)
  },
  StringPrototypeToLowerCase(self) {
    return self.toLowerCase()
  },
  StringPrototypeToUpperCase(self) {
    return self.toUpperCase()
  },
  StringPrototypeTrim(self) {
    return self.trim()
  },
  Symbol,
  SymbolFor: Symbol.for,
  SymbolAsyncIterator: Symbol.asyncIterator,
  SymbolHasInstance: Symbol.hasInstance,
  SymbolIterator: Symbol.iterator,
  SymbolDispose: Symbol.dispose || Symbol('Symbol.dispose'),
  SymbolAsyncDispose: Symbol.asyncDispose || Symbol('Symbol.asyncDispose'),
  TypedArrayPrototypeSet(self, buf, len) {
    return self.set(buf, len)
  },
  Boolean: Boolean,
  Uint8Array
}


/***/ }),
/* 49 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const bufferModule = __webpack_require__(9)
const { kResistStopPropagation, SymbolDispose } = __webpack_require__(48)
const AbortSignal = globalThis.AbortSignal || (__webpack_require__(50).AbortSignal)
const AbortController = globalThis.AbortController || (__webpack_require__(50).AbortController)
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const Blob = globalThis.Blob || bufferModule.Blob
/* eslint-disable indent */
const isBlob =
  typeof Blob !== 'undefined'
    ? function isBlob(b) {
        // eslint-disable-next-line indent
        return b instanceof Blob
      }
    : function isBlob(b) {
        return false
      }
/* eslint-enable indent */

const validateAbortSignal = (signal, name) => {
  if (signal !== undefined && (signal === null || typeof signal !== 'object' || !('aborted' in signal))) {
    throw new ERR_INVALID_ARG_TYPE(name, 'AbortSignal', signal)
  }
}
const validateFunction = (value, name) => {
  if (typeof value !== 'function') throw new ERR_INVALID_ARG_TYPE(name, 'Function', value)
}

// This is a simplified version of AggregateError
class AggregateError extends Error {
  constructor(errors) {
    if (!Array.isArray(errors)) {
      throw new TypeError(`Expected input to be an Array, got ${typeof errors}`)
    }
    let message = ''
    for (let i = 0; i < errors.length; i++) {
      message += `    ${errors[i].stack}\n`
    }
    super(message)
    this.name = 'AggregateError'
    this.errors = errors
  }
}
module.exports = {
  AggregateError,
  kEmptyObject: Object.freeze({}),
  once(callback) {
    let called = false
    return function (...args) {
      if (called) {
        return
      }
      called = true
      callback.apply(this, args)
    }
  },
  createDeferredPromise: function () {
    let resolve
    let reject

    // eslint-disable-next-line promise/param-names
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    return {
      promise,
      resolve,
      reject
    }
  },
  promisify(fn) {
    return new Promise((resolve, reject) => {
      fn((err, ...args) => {
        if (err) {
          return reject(err)
        }
        return resolve(...args)
      })
    })
  },
  debuglog() {
    return function () {}
  },
  format(format, ...args) {
    // Simplified version of https://nodejs.org/api/util.html#utilformatformat-args
    return format.replace(/%([sdifj])/g, function (...[_unused, type]) {
      const replacement = args.shift()
      if (type === 'f') {
        return replacement.toFixed(6)
      } else if (type === 'j') {
        return JSON.stringify(replacement)
      } else if (type === 's' && typeof replacement === 'object') {
        const ctor = replacement.constructor !== Object ? replacement.constructor.name : ''
        return `${ctor} {}`.trim()
      } else {
        return replacement.toString()
      }
    })
  },
  inspect(value) {
    // Vastly simplified version of https://nodejs.org/api/util.html#utilinspectobject-options
    switch (typeof value) {
      case 'string':
        if (value.includes("'")) {
          if (!value.includes('"')) {
            return `"${value}"`
          } else if (!value.includes('`') && !value.includes('${')) {
            return `\`${value}\``
          }
        }
        return `'${value}'`
      case 'number':
        if (isNaN(value)) {
          return 'NaN'
        } else if (Object.is(value, -0)) {
          return String(value)
        }
        return value
      case 'bigint':
        return `${String(value)}n`
      case 'boolean':
      case 'undefined':
        return String(value)
      case 'object':
        return '{}'
    }
  },
  types: {
    isAsyncFunction(fn) {
      return fn instanceof AsyncFunction
    },
    isArrayBufferView(arr) {
      return ArrayBuffer.isView(arr)
    }
  },
  isBlob,
  deprecate(fn, message) {
    return fn
  },
  addAbortListener:
    (__webpack_require__(51).addAbortListener) ||
    function addAbortListener(signal, listener) {
      if (signal === undefined) {
        throw new ERR_INVALID_ARG_TYPE('signal', 'AbortSignal', signal)
      }
      validateAbortSignal(signal, 'signal')
      validateFunction(listener, 'listener')
      let removeEventListener
      if (signal.aborted) {
        queueMicrotask(() => listener())
      } else {
        signal.addEventListener('abort', listener, {
          __proto__: null,
          once: true,
          [kResistStopPropagation]: true
        })
        removeEventListener = () => {
          signal.removeEventListener('abort', listener)
        }
      }
      return {
        __proto__: null,
        [SymbolDispose]() {
          var _removeEventListener
          ;(_removeEventListener = removeEventListener) === null || _removeEventListener === undefined
            ? undefined
            : _removeEventListener()
        }
      }
    },
  AbortSignalAny:
    AbortSignal.any ||
    function AbortSignalAny(signals) {
      // Fast path if there is only one signal.
      if (signals.length === 1) {
        return signals[0]
      }
      const ac = new AbortController()
      const abort = () => ac.abort()
      signals.forEach((signal) => {
        validateAbortSignal(signal, 'signals')
        signal.addEventListener('abort', abort, {
          once: true
        })
      })
      ac.signal.addEventListener(
        'abort',
        () => {
          signals.forEach((signal) => signal.removeEventListener('abort', abort))
        },
        {
          once: true
        }
      )
      return ac.signal
    }
}
module.exports.promisify.custom = Symbol.for('nodejs.util.promisify.custom')


/***/ }),
/* 50 */
/***/ (function(module) {

"use strict";
/*globals self, window */


/*eslint-disable @mysticatea/prettier */
const { AbortController, AbortSignal } =
    typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    /* otherwise */ undefined
/*eslint-enable @mysticatea/prettier */

module.exports = AbortController
module.exports.AbortSignal = AbortSignal
module.exports["default"] = AbortController


/***/ }),
/* 51 */
/***/ (function(module) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}


/***/ }),
/* 52 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const AbortController = globalThis.AbortController || (__webpack_require__(50).AbortController)
const {
  codes: { ERR_INVALID_ARG_VALUE, ERR_INVALID_ARG_TYPE, ERR_MISSING_ARGS, ERR_OUT_OF_RANGE },
  AbortError
} = __webpack_require__(53)
const { validateAbortSignal, validateInteger, validateObject } = __webpack_require__(54)
const kWeakHandler = (__webpack_require__(48).Symbol)('kWeak')
const kResistStopPropagation = (__webpack_require__(48).Symbol)('kResistStopPropagation')
const { finished } = __webpack_require__(55)
const staticCompose = __webpack_require__(57)
const { addAbortSignalNoValidate } = __webpack_require__(63)
const { isWritable, isNodeStream } = __webpack_require__(56)
const { deprecate } = __webpack_require__(49)
const {
  ArrayPrototypePush,
  Boolean,
  MathFloor,
  Number,
  NumberIsNaN,
  Promise,
  PromiseReject,
  PromiseResolve,
  PromisePrototypeThen,
  Symbol
} = __webpack_require__(48)
const kEmpty = Symbol('kEmpty')
const kEof = Symbol('kEof')
function compose(stream, options) {
  if (options != null) {
    validateObject(options, 'options')
  }
  if ((options === null || options === undefined ? undefined : options.signal) != null) {
    validateAbortSignal(options.signal, 'options.signal')
  }
  if (isNodeStream(stream) && !isWritable(stream)) {
    throw new ERR_INVALID_ARG_VALUE('stream', stream, 'must be writable')
  }
  const composedStream = staticCompose(this, stream)
  if (options !== null && options !== undefined && options.signal) {
    // Not validating as we already validated before
    addAbortSignalNoValidate(options.signal, composedStream)
  }
  return composedStream
}
function map(fn, options) {
  if (typeof fn !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('fn', ['Function', 'AsyncFunction'], fn)
  }
  if (options != null) {
    validateObject(options, 'options')
  }
  if ((options === null || options === undefined ? undefined : options.signal) != null) {
    validateAbortSignal(options.signal, 'options.signal')
  }
  let concurrency = 1
  if ((options === null || options === undefined ? undefined : options.concurrency) != null) {
    concurrency = MathFloor(options.concurrency)
  }
  let highWaterMark = concurrency - 1
  if ((options === null || options === undefined ? undefined : options.highWaterMark) != null) {
    highWaterMark = MathFloor(options.highWaterMark)
  }
  validateInteger(concurrency, 'options.concurrency', 1)
  validateInteger(highWaterMark, 'options.highWaterMark', 0)
  highWaterMark += concurrency
  return async function* map() {
    const signal = (__webpack_require__(49).AbortSignalAny)(
      [options === null || options === undefined ? undefined : options.signal].filter(Boolean)
    )
    const stream = this
    const queue = []
    const signalOpt = {
      signal
    }
    let next
    let resume
    let done = false
    let cnt = 0
    function onCatch() {
      done = true
      afterItemProcessed()
    }
    function afterItemProcessed() {
      cnt -= 1
      maybeResume()
    }
    function maybeResume() {
      if (resume && !done && cnt < concurrency && queue.length < highWaterMark) {
        resume()
        resume = null
      }
    }
    async function pump() {
      try {
        for await (let val of stream) {
          if (done) {
            return
          }
          if (signal.aborted) {
            throw new AbortError()
          }
          try {
            val = fn(val, signalOpt)
            if (val === kEmpty) {
              continue
            }
            val = PromiseResolve(val)
          } catch (err) {
            val = PromiseReject(err)
          }
          cnt += 1
          PromisePrototypeThen(val, afterItemProcessed, onCatch)
          queue.push(val)
          if (next) {
            next()
            next = null
          }
          if (!done && (queue.length >= highWaterMark || cnt >= concurrency)) {
            await new Promise((resolve) => {
              resume = resolve
            })
          }
        }
        queue.push(kEof)
      } catch (err) {
        const val = PromiseReject(err)
        PromisePrototypeThen(val, afterItemProcessed, onCatch)
        queue.push(val)
      } finally {
        done = true
        if (next) {
          next()
          next = null
        }
      }
    }
    pump()
    try {
      while (true) {
        while (queue.length > 0) {
          const val = await queue[0]
          if (val === kEof) {
            return
          }
          if (signal.aborted) {
            throw new AbortError()
          }
          if (val !== kEmpty) {
            yield val
          }
          queue.shift()
          maybeResume()
        }
        await new Promise((resolve) => {
          next = resolve
        })
      }
    } finally {
      done = true
      if (resume) {
        resume()
        resume = null
      }
    }
  }.call(this)
}
function asIndexedPairs(options = undefined) {
  if (options != null) {
    validateObject(options, 'options')
  }
  if ((options === null || options === undefined ? undefined : options.signal) != null) {
    validateAbortSignal(options.signal, 'options.signal')
  }
  return async function* asIndexedPairs() {
    let index = 0
    for await (const val of this) {
      var _options$signal
      if (
        options !== null &&
        options !== undefined &&
        (_options$signal = options.signal) !== null &&
        _options$signal !== undefined &&
        _options$signal.aborted
      ) {
        throw new AbortError({
          cause: options.signal.reason
        })
      }
      yield [index++, val]
    }
  }.call(this)
}
async function some(fn, options = undefined) {
  for await (const unused of filter.call(this, fn, options)) {
    return true
  }
  return false
}
async function every(fn, options = undefined) {
  if (typeof fn !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('fn', ['Function', 'AsyncFunction'], fn)
  }
  // https://en.wikipedia.org/wiki/De_Morgan%27s_laws
  return !(await some.call(
    this,
    async (...args) => {
      return !(await fn(...args))
    },
    options
  ))
}
async function find(fn, options) {
  for await (const result of filter.call(this, fn, options)) {
    return result
  }
  return undefined
}
async function forEach(fn, options) {
  if (typeof fn !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('fn', ['Function', 'AsyncFunction'], fn)
  }
  async function forEachFn(value, options) {
    await fn(value, options)
    return kEmpty
  }
  // eslint-disable-next-line no-unused-vars
  for await (const unused of map.call(this, forEachFn, options));
}
function filter(fn, options) {
  if (typeof fn !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('fn', ['Function', 'AsyncFunction'], fn)
  }
  async function filterFn(value, options) {
    if (await fn(value, options)) {
      return value
    }
    return kEmpty
  }
  return map.call(this, filterFn, options)
}

// Specific to provide better error to reduce since the argument is only
// missing if the stream has no items in it - but the code is still appropriate
class ReduceAwareErrMissingArgs extends ERR_MISSING_ARGS {
  constructor() {
    super('reduce')
    this.message = 'Reduce of an empty stream requires an initial value'
  }
}
async function reduce(reducer, initialValue, options) {
  var _options$signal2
  if (typeof reducer !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('reducer', ['Function', 'AsyncFunction'], reducer)
  }
  if (options != null) {
    validateObject(options, 'options')
  }
  if ((options === null || options === undefined ? undefined : options.signal) != null) {
    validateAbortSignal(options.signal, 'options.signal')
  }
  let hasInitialValue = arguments.length > 1
  if (
    options !== null &&
    options !== undefined &&
    (_options$signal2 = options.signal) !== null &&
    _options$signal2 !== undefined &&
    _options$signal2.aborted
  ) {
    const err = new AbortError(undefined, {
      cause: options.signal.reason
    })
    this.once('error', () => {}) // The error is already propagated
    await finished(this.destroy(err))
    throw err
  }
  const ac = new AbortController()
  const signal = ac.signal
  if (options !== null && options !== undefined && options.signal) {
    const opts = {
      once: true,
      [kWeakHandler]: this,
      [kResistStopPropagation]: true
    }
    options.signal.addEventListener('abort', () => ac.abort(), opts)
  }
  let gotAnyItemFromStream = false
  try {
    for await (const value of this) {
      var _options$signal3
      gotAnyItemFromStream = true
      if (
        options !== null &&
        options !== undefined &&
        (_options$signal3 = options.signal) !== null &&
        _options$signal3 !== undefined &&
        _options$signal3.aborted
      ) {
        throw new AbortError()
      }
      if (!hasInitialValue) {
        initialValue = value
        hasInitialValue = true
      } else {
        initialValue = await reducer(initialValue, value, {
          signal
        })
      }
    }
    if (!gotAnyItemFromStream && !hasInitialValue) {
      throw new ReduceAwareErrMissingArgs()
    }
  } finally {
    ac.abort()
  }
  return initialValue
}
async function toArray(options) {
  if (options != null) {
    validateObject(options, 'options')
  }
  if ((options === null || options === undefined ? undefined : options.signal) != null) {
    validateAbortSignal(options.signal, 'options.signal')
  }
  const result = []
  for await (const val of this) {
    var _options$signal4
    if (
      options !== null &&
      options !== undefined &&
      (_options$signal4 = options.signal) !== null &&
      _options$signal4 !== undefined &&
      _options$signal4.aborted
    ) {
      throw new AbortError(undefined, {
        cause: options.signal.reason
      })
    }
    ArrayPrototypePush(result, val)
  }
  return result
}
function flatMap(fn, options) {
  const values = map.call(this, fn, options)
  return async function* flatMap() {
    for await (const val of values) {
      yield* val
    }
  }.call(this)
}
function toIntegerOrInfinity(number) {
  // We coerce here to align with the spec
  // https://github.com/tc39/proposal-iterator-helpers/issues/169
  number = Number(number)
  if (NumberIsNaN(number)) {
    return 0
  }
  if (number < 0) {
    throw new ERR_OUT_OF_RANGE('number', '>= 0', number)
  }
  return number
}
function drop(number, options = undefined) {
  if (options != null) {
    validateObject(options, 'options')
  }
  if ((options === null || options === undefined ? undefined : options.signal) != null) {
    validateAbortSignal(options.signal, 'options.signal')
  }
  number = toIntegerOrInfinity(number)
  return async function* drop() {
    var _options$signal5
    if (
      options !== null &&
      options !== undefined &&
      (_options$signal5 = options.signal) !== null &&
      _options$signal5 !== undefined &&
      _options$signal5.aborted
    ) {
      throw new AbortError()
    }
    for await (const val of this) {
      var _options$signal6
      if (
        options !== null &&
        options !== undefined &&
        (_options$signal6 = options.signal) !== null &&
        _options$signal6 !== undefined &&
        _options$signal6.aborted
      ) {
        throw new AbortError()
      }
      if (number-- <= 0) {
        yield val
      }
    }
  }.call(this)
}
function take(number, options = undefined) {
  if (options != null) {
    validateObject(options, 'options')
  }
  if ((options === null || options === undefined ? undefined : options.signal) != null) {
    validateAbortSignal(options.signal, 'options.signal')
  }
  number = toIntegerOrInfinity(number)
  return async function* take() {
    var _options$signal7
    if (
      options !== null &&
      options !== undefined &&
      (_options$signal7 = options.signal) !== null &&
      _options$signal7 !== undefined &&
      _options$signal7.aborted
    ) {
      throw new AbortError()
    }
    for await (const val of this) {
      var _options$signal8
      if (
        options !== null &&
        options !== undefined &&
        (_options$signal8 = options.signal) !== null &&
        _options$signal8 !== undefined &&
        _options$signal8.aborted
      ) {
        throw new AbortError()
      }
      if (number-- > 0) {
        yield val
      }

      // Don't get another item from iterator in case we reached the end
      if (number <= 0) {
        return
      }
    }
  }.call(this)
}
module.exports.streamReturningOperators = {
  asIndexedPairs: deprecate(asIndexedPairs, 'readable.asIndexedPairs will be removed in a future version.'),
  drop,
  filter,
  flatMap,
  map,
  take,
  compose
}
module.exports.promiseReturningOperators = {
  every,
  forEach,
  reduce,
  toArray,
  some,
  find
}


/***/ }),
/* 53 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { format, inspect, AggregateError: CustomAggregateError } = __webpack_require__(49)

/*
  This file is a reduced and adapted version of the main lib/internal/errors.js file defined at

  https://github.com/nodejs/node/blob/master/lib/internal/errors.js

  Don't try to replace with the original file and keep it up to date (starting from E(...) definitions)
  with the upstream file.
*/

const AggregateError = globalThis.AggregateError || CustomAggregateError
const kIsNodeError = Symbol('kIsNodeError')
const kTypes = [
  'string',
  'function',
  'number',
  'object',
  // Accept 'Function' and 'Object' as alternative to the lower cased version.
  'Function',
  'Object',
  'boolean',
  'bigint',
  'symbol'
]
const classRegExp = /^([A-Z][a-z0-9]*)+$/
const nodeInternalPrefix = '__node_internal_'
const codes = {}
function assert(value, message) {
  if (!value) {
    throw new codes.ERR_INTERNAL_ASSERTION(message)
  }
}

// Only use this for integers! Decimal numbers do not work with this function.
function addNumericalSeparator(val) {
  let res = ''
  let i = val.length
  const start = val[0] === '-' ? 1 : 0
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`
  }
  return `${val.slice(0, i)}${res}`
}
function getMessage(key, msg, args) {
  if (typeof msg === 'function') {
    assert(
      msg.length <= args.length,
      // Default options do not count.
      `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${msg.length}).`
    )
    return msg(...args)
  }
  const expectedLength = (msg.match(/%[dfijoOs]/g) || []).length
  assert(
    expectedLength === args.length,
    `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${expectedLength}).`
  )
  if (args.length === 0) {
    return msg
  }
  return format(msg, ...args)
}
function E(code, message, Base) {
  if (!Base) {
    Base = Error
  }
  class NodeError extends Base {
    constructor(...args) {
      super(getMessage(code, message, args))
    }
    toString() {
      return `${this.name} [${code}]: ${this.message}`
    }
  }
  Object.defineProperties(NodeError.prototype, {
    name: {
      value: Base.name,
      writable: true,
      enumerable: false,
      configurable: true
    },
    toString: {
      value() {
        return `${this.name} [${code}]: ${this.message}`
      },
      writable: true,
      enumerable: false,
      configurable: true
    }
  })
  NodeError.prototype.code = code
  NodeError.prototype[kIsNodeError] = true
  codes[code] = NodeError
}
function hideStackFrames(fn) {
  // We rename the functions that will be hidden to cut off the stacktrace
  // at the outermost one
  const hidden = nodeInternalPrefix + fn.name
  Object.defineProperty(fn, 'name', {
    value: hidden
  })
  return fn
}
function aggregateTwoErrors(innerError, outerError) {
  if (innerError && outerError && innerError !== outerError) {
    if (Array.isArray(outerError.errors)) {
      // If `outerError` is already an `AggregateError`.
      outerError.errors.push(innerError)
      return outerError
    }
    const err = new AggregateError([outerError, innerError], outerError.message)
    err.code = outerError.code
    return err
  }
  return innerError || outerError
}
class AbortError extends Error {
  constructor(message = 'The operation was aborted', options = undefined) {
    if (options !== undefined && typeof options !== 'object') {
      throw new codes.ERR_INVALID_ARG_TYPE('options', 'Object', options)
    }
    super(message, options)
    this.code = 'ABORT_ERR'
    this.name = 'AbortError'
  }
}
E('ERR_ASSERTION', '%s', Error)
E(
  'ERR_INVALID_ARG_TYPE',
  (name, expected, actual) => {
    assert(typeof name === 'string', "'name' must be a string")
    if (!Array.isArray(expected)) {
      expected = [expected]
    }
    let msg = 'The '
    if (name.endsWith(' argument')) {
      // For cases like 'first argument'
      msg += `${name} `
    } else {
      msg += `"${name}" ${name.includes('.') ? 'property' : 'argument'} `
    }
    msg += 'must be '
    const types = []
    const instances = []
    const other = []
    for (const value of expected) {
      assert(typeof value === 'string', 'All expected entries have to be of type string')
      if (kTypes.includes(value)) {
        types.push(value.toLowerCase())
      } else if (classRegExp.test(value)) {
        instances.push(value)
      } else {
        assert(value !== 'object', 'The value "object" should be written as "Object"')
        other.push(value)
      }
    }

    // Special handle `object` in case other instances are allowed to outline
    // the differences between each other.
    if (instances.length > 0) {
      const pos = types.indexOf('object')
      if (pos !== -1) {
        types.splice(types, pos, 1)
        instances.push('Object')
      }
    }
    if (types.length > 0) {
      switch (types.length) {
        case 1:
          msg += `of type ${types[0]}`
          break
        case 2:
          msg += `one of type ${types[0]} or ${types[1]}`
          break
        default: {
          const last = types.pop()
          msg += `one of type ${types.join(', ')}, or ${last}`
        }
      }
      if (instances.length > 0 || other.length > 0) {
        msg += ' or '
      }
    }
    if (instances.length > 0) {
      switch (instances.length) {
        case 1:
          msg += `an instance of ${instances[0]}`
          break
        case 2:
          msg += `an instance of ${instances[0]} or ${instances[1]}`
          break
        default: {
          const last = instances.pop()
          msg += `an instance of ${instances.join(', ')}, or ${last}`
        }
      }
      if (other.length > 0) {
        msg += ' or '
      }
    }
    switch (other.length) {
      case 0:
        break
      case 1:
        if (other[0].toLowerCase() !== other[0]) {
          msg += 'an '
        }
        msg += `${other[0]}`
        break
      case 2:
        msg += `one of ${other[0]} or ${other[1]}`
        break
      default: {
        const last = other.pop()
        msg += `one of ${other.join(', ')}, or ${last}`
      }
    }
    if (actual == null) {
      msg += `. Received ${actual}`
    } else if (typeof actual === 'function' && actual.name) {
      msg += `. Received function ${actual.name}`
    } else if (typeof actual === 'object') {
      var _actual$constructor
      if (
        (_actual$constructor = actual.constructor) !== null &&
        _actual$constructor !== undefined &&
        _actual$constructor.name
      ) {
        msg += `. Received an instance of ${actual.constructor.name}`
      } else {
        const inspected = inspect(actual, {
          depth: -1
        })
        msg += `. Received ${inspected}`
      }
    } else {
      let inspected = inspect(actual, {
        colors: false
      })
      if (inspected.length > 25) {
        inspected = `${inspected.slice(0, 25)}...`
      }
      msg += `. Received type ${typeof actual} (${inspected})`
    }
    return msg
  },
  TypeError
)
E(
  'ERR_INVALID_ARG_VALUE',
  (name, value, reason = 'is invalid') => {
    let inspected = inspect(value)
    if (inspected.length > 128) {
      inspected = inspected.slice(0, 128) + '...'
    }
    const type = name.includes('.') ? 'property' : 'argument'
    return `The ${type} '${name}' ${reason}. Received ${inspected}`
  },
  TypeError
)
E(
  'ERR_INVALID_RETURN_VALUE',
  (input, name, value) => {
    var _value$constructor
    const type =
      value !== null &&
      value !== undefined &&
      (_value$constructor = value.constructor) !== null &&
      _value$constructor !== undefined &&
      _value$constructor.name
        ? `instance of ${value.constructor.name}`
        : `type ${typeof value}`
    return `Expected ${input} to be returned from the "${name}"` + ` function but got ${type}.`
  },
  TypeError
)
E(
  'ERR_MISSING_ARGS',
  (...args) => {
    assert(args.length > 0, 'At least one arg needs to be specified')
    let msg
    const len = args.length
    args = (Array.isArray(args) ? args : [args]).map((a) => `"${a}"`).join(' or ')
    switch (len) {
      case 1:
        msg += `The ${args[0]} argument`
        break
      case 2:
        msg += `The ${args[0]} and ${args[1]} arguments`
        break
      default:
        {
          const last = args.pop()
          msg += `The ${args.join(', ')}, and ${last} arguments`
        }
        break
    }
    return `${msg} must be specified`
  },
  TypeError
)
E(
  'ERR_OUT_OF_RANGE',
  (str, range, input) => {
    assert(range, 'Missing "range" argument')
    let received
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input))
    } else if (typeof input === 'bigint') {
      received = String(input)
      if (input > 2n ** 32n || input < -(2n ** 32n)) {
        received = addNumericalSeparator(received)
      }
      received += 'n'
    } else {
      received = inspect(input)
    }
    return `The value of "${str}" is out of range. It must be ${range}. Received ${received}`
  },
  RangeError
)
E('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times', Error)
E('ERR_METHOD_NOT_IMPLEMENTED', 'The %s method is not implemented', Error)
E('ERR_STREAM_ALREADY_FINISHED', 'Cannot call %s after a stream was finished', Error)
E('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable', Error)
E('ERR_STREAM_DESTROYED', 'Cannot call %s after a stream was destroyed', Error)
E('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError)
E('ERR_STREAM_PREMATURE_CLOSE', 'Premature close', Error)
E('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF', Error)
E('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event', Error)
E('ERR_STREAM_WRITE_AFTER_END', 'write after end', Error)
E('ERR_UNKNOWN_ENCODING', 'Unknown encoding: %s', TypeError)
module.exports = {
  AbortError,
  aggregateTwoErrors: hideStackFrames(aggregateTwoErrors),
  hideStackFrames,
  codes
}


/***/ }),
/* 54 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
/* eslint jsdoc/require-jsdoc: "error" */



const {
  ArrayIsArray,
  ArrayPrototypeIncludes,
  ArrayPrototypeJoin,
  ArrayPrototypeMap,
  NumberIsInteger,
  NumberIsNaN,
  NumberMAX_SAFE_INTEGER,
  NumberMIN_SAFE_INTEGER,
  NumberParseInt,
  ObjectPrototypeHasOwnProperty,
  RegExpPrototypeExec,
  String,
  StringPrototypeToUpperCase,
  StringPrototypeTrim
} = __webpack_require__(48)
const {
  hideStackFrames,
  codes: { ERR_SOCKET_BAD_PORT, ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_UNKNOWN_SIGNAL }
} = __webpack_require__(53)
const { normalizeEncoding } = __webpack_require__(49)
const { isAsyncFunction, isArrayBufferView } = (__webpack_require__(49).types)
const signals = {}

/**
 * @param {*} value
 * @returns {boolean}
 */
function isInt32(value) {
  return value === (value | 0)
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function isUint32(value) {
  return value === value >>> 0
}
const octalReg = /^[0-7]+$/
const modeDesc = 'must be a 32-bit unsigned integer or an octal string'

/**
 * Parse and validate values that will be converted into mode_t (the S_*
 * constants). Only valid numbers and octal strings are allowed. They could be
 * converted to 32-bit unsigned integers or non-negative signed integers in the
 * C++ land, but any value higher than 0o777 will result in platform-specific
 * behaviors.
 * @param {*} value Values to be validated
 * @param {string} name Name of the argument
 * @param {number} [def] If specified, will be returned for invalid values
 * @returns {number}
 */
function parseFileMode(value, name, def) {
  if (typeof value === 'undefined') {
    value = def
  }
  if (typeof value === 'string') {
    if (RegExpPrototypeExec(octalReg, value) === null) {
      throw new ERR_INVALID_ARG_VALUE(name, value, modeDesc)
    }
    value = NumberParseInt(value, 8)
  }
  validateUint32(value, name)
  return value
}

/**
 * @callback validateInteger
 * @param {*} value
 * @param {string} name
 * @param {number} [min]
 * @param {number} [max]
 * @returns {asserts value is number}
 */

/** @type {validateInteger} */
const validateInteger = hideStackFrames((value, name, min = NumberMIN_SAFE_INTEGER, max = NumberMAX_SAFE_INTEGER) => {
  if (typeof value !== 'number') throw new ERR_INVALID_ARG_TYPE(name, 'number', value)
  if (!NumberIsInteger(value)) throw new ERR_OUT_OF_RANGE(name, 'an integer', value)
  if (value < min || value > max) throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value)
})

/**
 * @callback validateInt32
 * @param {*} value
 * @param {string} name
 * @param {number} [min]
 * @param {number} [max]
 * @returns {asserts value is number}
 */

/** @type {validateInt32} */
const validateInt32 = hideStackFrames((value, name, min = -2147483648, max = 2147483647) => {
  // The defaults for min and max correspond to the limits of 32-bit integers.
  if (typeof value !== 'number') {
    throw new ERR_INVALID_ARG_TYPE(name, 'number', value)
  }
  if (!NumberIsInteger(value)) {
    throw new ERR_OUT_OF_RANGE(name, 'an integer', value)
  }
  if (value < min || value > max) {
    throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value)
  }
})

/**
 * @callback validateUint32
 * @param {*} value
 * @param {string} name
 * @param {number|boolean} [positive=false]
 * @returns {asserts value is number}
 */

/** @type {validateUint32} */
const validateUint32 = hideStackFrames((value, name, positive = false) => {
  if (typeof value !== 'number') {
    throw new ERR_INVALID_ARG_TYPE(name, 'number', value)
  }
  if (!NumberIsInteger(value)) {
    throw new ERR_OUT_OF_RANGE(name, 'an integer', value)
  }
  const min = positive ? 1 : 0
  // 2 ** 32 === 4294967296
  const max = 4294967295
  if (value < min || value > max) {
    throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value)
  }
})

/**
 * @callback validateString
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is string}
 */

/** @type {validateString} */
function validateString(value, name) {
  if (typeof value !== 'string') throw new ERR_INVALID_ARG_TYPE(name, 'string', value)
}

/**
 * @callback validateNumber
 * @param {*} value
 * @param {string} name
 * @param {number} [min]
 * @param {number} [max]
 * @returns {asserts value is number}
 */

/** @type {validateNumber} */
function validateNumber(value, name, min = undefined, max) {
  if (typeof value !== 'number') throw new ERR_INVALID_ARG_TYPE(name, 'number', value)
  if (
    (min != null && value < min) ||
    (max != null && value > max) ||
    ((min != null || max != null) && NumberIsNaN(value))
  ) {
    throw new ERR_OUT_OF_RANGE(
      name,
      `${min != null ? `>= ${min}` : ''}${min != null && max != null ? ' && ' : ''}${max != null ? `<= ${max}` : ''}`,
      value
    )
  }
}

/**
 * @callback validateOneOf
 * @template T
 * @param {T} value
 * @param {string} name
 * @param {T[]} oneOf
 */

/** @type {validateOneOf} */
const validateOneOf = hideStackFrames((value, name, oneOf) => {
  if (!ArrayPrototypeIncludes(oneOf, value)) {
    const allowed = ArrayPrototypeJoin(
      ArrayPrototypeMap(oneOf, (v) => (typeof v === 'string' ? `'${v}'` : String(v))),
      ', '
    )
    const reason = 'must be one of: ' + allowed
    throw new ERR_INVALID_ARG_VALUE(name, value, reason)
  }
})

/**
 * @callback validateBoolean
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is boolean}
 */

/** @type {validateBoolean} */
function validateBoolean(value, name) {
  if (typeof value !== 'boolean') throw new ERR_INVALID_ARG_TYPE(name, 'boolean', value)
}

/**
 * @param {any} options
 * @param {string} key
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
function getOwnPropertyValueOrDefault(options, key, defaultValue) {
  return options == null || !ObjectPrototypeHasOwnProperty(options, key) ? defaultValue : options[key]
}

/**
 * @callback validateObject
 * @param {*} value
 * @param {string} name
 * @param {{
 *   allowArray?: boolean,
 *   allowFunction?: boolean,
 *   nullable?: boolean
 * }} [options]
 */

/** @type {validateObject} */
const validateObject = hideStackFrames((value, name, options = null) => {
  const allowArray = getOwnPropertyValueOrDefault(options, 'allowArray', false)
  const allowFunction = getOwnPropertyValueOrDefault(options, 'allowFunction', false)
  const nullable = getOwnPropertyValueOrDefault(options, 'nullable', false)
  if (
    (!nullable && value === null) ||
    (!allowArray && ArrayIsArray(value)) ||
    (typeof value !== 'object' && (!allowFunction || typeof value !== 'function'))
  ) {
    throw new ERR_INVALID_ARG_TYPE(name, 'Object', value)
  }
})

/**
 * @callback validateDictionary - We are using the Web IDL Standard definition
 *                                of "dictionary" here, which means any value
 *                                whose Type is either Undefined, Null, or
 *                                Object (which includes functions).
 * @param {*} value
 * @param {string} name
 * @see https://webidl.spec.whatwg.org/#es-dictionary
 * @see https://tc39.es/ecma262/#table-typeof-operator-results
 */

/** @type {validateDictionary} */
const validateDictionary = hideStackFrames((value, name) => {
  if (value != null && typeof value !== 'object' && typeof value !== 'function') {
    throw new ERR_INVALID_ARG_TYPE(name, 'a dictionary', value)
  }
})

/**
 * @callback validateArray
 * @param {*} value
 * @param {string} name
 * @param {number} [minLength]
 * @returns {asserts value is any[]}
 */

/** @type {validateArray} */
const validateArray = hideStackFrames((value, name, minLength = 0) => {
  if (!ArrayIsArray(value)) {
    throw new ERR_INVALID_ARG_TYPE(name, 'Array', value)
  }
  if (value.length < minLength) {
    const reason = `must be longer than ${minLength}`
    throw new ERR_INVALID_ARG_VALUE(name, value, reason)
  }
})

/**
 * @callback validateStringArray
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is string[]}
 */

/** @type {validateStringArray} */
function validateStringArray(value, name) {
  validateArray(value, name)
  for (let i = 0; i < value.length; i++) {
    validateString(value[i], `${name}[${i}]`)
  }
}

/**
 * @callback validateBooleanArray
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is boolean[]}
 */

/** @type {validateBooleanArray} */
function validateBooleanArray(value, name) {
  validateArray(value, name)
  for (let i = 0; i < value.length; i++) {
    validateBoolean(value[i], `${name}[${i}]`)
  }
}

/**
 * @callback validateAbortSignalArray
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is AbortSignal[]}
 */

/** @type {validateAbortSignalArray} */
function validateAbortSignalArray(value, name) {
  validateArray(value, name)
  for (let i = 0; i < value.length; i++) {
    const signal = value[i]
    const indexedName = `${name}[${i}]`
    if (signal == null) {
      throw new ERR_INVALID_ARG_TYPE(indexedName, 'AbortSignal', signal)
    }
    validateAbortSignal(signal, indexedName)
  }
}

/**
 * @param {*} signal
 * @param {string} [name='signal']
 * @returns {asserts signal is keyof signals}
 */
function validateSignalName(signal, name = 'signal') {
  validateString(signal, name)
  if (signals[signal] === undefined) {
    if (signals[StringPrototypeToUpperCase(signal)] !== undefined) {
      throw new ERR_UNKNOWN_SIGNAL(signal + ' (signals must use all capital letters)')
    }
    throw new ERR_UNKNOWN_SIGNAL(signal)
  }
}

/**
 * @callback validateBuffer
 * @param {*} buffer
 * @param {string} [name='buffer']
 * @returns {asserts buffer is ArrayBufferView}
 */

/** @type {validateBuffer} */
const validateBuffer = hideStackFrames((buffer, name = 'buffer') => {
  if (!isArrayBufferView(buffer)) {
    throw new ERR_INVALID_ARG_TYPE(name, ['Buffer', 'TypedArray', 'DataView'], buffer)
  }
})

/**
 * @param {string} data
 * @param {string} encoding
 */
function validateEncoding(data, encoding) {
  const normalizedEncoding = normalizeEncoding(encoding)
  const length = data.length
  if (normalizedEncoding === 'hex' && length % 2 !== 0) {
    throw new ERR_INVALID_ARG_VALUE('encoding', encoding, `is invalid for data of length ${length}`)
  }
}

/**
 * Check that the port number is not NaN when coerced to a number,
 * is an integer and that it falls within the legal range of port numbers.
 * @param {*} port
 * @param {string} [name='Port']
 * @param {boolean} [allowZero=true]
 * @returns {number}
 */
function validatePort(port, name = 'Port', allowZero = true) {
  if (
    (typeof port !== 'number' && typeof port !== 'string') ||
    (typeof port === 'string' && StringPrototypeTrim(port).length === 0) ||
    +port !== +port >>> 0 ||
    port > 0xffff ||
    (port === 0 && !allowZero)
  ) {
    throw new ERR_SOCKET_BAD_PORT(name, port, allowZero)
  }
  return port | 0
}

/**
 * @callback validateAbortSignal
 * @param {*} signal
 * @param {string} name
 */

/** @type {validateAbortSignal} */
const validateAbortSignal = hideStackFrames((signal, name) => {
  if (signal !== undefined && (signal === null || typeof signal !== 'object' || !('aborted' in signal))) {
    throw new ERR_INVALID_ARG_TYPE(name, 'AbortSignal', signal)
  }
})

/**
 * @callback validateFunction
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is Function}
 */

/** @type {validateFunction} */
const validateFunction = hideStackFrames((value, name) => {
  if (typeof value !== 'function') throw new ERR_INVALID_ARG_TYPE(name, 'Function', value)
})

/**
 * @callback validatePlainFunction
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is Function}
 */

/** @type {validatePlainFunction} */
const validatePlainFunction = hideStackFrames((value, name) => {
  if (typeof value !== 'function' || isAsyncFunction(value)) throw new ERR_INVALID_ARG_TYPE(name, 'Function', value)
})

/**
 * @callback validateUndefined
 * @param {*} value
 * @param {string} name
 * @returns {asserts value is undefined}
 */

/** @type {validateUndefined} */
const validateUndefined = hideStackFrames((value, name) => {
  if (value !== undefined) throw new ERR_INVALID_ARG_TYPE(name, 'undefined', value)
})

/**
 * @template T
 * @param {T} value
 * @param {string} name
 * @param {T[]} union
 */
function validateUnion(value, name, union) {
  if (!ArrayPrototypeIncludes(union, value)) {
    throw new ERR_INVALID_ARG_TYPE(name, `('${ArrayPrototypeJoin(union, '|')}')`, value)
  }
}

/*
  The rules for the Link header field are described here:
  https://www.rfc-editor.org/rfc/rfc8288.html#section-3

  This regex validates any string surrounded by angle brackets
  (not necessarily a valid URI reference) followed by zero or more
  link-params separated by semicolons.
*/
const linkValueRegExp = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/

/**
 * @param {any} value
 * @param {string} name
 */
function validateLinkHeaderFormat(value, name) {
  if (typeof value === 'undefined' || !RegExpPrototypeExec(linkValueRegExp, value)) {
    throw new ERR_INVALID_ARG_VALUE(
      name,
      value,
      'must be an array or string of format "</styles.css>; rel=preload; as=style"'
    )
  }
}

/**
 * @param {any} hints
 * @return {string}
 */
function validateLinkHeaderValue(hints) {
  if (typeof hints === 'string') {
    validateLinkHeaderFormat(hints, 'hints')
    return hints
  } else if (ArrayIsArray(hints)) {
    const hintsLength = hints.length
    let result = ''
    if (hintsLength === 0) {
      return result
    }
    for (let i = 0; i < hintsLength; i++) {
      const link = hints[i]
      validateLinkHeaderFormat(link, 'hints')
      result += link
      if (i !== hintsLength - 1) {
        result += ', '
      }
    }
    return result
  }
  throw new ERR_INVALID_ARG_VALUE(
    'hints',
    hints,
    'must be an array or string of format "</styles.css>; rel=preload; as=style"'
  )
}
module.exports = {
  isInt32,
  isUint32,
  parseFileMode,
  validateArray,
  validateStringArray,
  validateBooleanArray,
  validateAbortSignalArray,
  validateBoolean,
  validateBuffer,
  validateDictionary,
  validateEncoding,
  validateFunction,
  validateInt32,
  validateInteger,
  validateNumber,
  validateObject,
  validateOneOf,
  validatePlainFunction,
  validatePort,
  validateSignalName,
  validateString,
  validateUint32,
  validateUndefined,
  validateUnion,
  validateAbortSignal,
  validateLinkHeaderValue
}


/***/ }),
/* 55 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* replacement start */

const process = __webpack_require__(13)

/* replacement end */
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).

;('use strict')
const { AbortError, codes } = __webpack_require__(53)
const { ERR_INVALID_ARG_TYPE, ERR_STREAM_PREMATURE_CLOSE } = codes
const { kEmptyObject, once } = __webpack_require__(49)
const { validateAbortSignal, validateFunction, validateObject, validateBoolean } = __webpack_require__(54)
const { Promise, PromisePrototypeThen, SymbolDispose } = __webpack_require__(48)
const {
  isClosed,
  isReadable,
  isReadableNodeStream,
  isReadableStream,
  isReadableFinished,
  isReadableErrored,
  isWritable,
  isWritableNodeStream,
  isWritableStream,
  isWritableFinished,
  isWritableErrored,
  isNodeStream,
  willEmitClose: _willEmitClose,
  kIsClosedPromise
} = __webpack_require__(56)
let addAbortListener
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function'
}
const nop = () => {}
function eos(stream, options, callback) {
  var _options$readable, _options$writable
  if (arguments.length === 2) {
    callback = options
    options = kEmptyObject
  } else if (options == null) {
    options = kEmptyObject
  } else {
    validateObject(options, 'options')
  }
  validateFunction(callback, 'callback')
  validateAbortSignal(options.signal, 'options.signal')
  callback = once(callback)
  if (isReadableStream(stream) || isWritableStream(stream)) {
    return eosWeb(stream, options, callback)
  }
  if (!isNodeStream(stream)) {
    throw new ERR_INVALID_ARG_TYPE('stream', ['ReadableStream', 'WritableStream', 'Stream'], stream)
  }
  const readable =
    (_options$readable = options.readable) !== null && _options$readable !== undefined
      ? _options$readable
      : isReadableNodeStream(stream)
  const writable =
    (_options$writable = options.writable) !== null && _options$writable !== undefined
      ? _options$writable
      : isWritableNodeStream(stream)
  const wState = stream._writableState
  const rState = stream._readableState
  const onlegacyfinish = () => {
    if (!stream.writable) {
      onfinish()
    }
  }

  // TODO (ronag): Improve soft detection to include core modules and
  // common ecosystem modules that do properly emit 'close' but fail
  // this generic check.
  let willEmitClose =
    _willEmitClose(stream) && isReadableNodeStream(stream) === readable && isWritableNodeStream(stream) === writable
  let writableFinished = isWritableFinished(stream, false)
  const onfinish = () => {
    writableFinished = true
    // Stream should not be destroyed here. If it is that
    // means that user space is doing something differently and
    // we cannot trust willEmitClose.
    if (stream.destroyed) {
      willEmitClose = false
    }
    if (willEmitClose && (!stream.readable || readable)) {
      return
    }
    if (!readable || readableFinished) {
      callback.call(stream)
    }
  }
  let readableFinished = isReadableFinished(stream, false)
  const onend = () => {
    readableFinished = true
    // Stream should not be destroyed here. If it is that
    // means that user space is doing something differently and
    // we cannot trust willEmitClose.
    if (stream.destroyed) {
      willEmitClose = false
    }
    if (willEmitClose && (!stream.writable || writable)) {
      return
    }
    if (!writable || writableFinished) {
      callback.call(stream)
    }
  }
  const onerror = (err) => {
    callback.call(stream, err)
  }
  let closed = isClosed(stream)
  const onclose = () => {
    closed = true
    const errored = isWritableErrored(stream) || isReadableErrored(stream)
    if (errored && typeof errored !== 'boolean') {
      return callback.call(stream, errored)
    }
    if (readable && !readableFinished && isReadableNodeStream(stream, true)) {
      if (!isReadableFinished(stream, false)) return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE())
    }
    if (writable && !writableFinished) {
      if (!isWritableFinished(stream, false)) return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE())
    }
    callback.call(stream)
  }
  const onclosed = () => {
    closed = true
    const errored = isWritableErrored(stream) || isReadableErrored(stream)
    if (errored && typeof errored !== 'boolean') {
      return callback.call(stream, errored)
    }
    callback.call(stream)
  }
  const onrequest = () => {
    stream.req.on('finish', onfinish)
  }
  if (isRequest(stream)) {
    stream.on('complete', onfinish)
    if (!willEmitClose) {
      stream.on('abort', onclose)
    }
    if (stream.req) {
      onrequest()
    } else {
      stream.on('request', onrequest)
    }
  } else if (writable && !wState) {
    // legacy streams
    stream.on('end', onlegacyfinish)
    stream.on('close', onlegacyfinish)
  }

  // Not all streams will emit 'close' after 'aborted'.
  if (!willEmitClose && typeof stream.aborted === 'boolean') {
    stream.on('aborted', onclose)
  }
  stream.on('end', onend)
  stream.on('finish', onfinish)
  if (options.error !== false) {
    stream.on('error', onerror)
  }
  stream.on('close', onclose)
  if (closed) {
    process.nextTick(onclose)
  } else if (
    (wState !== null && wState !== undefined && wState.errorEmitted) ||
    (rState !== null && rState !== undefined && rState.errorEmitted)
  ) {
    if (!willEmitClose) {
      process.nextTick(onclosed)
    }
  } else if (
    !readable &&
    (!willEmitClose || isReadable(stream)) &&
    (writableFinished || isWritable(stream) === false)
  ) {
    process.nextTick(onclosed)
  } else if (
    !writable &&
    (!willEmitClose || isWritable(stream)) &&
    (readableFinished || isReadable(stream) === false)
  ) {
    process.nextTick(onclosed)
  } else if (rState && stream.req && stream.aborted) {
    process.nextTick(onclosed)
  }
  const cleanup = () => {
    callback = nop
    stream.removeListener('aborted', onclose)
    stream.removeListener('complete', onfinish)
    stream.removeListener('abort', onclose)
    stream.removeListener('request', onrequest)
    if (stream.req) stream.req.removeListener('finish', onfinish)
    stream.removeListener('end', onlegacyfinish)
    stream.removeListener('close', onlegacyfinish)
    stream.removeListener('finish', onfinish)
    stream.removeListener('end', onend)
    stream.removeListener('error', onerror)
    stream.removeListener('close', onclose)
  }
  if (options.signal && !closed) {
    const abort = () => {
      // Keep it because cleanup removes it.
      const endCallback = callback
      cleanup()
      endCallback.call(
        stream,
        new AbortError(undefined, {
          cause: options.signal.reason
        })
      )
    }
    if (options.signal.aborted) {
      process.nextTick(abort)
    } else {
      addAbortListener = addAbortListener || (__webpack_require__(49).addAbortListener)
      const disposable = addAbortListener(options.signal, abort)
      const originalCallback = callback
      callback = once((...args) => {
        disposable[SymbolDispose]()
        originalCallback.apply(stream, args)
      })
    }
  }
  return cleanup
}
function eosWeb(stream, options, callback) {
  let isAborted = false
  let abort = nop
  if (options.signal) {
    abort = () => {
      isAborted = true
      callback.call(
        stream,
        new AbortError(undefined, {
          cause: options.signal.reason
        })
      )
    }
    if (options.signal.aborted) {
      process.nextTick(abort)
    } else {
      addAbortListener = addAbortListener || (__webpack_require__(49).addAbortListener)
      const disposable = addAbortListener(options.signal, abort)
      const originalCallback = callback
      callback = once((...args) => {
        disposable[SymbolDispose]()
        originalCallback.apply(stream, args)
      })
    }
  }
  const resolverFn = (...args) => {
    if (!isAborted) {
      process.nextTick(() => callback.apply(stream, args))
    }
  }
  PromisePrototypeThen(stream[kIsClosedPromise].promise, resolverFn, resolverFn)
  return nop
}
function finished(stream, opts) {
  var _opts
  let autoCleanup = false
  if (opts === null) {
    opts = kEmptyObject
  }
  if ((_opts = opts) !== null && _opts !== undefined && _opts.cleanup) {
    validateBoolean(opts.cleanup, 'cleanup')
    autoCleanup = opts.cleanup
  }
  return new Promise((resolve, reject) => {
    const cleanup = eos(stream, opts, (err) => {
      if (autoCleanup) {
        cleanup()
      }
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
module.exports = eos
module.exports.finished = finished


/***/ }),
/* 56 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { SymbolAsyncIterator, SymbolIterator, SymbolFor } = __webpack_require__(48)

// We need to use SymbolFor to make these globally available
// for interopt with readable-stream, i.e. readable-stream
// and node core needs to be able to read/write private state
// from each other for proper interoperability.
const kIsDestroyed = SymbolFor('nodejs.stream.destroyed')
const kIsErrored = SymbolFor('nodejs.stream.errored')
const kIsReadable = SymbolFor('nodejs.stream.readable')
const kIsWritable = SymbolFor('nodejs.stream.writable')
const kIsDisturbed = SymbolFor('nodejs.stream.disturbed')
const kIsClosedPromise = SymbolFor('nodejs.webstream.isClosedPromise')
const kControllerErrorFunction = SymbolFor('nodejs.webstream.controllerErrorFunction')
function isReadableNodeStream(obj, strict = false) {
  var _obj$_readableState
  return !!(
    (
      obj &&
      typeof obj.pipe === 'function' &&
      typeof obj.on === 'function' &&
      (!strict || (typeof obj.pause === 'function' && typeof obj.resume === 'function')) &&
      (!obj._writableState ||
        ((_obj$_readableState = obj._readableState) === null || _obj$_readableState === undefined
          ? undefined
          : _obj$_readableState.readable) !== false) &&
      // Duplex
      (!obj._writableState || obj._readableState)
    ) // Writable has .pipe.
  )
}

function isWritableNodeStream(obj) {
  var _obj$_writableState
  return !!(
    (
      obj &&
      typeof obj.write === 'function' &&
      typeof obj.on === 'function' &&
      (!obj._readableState ||
        ((_obj$_writableState = obj._writableState) === null || _obj$_writableState === undefined
          ? undefined
          : _obj$_writableState.writable) !== false)
    ) // Duplex
  )
}

function isDuplexNodeStream(obj) {
  return !!(
    obj &&
    typeof obj.pipe === 'function' &&
    obj._readableState &&
    typeof obj.on === 'function' &&
    typeof obj.write === 'function'
  )
}
function isNodeStream(obj) {
  return (
    obj &&
    (obj._readableState ||
      obj._writableState ||
      (typeof obj.write === 'function' && typeof obj.on === 'function') ||
      (typeof obj.pipe === 'function' && typeof obj.on === 'function'))
  )
}
function isReadableStream(obj) {
  return !!(
    obj &&
    !isNodeStream(obj) &&
    typeof obj.pipeThrough === 'function' &&
    typeof obj.getReader === 'function' &&
    typeof obj.cancel === 'function'
  )
}
function isWritableStream(obj) {
  return !!(obj && !isNodeStream(obj) && typeof obj.getWriter === 'function' && typeof obj.abort === 'function')
}
function isTransformStream(obj) {
  return !!(obj && !isNodeStream(obj) && typeof obj.readable === 'object' && typeof obj.writable === 'object')
}
function isWebStream(obj) {
  return isReadableStream(obj) || isWritableStream(obj) || isTransformStream(obj)
}
function isIterable(obj, isAsync) {
  if (obj == null) return false
  if (isAsync === true) return typeof obj[SymbolAsyncIterator] === 'function'
  if (isAsync === false) return typeof obj[SymbolIterator] === 'function'
  return typeof obj[SymbolAsyncIterator] === 'function' || typeof obj[SymbolIterator] === 'function'
}
function isDestroyed(stream) {
  if (!isNodeStream(stream)) return null
  const wState = stream._writableState
  const rState = stream._readableState
  const state = wState || rState
  return !!(stream.destroyed || stream[kIsDestroyed] || (state !== null && state !== undefined && state.destroyed))
}

// Have been end():d.
function isWritableEnded(stream) {
  if (!isWritableNodeStream(stream)) return null
  if (stream.writableEnded === true) return true
  const wState = stream._writableState
  if (wState !== null && wState !== undefined && wState.errored) return false
  if (typeof (wState === null || wState === undefined ? undefined : wState.ended) !== 'boolean') return null
  return wState.ended
}

// Have emitted 'finish'.
function isWritableFinished(stream, strict) {
  if (!isWritableNodeStream(stream)) return null
  if (stream.writableFinished === true) return true
  const wState = stream._writableState
  if (wState !== null && wState !== undefined && wState.errored) return false
  if (typeof (wState === null || wState === undefined ? undefined : wState.finished) !== 'boolean') return null
  return !!(wState.finished || (strict === false && wState.ended === true && wState.length === 0))
}

// Have been push(null):d.
function isReadableEnded(stream) {
  if (!isReadableNodeStream(stream)) return null
  if (stream.readableEnded === true) return true
  const rState = stream._readableState
  if (!rState || rState.errored) return false
  if (typeof (rState === null || rState === undefined ? undefined : rState.ended) !== 'boolean') return null
  return rState.ended
}

// Have emitted 'end'.
function isReadableFinished(stream, strict) {
  if (!isReadableNodeStream(stream)) return null
  const rState = stream._readableState
  if (rState !== null && rState !== undefined && rState.errored) return false
  if (typeof (rState === null || rState === undefined ? undefined : rState.endEmitted) !== 'boolean') return null
  return !!(rState.endEmitted || (strict === false && rState.ended === true && rState.length === 0))
}
function isReadable(stream) {
  if (stream && stream[kIsReadable] != null) return stream[kIsReadable]
  if (typeof (stream === null || stream === undefined ? undefined : stream.readable) !== 'boolean') return null
  if (isDestroyed(stream)) return false
  return isReadableNodeStream(stream) && stream.readable && !isReadableFinished(stream)
}
function isWritable(stream) {
  if (stream && stream[kIsWritable] != null) return stream[kIsWritable]
  if (typeof (stream === null || stream === undefined ? undefined : stream.writable) !== 'boolean') return null
  if (isDestroyed(stream)) return false
  return isWritableNodeStream(stream) && stream.writable && !isWritableEnded(stream)
}
function isFinished(stream, opts) {
  if (!isNodeStream(stream)) {
    return null
  }
  if (isDestroyed(stream)) {
    return true
  }
  if ((opts === null || opts === undefined ? undefined : opts.readable) !== false && isReadable(stream)) {
    return false
  }
  if ((opts === null || opts === undefined ? undefined : opts.writable) !== false && isWritable(stream)) {
    return false
  }
  return true
}
function isWritableErrored(stream) {
  var _stream$_writableStat, _stream$_writableStat2
  if (!isNodeStream(stream)) {
    return null
  }
  if (stream.writableErrored) {
    return stream.writableErrored
  }
  return (_stream$_writableStat =
    (_stream$_writableStat2 = stream._writableState) === null || _stream$_writableStat2 === undefined
      ? undefined
      : _stream$_writableStat2.errored) !== null && _stream$_writableStat !== undefined
    ? _stream$_writableStat
    : null
}
function isReadableErrored(stream) {
  var _stream$_readableStat, _stream$_readableStat2
  if (!isNodeStream(stream)) {
    return null
  }
  if (stream.readableErrored) {
    return stream.readableErrored
  }
  return (_stream$_readableStat =
    (_stream$_readableStat2 = stream._readableState) === null || _stream$_readableStat2 === undefined
      ? undefined
      : _stream$_readableStat2.errored) !== null && _stream$_readableStat !== undefined
    ? _stream$_readableStat
    : null
}
function isClosed(stream) {
  if (!isNodeStream(stream)) {
    return null
  }
  if (typeof stream.closed === 'boolean') {
    return stream.closed
  }
  const wState = stream._writableState
  const rState = stream._readableState
  if (
    typeof (wState === null || wState === undefined ? undefined : wState.closed) === 'boolean' ||
    typeof (rState === null || rState === undefined ? undefined : rState.closed) === 'boolean'
  ) {
    return (
      (wState === null || wState === undefined ? undefined : wState.closed) ||
      (rState === null || rState === undefined ? undefined : rState.closed)
    )
  }
  if (typeof stream._closed === 'boolean' && isOutgoingMessage(stream)) {
    return stream._closed
  }
  return null
}
function isOutgoingMessage(stream) {
  return (
    typeof stream._closed === 'boolean' &&
    typeof stream._defaultKeepAlive === 'boolean' &&
    typeof stream._removedConnection === 'boolean' &&
    typeof stream._removedContLen === 'boolean'
  )
}
function isServerResponse(stream) {
  return typeof stream._sent100 === 'boolean' && isOutgoingMessage(stream)
}
function isServerRequest(stream) {
  var _stream$req
  return (
    typeof stream._consuming === 'boolean' &&
    typeof stream._dumped === 'boolean' &&
    ((_stream$req = stream.req) === null || _stream$req === undefined ? undefined : _stream$req.upgradeOrConnect) ===
      undefined
  )
}
function willEmitClose(stream) {
  if (!isNodeStream(stream)) return null
  const wState = stream._writableState
  const rState = stream._readableState
  const state = wState || rState
  return (
    (!state && isServerResponse(stream)) || !!(state && state.autoDestroy && state.emitClose && state.closed === false)
  )
}
function isDisturbed(stream) {
  var _stream$kIsDisturbed
  return !!(
    stream &&
    ((_stream$kIsDisturbed = stream[kIsDisturbed]) !== null && _stream$kIsDisturbed !== undefined
      ? _stream$kIsDisturbed
      : stream.readableDidRead || stream.readableAborted)
  )
}
function isErrored(stream) {
  var _ref,
    _ref2,
    _ref3,
    _ref4,
    _ref5,
    _stream$kIsErrored,
    _stream$_readableStat3,
    _stream$_writableStat3,
    _stream$_readableStat4,
    _stream$_writableStat4
  return !!(
    stream &&
    ((_ref =
      (_ref2 =
        (_ref3 =
          (_ref4 =
            (_ref5 =
              (_stream$kIsErrored = stream[kIsErrored]) !== null && _stream$kIsErrored !== undefined
                ? _stream$kIsErrored
                : stream.readableErrored) !== null && _ref5 !== undefined
              ? _ref5
              : stream.writableErrored) !== null && _ref4 !== undefined
            ? _ref4
            : (_stream$_readableStat3 = stream._readableState) === null || _stream$_readableStat3 === undefined
            ? undefined
            : _stream$_readableStat3.errorEmitted) !== null && _ref3 !== undefined
          ? _ref3
          : (_stream$_writableStat3 = stream._writableState) === null || _stream$_writableStat3 === undefined
          ? undefined
          : _stream$_writableStat3.errorEmitted) !== null && _ref2 !== undefined
        ? _ref2
        : (_stream$_readableStat4 = stream._readableState) === null || _stream$_readableStat4 === undefined
        ? undefined
        : _stream$_readableStat4.errored) !== null && _ref !== undefined
      ? _ref
      : (_stream$_writableStat4 = stream._writableState) === null || _stream$_writableStat4 === undefined
      ? undefined
      : _stream$_writableStat4.errored)
  )
}
module.exports = {
  isDestroyed,
  kIsDestroyed,
  isDisturbed,
  kIsDisturbed,
  isErrored,
  kIsErrored,
  isReadable,
  kIsReadable,
  kIsClosedPromise,
  kControllerErrorFunction,
  kIsWritable,
  isClosed,
  isDuplexNodeStream,
  isFinished,
  isIterable,
  isReadableNodeStream,
  isReadableStream,
  isReadableEnded,
  isReadableFinished,
  isReadableErrored,
  isNodeStream,
  isWebStream,
  isWritable,
  isWritableNodeStream,
  isWritableStream,
  isWritableEnded,
  isWritableFinished,
  isWritableErrored,
  isServerRequest,
  isServerResponse,
  willEmitClose,
  isTransformStream
}


/***/ }),
/* 57 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { pipeline } = __webpack_require__(58)
const Duplex = __webpack_require__(60)
const { destroyer } = __webpack_require__(59)
const {
  isNodeStream,
  isReadable,
  isWritable,
  isWebStream,
  isTransformStream,
  isWritableStream,
  isReadableStream
} = __webpack_require__(56)
const {
  AbortError,
  codes: { ERR_INVALID_ARG_VALUE, ERR_MISSING_ARGS }
} = __webpack_require__(53)
const eos = __webpack_require__(55)
module.exports = function compose(...streams) {
  if (streams.length === 0) {
    throw new ERR_MISSING_ARGS('streams')
  }
  if (streams.length === 1) {
    return Duplex.from(streams[0])
  }
  const orgStreams = [...streams]
  if (typeof streams[0] === 'function') {
    streams[0] = Duplex.from(streams[0])
  }
  if (typeof streams[streams.length - 1] === 'function') {
    const idx = streams.length - 1
    streams[idx] = Duplex.from(streams[idx])
  }
  for (let n = 0; n < streams.length; ++n) {
    if (!isNodeStream(streams[n]) && !isWebStream(streams[n])) {
      // TODO(ronag): Add checks for non streams.
      continue
    }
    if (
      n < streams.length - 1 &&
      !(isReadable(streams[n]) || isReadableStream(streams[n]) || isTransformStream(streams[n]))
    ) {
      throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], 'must be readable')
    }
    if (n > 0 && !(isWritable(streams[n]) || isWritableStream(streams[n]) || isTransformStream(streams[n]))) {
      throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], 'must be writable')
    }
  }
  let ondrain
  let onfinish
  let onreadable
  let onclose
  let d
  function onfinished(err) {
    const cb = onclose
    onclose = null
    if (cb) {
      cb(err)
    } else if (err) {
      d.destroy(err)
    } else if (!readable && !writable) {
      d.destroy()
    }
  }
  const head = streams[0]
  const tail = pipeline(streams, onfinished)
  const writable = !!(isWritable(head) || isWritableStream(head) || isTransformStream(head))
  const readable = !!(isReadable(tail) || isReadableStream(tail) || isTransformStream(tail))

  // TODO(ronag): Avoid double buffering.
  // Implement Writable/Readable/Duplex traits.
  // See, https://github.com/nodejs/node/pull/33515.
  d = new Duplex({
    // TODO (ronag): highWaterMark?
    writableObjectMode: !!(head !== null && head !== undefined && head.writableObjectMode),
    readableObjectMode: !!(tail !== null && tail !== undefined && tail.readableObjectMode),
    writable,
    readable
  })
  if (writable) {
    if (isNodeStream(head)) {
      d._write = function (chunk, encoding, callback) {
        if (head.write(chunk, encoding)) {
          callback()
        } else {
          ondrain = callback
        }
      }
      d._final = function (callback) {
        head.end()
        onfinish = callback
      }
      head.on('drain', function () {
        if (ondrain) {
          const cb = ondrain
          ondrain = null
          cb()
        }
      })
    } else if (isWebStream(head)) {
      const writable = isTransformStream(head) ? head.writable : head
      const writer = writable.getWriter()
      d._write = async function (chunk, encoding, callback) {
        try {
          await writer.ready
          writer.write(chunk).catch(() => {})
          callback()
        } catch (err) {
          callback(err)
        }
      }
      d._final = async function (callback) {
        try {
          await writer.ready
          writer.close().catch(() => {})
          onfinish = callback
        } catch (err) {
          callback(err)
        }
      }
    }
    const toRead = isTransformStream(tail) ? tail.readable : tail
    eos(toRead, () => {
      if (onfinish) {
        const cb = onfinish
        onfinish = null
        cb()
      }
    })
  }
  if (readable) {
    if (isNodeStream(tail)) {
      tail.on('readable', function () {
        if (onreadable) {
          const cb = onreadable
          onreadable = null
          cb()
        }
      })
      tail.on('end', function () {
        d.push(null)
      })
      d._read = function () {
        while (true) {
          const buf = tail.read()
          if (buf === null) {
            onreadable = d._read
            return
          }
          if (!d.push(buf)) {
            return
          }
        }
      }
    } else if (isWebStream(tail)) {
      const readable = isTransformStream(tail) ? tail.readable : tail
      const reader = readable.getReader()
      d._read = async function () {
        while (true) {
          try {
            const { value, done } = await reader.read()
            if (!d.push(value)) {
              return
            }
            if (done) {
              d.push(null)
              return
            }
          } catch {
            return
          }
        }
      }
    }
  }
  d._destroy = function (err, callback) {
    if (!err && onclose !== null) {
      err = new AbortError()
    }
    onreadable = null
    ondrain = null
    onfinish = null
    if (onclose === null) {
      callback(err)
    } else {
      onclose = callback
      if (isNodeStream(tail)) {
        destroyer(tail, err)
      }
    }
  }
  return d
}


/***/ }),
/* 58 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* replacement start */

const process = __webpack_require__(13)

/* replacement end */
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).

;('use strict')
const { ArrayIsArray, Promise, SymbolAsyncIterator, SymbolDispose } = __webpack_require__(48)
const eos = __webpack_require__(55)
const { once } = __webpack_require__(49)
const destroyImpl = __webpack_require__(59)
const Duplex = __webpack_require__(60)
const {
  aggregateTwoErrors,
  codes: {
    ERR_INVALID_ARG_TYPE,
    ERR_INVALID_RETURN_VALUE,
    ERR_MISSING_ARGS,
    ERR_STREAM_DESTROYED,
    ERR_STREAM_PREMATURE_CLOSE
  },
  AbortError
} = __webpack_require__(53)
const { validateFunction, validateAbortSignal } = __webpack_require__(54)
const {
  isIterable,
  isReadable,
  isReadableNodeStream,
  isNodeStream,
  isTransformStream,
  isWebStream,
  isReadableStream,
  isReadableFinished
} = __webpack_require__(56)
const AbortController = globalThis.AbortController || (__webpack_require__(50).AbortController)
let PassThrough
let Readable
let addAbortListener
function destroyer(stream, reading, writing) {
  let finished = false
  stream.on('close', () => {
    finished = true
  })
  const cleanup = eos(
    stream,
    {
      readable: reading,
      writable: writing
    },
    (err) => {
      finished = !err
    }
  )
  return {
    destroy: (err) => {
      if (finished) return
      finished = true
      destroyImpl.destroyer(stream, err || new ERR_STREAM_DESTROYED('pipe'))
    },
    cleanup
  }
}
function popCallback(streams) {
  // Streams should never be an empty array. It should always contain at least
  // a single stream. Therefore optimize for the average case instead of
  // checking for length === 0 as well.
  validateFunction(streams[streams.length - 1], 'streams[stream.length - 1]')
  return streams.pop()
}
function makeAsyncIterable(val) {
  if (isIterable(val)) {
    return val
  } else if (isReadableNodeStream(val)) {
    // Legacy streams are not Iterable.
    return fromReadable(val)
  }
  throw new ERR_INVALID_ARG_TYPE('val', ['Readable', 'Iterable', 'AsyncIterable'], val)
}
async function* fromReadable(val) {
  if (!Readable) {
    Readable = __webpack_require__(61)
  }
  yield* Readable.prototype[SymbolAsyncIterator].call(val)
}
async function pumpToNode(iterable, writable, finish, { end }) {
  let error
  let onresolve = null
  const resume = (err) => {
    if (err) {
      error = err
    }
    if (onresolve) {
      const callback = onresolve
      onresolve = null
      callback()
    }
  }
  const wait = () =>
    new Promise((resolve, reject) => {
      if (error) {
        reject(error)
      } else {
        onresolve = () => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        }
      }
    })
  writable.on('drain', resume)
  const cleanup = eos(
    writable,
    {
      readable: false
    },
    resume
  )
  try {
    if (writable.writableNeedDrain) {
      await wait()
    }
    for await (const chunk of iterable) {
      if (!writable.write(chunk)) {
        await wait()
      }
    }
    if (end) {
      writable.end()
      await wait()
    }
    finish()
  } catch (err) {
    finish(error !== err ? aggregateTwoErrors(error, err) : err)
  } finally {
    cleanup()
    writable.off('drain', resume)
  }
}
async function pumpToWeb(readable, writable, finish, { end }) {
  if (isTransformStream(writable)) {
    writable = writable.writable
  }
  // https://streams.spec.whatwg.org/#example-manual-write-with-backpressure
  const writer = writable.getWriter()
  try {
    for await (const chunk of readable) {
      await writer.ready
      writer.write(chunk).catch(() => {})
    }
    await writer.ready
    if (end) {
      await writer.close()
    }
    finish()
  } catch (err) {
    try {
      await writer.abort(err)
      finish(err)
    } catch (err) {
      finish(err)
    }
  }
}
function pipeline(...streams) {
  return pipelineImpl(streams, once(popCallback(streams)))
}
function pipelineImpl(streams, callback, opts) {
  if (streams.length === 1 && ArrayIsArray(streams[0])) {
    streams = streams[0]
  }
  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams')
  }
  const ac = new AbortController()
  const signal = ac.signal
  const outerSignal = opts === null || opts === undefined ? undefined : opts.signal

  // Need to cleanup event listeners if last stream is readable
  // https://github.com/nodejs/node/issues/35452
  const lastStreamCleanup = []
  validateAbortSignal(outerSignal, 'options.signal')
  function abort() {
    finishImpl(new AbortError())
  }
  addAbortListener = addAbortListener || (__webpack_require__(49).addAbortListener)
  let disposable
  if (outerSignal) {
    disposable = addAbortListener(outerSignal, abort)
  }
  let error
  let value
  const destroys = []
  let finishCount = 0
  function finish(err) {
    finishImpl(err, --finishCount === 0)
  }
  function finishImpl(err, final) {
    var _disposable
    if (err && (!error || error.code === 'ERR_STREAM_PREMATURE_CLOSE')) {
      error = err
    }
    if (!error && !final) {
      return
    }
    while (destroys.length) {
      destroys.shift()(error)
    }
    ;(_disposable = disposable) === null || _disposable === undefined ? undefined : _disposable[SymbolDispose]()
    ac.abort()
    if (final) {
      if (!error) {
        lastStreamCleanup.forEach((fn) => fn())
      }
      process.nextTick(callback, error, value)
    }
  }
  let ret
  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i]
    const reading = i < streams.length - 1
    const writing = i > 0
    const end = reading || (opts === null || opts === undefined ? undefined : opts.end) !== false
    const isLastStream = i === streams.length - 1
    if (isNodeStream(stream)) {
      if (end) {
        const { destroy, cleanup } = destroyer(stream, reading, writing)
        destroys.push(destroy)
        if (isReadable(stream) && isLastStream) {
          lastStreamCleanup.push(cleanup)
        }
      }

      // Catch stream errors that occur after pipe/pump has completed.
      function onError(err) {
        if (err && err.name !== 'AbortError' && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
          finish(err)
        }
      }
      stream.on('error', onError)
      if (isReadable(stream) && isLastStream) {
        lastStreamCleanup.push(() => {
          stream.removeListener('error', onError)
        })
      }
    }
    if (i === 0) {
      if (typeof stream === 'function') {
        ret = stream({
          signal
        })
        if (!isIterable(ret)) {
          throw new ERR_INVALID_RETURN_VALUE('Iterable, AsyncIterable or Stream', 'source', ret)
        }
      } else if (isIterable(stream) || isReadableNodeStream(stream) || isTransformStream(stream)) {
        ret = stream
      } else {
        ret = Duplex.from(stream)
      }
    } else if (typeof stream === 'function') {
      if (isTransformStream(ret)) {
        var _ret
        ret = makeAsyncIterable((_ret = ret) === null || _ret === undefined ? undefined : _ret.readable)
      } else {
        ret = makeAsyncIterable(ret)
      }
      ret = stream(ret, {
        signal
      })
      if (reading) {
        if (!isIterable(ret, true)) {
          throw new ERR_INVALID_RETURN_VALUE('AsyncIterable', `transform[${i - 1}]`, ret)
        }
      } else {
        var _ret2
        if (!PassThrough) {
          PassThrough = __webpack_require__(71)
        }

        // If the last argument to pipeline is not a stream
        // we must create a proxy stream so that pipeline(...)
        // always returns a stream which can be further
        // composed through `.pipe(stream)`.

        const pt = new PassThrough({
          objectMode: true
        })

        // Handle Promises/A+ spec, `then` could be a getter that throws on
        // second use.
        const then = (_ret2 = ret) === null || _ret2 === undefined ? undefined : _ret2.then
        if (typeof then === 'function') {
          finishCount++
          then.call(
            ret,
            (val) => {
              value = val
              if (val != null) {
                pt.write(val)
              }
              if (end) {
                pt.end()
              }
              process.nextTick(finish)
            },
            (err) => {
              pt.destroy(err)
              process.nextTick(finish, err)
            }
          )
        } else if (isIterable(ret, true)) {
          finishCount++
          pumpToNode(ret, pt, finish, {
            end
          })
        } else if (isReadableStream(ret) || isTransformStream(ret)) {
          const toRead = ret.readable || ret
          finishCount++
          pumpToNode(toRead, pt, finish, {
            end
          })
        } else {
          throw new ERR_INVALID_RETURN_VALUE('AsyncIterable or Promise', 'destination', ret)
        }
        ret = pt
        const { destroy, cleanup } = destroyer(ret, false, true)
        destroys.push(destroy)
        if (isLastStream) {
          lastStreamCleanup.push(cleanup)
        }
      }
    } else if (isNodeStream(stream)) {
      if (isReadableNodeStream(ret)) {
        finishCount += 2
        const cleanup = pipe(ret, stream, finish, {
          end
        })
        if (isReadable(stream) && isLastStream) {
          lastStreamCleanup.push(cleanup)
        }
      } else if (isTransformStream(ret) || isReadableStream(ret)) {
        const toRead = ret.readable || ret
        finishCount++
        pumpToNode(toRead, stream, finish, {
          end
        })
      } else if (isIterable(ret)) {
        finishCount++
        pumpToNode(ret, stream, finish, {
          end
        })
      } else {
        throw new ERR_INVALID_ARG_TYPE(
          'val',
          ['Readable', 'Iterable', 'AsyncIterable', 'ReadableStream', 'TransformStream'],
          ret
        )
      }
      ret = stream
    } else if (isWebStream(stream)) {
      if (isReadableNodeStream(ret)) {
        finishCount++
        pumpToWeb(makeAsyncIterable(ret), stream, finish, {
          end
        })
      } else if (isReadableStream(ret) || isIterable(ret)) {
        finishCount++
        pumpToWeb(ret, stream, finish, {
          end
        })
      } else if (isTransformStream(ret)) {
        finishCount++
        pumpToWeb(ret.readable, stream, finish, {
          end
        })
      } else {
        throw new ERR_INVALID_ARG_TYPE(
          'val',
          ['Readable', 'Iterable', 'AsyncIterable', 'ReadableStream', 'TransformStream'],
          ret
        )
      }
      ret = stream
    } else {
      ret = Duplex.from(stream)
    }
  }
  if (
    (signal !== null && signal !== undefined && signal.aborted) ||
    (outerSignal !== null && outerSignal !== undefined && outerSignal.aborted)
  ) {
    process.nextTick(abort)
  }
  return ret
}
function pipe(src, dst, finish, { end }) {
  let ended = false
  dst.on('close', () => {
    if (!ended) {
      // Finish if the destination closes before the source has completed.
      finish(new ERR_STREAM_PREMATURE_CLOSE())
    }
  })
  src.pipe(dst, {
    end: false
  }) // If end is true we already will have a listener to end dst.

  if (end) {
    // Compat. Before node v10.12.0 stdio used to throw an error so
    // pipe() did/does not end() stdio destinations.
    // Now they allow it but "secretly" don't close the underlying fd.

    function endFn() {
      ended = true
      dst.end()
    }
    if (isReadableFinished(src)) {
      // End the destination if the source has already ended.
      process.nextTick(endFn)
    } else {
      src.once('end', endFn)
    }
  } else {
    finish()
  }
  eos(
    src,
    {
      readable: true,
      writable: false
    },
    (err) => {
      const rState = src._readableState
      if (
        err &&
        err.code === 'ERR_STREAM_PREMATURE_CLOSE' &&
        rState &&
        rState.ended &&
        !rState.errored &&
        !rState.errorEmitted
      ) {
        // Some readable streams will emit 'close' before 'end'. However, since
        // this is on the readable side 'end' should still be emitted if the
        // stream has been ended and no error emitted. This should be allowed in
        // favor of backwards compatibility. Since the stream is piped to a
        // destination this should not result in any observable difference.
        // We don't need to check if this is a writable premature close since
        // eos will only fail with premature close on the reading side for
        // duplex streams.
        src.once('end', finish).once('error', finish)
      } else {
        finish(err)
      }
    }
  )
  return eos(
    dst,
    {
      readable: false,
      writable: true
    },
    finish
  )
}
module.exports = {
  pipelineImpl,
  pipeline
}


/***/ }),
/* 59 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


/* replacement start */

const process = __webpack_require__(13)

/* replacement end */

const {
  aggregateTwoErrors,
  codes: { ERR_MULTIPLE_CALLBACK },
  AbortError
} = __webpack_require__(53)
const { Symbol } = __webpack_require__(48)
const { kIsDestroyed, isDestroyed, isFinished, isServerRequest } = __webpack_require__(56)
const kDestroy = Symbol('kDestroy')
const kConstruct = Symbol('kConstruct')
function checkError(err, w, r) {
  if (err) {
    // Avoid V8 leak, https://github.com/nodejs/node/pull/34103#issuecomment-652002364
    err.stack // eslint-disable-line no-unused-expressions

    if (w && !w.errored) {
      w.errored = err
    }
    if (r && !r.errored) {
      r.errored = err
    }
  }
}

// Backwards compat. cb() is undocumented and unused in core but
// unfortunately might be used by modules.
function destroy(err, cb) {
  const r = this._readableState
  const w = this._writableState
  // With duplex streams we use the writable side for state.
  const s = w || r
  if ((w !== null && w !== undefined && w.destroyed) || (r !== null && r !== undefined && r.destroyed)) {
    if (typeof cb === 'function') {
      cb()
    }
    return this
  }

  // We set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks
  checkError(err, w, r)
  if (w) {
    w.destroyed = true
  }
  if (r) {
    r.destroyed = true
  }

  // If still constructing then defer calling _destroy.
  if (!s.constructed) {
    this.once(kDestroy, function (er) {
      _destroy(this, aggregateTwoErrors(er, err), cb)
    })
  } else {
    _destroy(this, err, cb)
  }
  return this
}
function _destroy(self, err, cb) {
  let called = false
  function onDestroy(err) {
    if (called) {
      return
    }
    called = true
    const r = self._readableState
    const w = self._writableState
    checkError(err, w, r)
    if (w) {
      w.closed = true
    }
    if (r) {
      r.closed = true
    }
    if (typeof cb === 'function') {
      cb(err)
    }
    if (err) {
      process.nextTick(emitErrorCloseNT, self, err)
    } else {
      process.nextTick(emitCloseNT, self)
    }
  }
  try {
    self._destroy(err || null, onDestroy)
  } catch (err) {
    onDestroy(err)
  }
}
function emitErrorCloseNT(self, err) {
  emitErrorNT(self, err)
  emitCloseNT(self)
}
function emitCloseNT(self) {
  const r = self._readableState
  const w = self._writableState
  if (w) {
    w.closeEmitted = true
  }
  if (r) {
    r.closeEmitted = true
  }
  if ((w !== null && w !== undefined && w.emitClose) || (r !== null && r !== undefined && r.emitClose)) {
    self.emit('close')
  }
}
function emitErrorNT(self, err) {
  const r = self._readableState
  const w = self._writableState
  if ((w !== null && w !== undefined && w.errorEmitted) || (r !== null && r !== undefined && r.errorEmitted)) {
    return
  }
  if (w) {
    w.errorEmitted = true
  }
  if (r) {
    r.errorEmitted = true
  }
  self.emit('error', err)
}
function undestroy() {
  const r = this._readableState
  const w = this._writableState
  if (r) {
    r.constructed = true
    r.closed = false
    r.closeEmitted = false
    r.destroyed = false
    r.errored = null
    r.errorEmitted = false
    r.reading = false
    r.ended = r.readable === false
    r.endEmitted = r.readable === false
  }
  if (w) {
    w.constructed = true
    w.destroyed = false
    w.closed = false
    w.closeEmitted = false
    w.errored = null
    w.errorEmitted = false
    w.finalCalled = false
    w.prefinished = false
    w.ended = w.writable === false
    w.ending = w.writable === false
    w.finished = w.writable === false
  }
}
function errorOrDestroy(stream, err, sync) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.

  const r = stream._readableState
  const w = stream._writableState
  if ((w !== null && w !== undefined && w.destroyed) || (r !== null && r !== undefined && r.destroyed)) {
    return this
  }
  if ((r !== null && r !== undefined && r.autoDestroy) || (w !== null && w !== undefined && w.autoDestroy))
    stream.destroy(err)
  else if (err) {
    // Avoid V8 leak, https://github.com/nodejs/node/pull/34103#issuecomment-652002364
    err.stack // eslint-disable-line no-unused-expressions

    if (w && !w.errored) {
      w.errored = err
    }
    if (r && !r.errored) {
      r.errored = err
    }
    if (sync) {
      process.nextTick(emitErrorNT, stream, err)
    } else {
      emitErrorNT(stream, err)
    }
  }
}
function construct(stream, cb) {
  if (typeof stream._construct !== 'function') {
    return
  }
  const r = stream._readableState
  const w = stream._writableState
  if (r) {
    r.constructed = false
  }
  if (w) {
    w.constructed = false
  }
  stream.once(kConstruct, cb)
  if (stream.listenerCount(kConstruct) > 1) {
    // Duplex
    return
  }
  process.nextTick(constructNT, stream)
}
function constructNT(stream) {
  let called = false
  function onConstruct(err) {
    if (called) {
      errorOrDestroy(stream, err !== null && err !== undefined ? err : new ERR_MULTIPLE_CALLBACK())
      return
    }
    called = true
    const r = stream._readableState
    const w = stream._writableState
    const s = w || r
    if (r) {
      r.constructed = true
    }
    if (w) {
      w.constructed = true
    }
    if (s.destroyed) {
      stream.emit(kDestroy, err)
    } else if (err) {
      errorOrDestroy(stream, err, true)
    } else {
      process.nextTick(emitConstructNT, stream)
    }
  }
  try {
    stream._construct((err) => {
      process.nextTick(onConstruct, err)
    })
  } catch (err) {
    process.nextTick(onConstruct, err)
  }
}
function emitConstructNT(stream) {
  stream.emit(kConstruct)
}
function isRequest(stream) {
  return (stream === null || stream === undefined ? undefined : stream.setHeader) && typeof stream.abort === 'function'
}
function emitCloseLegacy(stream) {
  stream.emit('close')
}
function emitErrorCloseLegacy(stream, err) {
  stream.emit('error', err)
  process.nextTick(emitCloseLegacy, stream)
}

// Normalize destroy for legacy.
function destroyer(stream, err) {
  if (!stream || isDestroyed(stream)) {
    return
  }
  if (!err && !isFinished(stream)) {
    err = new AbortError()
  }

  // TODO: Remove isRequest branches.
  if (isServerRequest(stream)) {
    stream.socket = null
    stream.destroy(err)
  } else if (isRequest(stream)) {
    stream.abort()
  } else if (isRequest(stream.req)) {
    stream.req.abort()
  } else if (typeof stream.destroy === 'function') {
    stream.destroy(err)
  } else if (typeof stream.close === 'function') {
    // TODO: Don't lose err?
    stream.close()
  } else if (err) {
    process.nextTick(emitErrorCloseLegacy, stream, err)
  } else {
    process.nextTick(emitCloseLegacy, stream)
  }
  if (!stream.destroyed) {
    stream[kIsDestroyed] = true
  }
}
module.exports = {
  construct,
  destroyer,
  destroy,
  undestroy,
  errorOrDestroy
}


/***/ }),
/* 60 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototype inheritance, this class
// prototypically inherits from Readable, and then parasitically from
// Writable.



const {
  ObjectDefineProperties,
  ObjectGetOwnPropertyDescriptor,
  ObjectKeys,
  ObjectSetPrototypeOf
} = __webpack_require__(48)
module.exports = Duplex
const Readable = __webpack_require__(61)
const Writable = __webpack_require__(69)
ObjectSetPrototypeOf(Duplex.prototype, Readable.prototype)
ObjectSetPrototypeOf(Duplex, Readable)
{
  const keys = ObjectKeys(Writable.prototype)
  // Allow the keys array to be GC'ed.
  for (let i = 0; i < keys.length; i++) {
    const method = keys[i]
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method]
  }
}
function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options)
  Readable.call(this, options)
  Writable.call(this, options)
  if (options) {
    this.allowHalfOpen = options.allowHalfOpen !== false
    if (options.readable === false) {
      this._readableState.readable = false
      this._readableState.ended = true
      this._readableState.endEmitted = true
    }
    if (options.writable === false) {
      this._writableState.writable = false
      this._writableState.ending = true
      this._writableState.ended = true
      this._writableState.finished = true
    }
  } else {
    this.allowHalfOpen = true
  }
}
ObjectDefineProperties(Duplex.prototype, {
  writable: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writable')
  },
  writableHighWaterMark: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableHighWaterMark')
  },
  writableObjectMode: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableObjectMode')
  },
  writableBuffer: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableBuffer')
  },
  writableLength: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableLength')
  },
  writableFinished: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableFinished')
  },
  writableCorked: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableCorked')
  },
  writableEnded: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableEnded')
  },
  writableNeedDrain: {
    __proto__: null,
    ...ObjectGetOwnPropertyDescriptor(Writable.prototype, 'writableNeedDrain')
  },
  destroyed: {
    __proto__: null,
    get() {
      if (this._readableState === undefined || this._writableState === undefined) {
        return false
      }
      return this._readableState.destroyed && this._writableState.destroyed
    },
    set(value) {
      // Backward compatibility, the user is explicitly
      // managing destroyed.
      if (this._readableState && this._writableState) {
        this._readableState.destroyed = value
        this._writableState.destroyed = value
      }
    }
  }
})
let webStreamsAdapters

// Lazy to avoid circular references
function lazyWebStreams() {
  if (webStreamsAdapters === undefined) webStreamsAdapters = {}
  return webStreamsAdapters
}
Duplex.fromWeb = function (pair, options) {
  return lazyWebStreams().newStreamDuplexFromReadableWritablePair(pair, options)
}
Duplex.toWeb = function (duplex) {
  return lazyWebStreams().newReadableWritablePairFromDuplex(duplex)
}
let duplexify
Duplex.from = function (body) {
  if (!duplexify) {
    duplexify = __webpack_require__(70)
  }
  return duplexify(body, 'body')
}


/***/ }),
/* 61 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* replacement start */

const process = __webpack_require__(13)

/* replacement end */
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

;('use strict')
const {
  ArrayPrototypeIndexOf,
  NumberIsInteger,
  NumberIsNaN,
  NumberParseInt,
  ObjectDefineProperties,
  ObjectKeys,
  ObjectSetPrototypeOf,
  Promise,
  SafeSet,
  SymbolAsyncDispose,
  SymbolAsyncIterator,
  Symbol
} = __webpack_require__(48)
module.exports = Readable
Readable.ReadableState = ReadableState
const { EventEmitter: EE } = __webpack_require__(51)
const { Stream, prependListener } = __webpack_require__(62)
const { Buffer } = __webpack_require__(9)
const { addAbortSignal } = __webpack_require__(63)
const eos = __webpack_require__(55)
let debug = (__webpack_require__(49).debuglog)('stream', (fn) => {
  debug = fn
})
const BufferList = __webpack_require__(64)
const destroyImpl = __webpack_require__(59)
const { getHighWaterMark, getDefaultHighWaterMark } = __webpack_require__(65)
const {
  aggregateTwoErrors,
  codes: {
    ERR_INVALID_ARG_TYPE,
    ERR_METHOD_NOT_IMPLEMENTED,
    ERR_OUT_OF_RANGE,
    ERR_STREAM_PUSH_AFTER_EOF,
    ERR_STREAM_UNSHIFT_AFTER_END_EVENT
  },
  AbortError
} = __webpack_require__(53)
const { validateObject } = __webpack_require__(54)
const kPaused = Symbol('kPaused')
const { StringDecoder } = __webpack_require__(66)
const from = __webpack_require__(68)
ObjectSetPrototypeOf(Readable.prototype, Stream.prototype)
ObjectSetPrototypeOf(Readable, Stream)
const nop = () => {}
const { errorOrDestroy } = destroyImpl
const kObjectMode = 1 << 0
const kEnded = 1 << 1
const kEndEmitted = 1 << 2
const kReading = 1 << 3
const kConstructed = 1 << 4
const kSync = 1 << 5
const kNeedReadable = 1 << 6
const kEmittedReadable = 1 << 7
const kReadableListening = 1 << 8
const kResumeScheduled = 1 << 9
const kErrorEmitted = 1 << 10
const kEmitClose = 1 << 11
const kAutoDestroy = 1 << 12
const kDestroyed = 1 << 13
const kClosed = 1 << 14
const kCloseEmitted = 1 << 15
const kMultiAwaitDrain = 1 << 16
const kReadingMore = 1 << 17
const kDataEmitted = 1 << 18

// TODO(benjamingr) it is likely slower to do it this way than with free functions
function makeBitMapDescriptor(bit) {
  return {
    enumerable: false,
    get() {
      return (this.state & bit) !== 0
    },
    set(value) {
      if (value) this.state |= bit
      else this.state &= ~bit
    }
  }
}
ObjectDefineProperties(ReadableState.prototype, {
  objectMode: makeBitMapDescriptor(kObjectMode),
  ended: makeBitMapDescriptor(kEnded),
  endEmitted: makeBitMapDescriptor(kEndEmitted),
  reading: makeBitMapDescriptor(kReading),
  // Stream is still being constructed and cannot be
  // destroyed until construction finished or failed.
  // Async construction is opt in, therefore we start as
  // constructed.
  constructed: makeBitMapDescriptor(kConstructed),
  // A flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  sync: makeBitMapDescriptor(kSync),
  // Whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  needReadable: makeBitMapDescriptor(kNeedReadable),
  emittedReadable: makeBitMapDescriptor(kEmittedReadable),
  readableListening: makeBitMapDescriptor(kReadableListening),
  resumeScheduled: makeBitMapDescriptor(kResumeScheduled),
  // True if the error was already emitted and should not be thrown again.
  errorEmitted: makeBitMapDescriptor(kErrorEmitted),
  emitClose: makeBitMapDescriptor(kEmitClose),
  autoDestroy: makeBitMapDescriptor(kAutoDestroy),
  // Has it been destroyed.
  destroyed: makeBitMapDescriptor(kDestroyed),
  // Indicates whether the stream has finished destroying.
  closed: makeBitMapDescriptor(kClosed),
  // True if close has been emitted or would have been emitted
  // depending on emitClose.
  closeEmitted: makeBitMapDescriptor(kCloseEmitted),
  multiAwaitDrain: makeBitMapDescriptor(kMultiAwaitDrain),
  // If true, a maybeReadMore has been scheduled.
  readingMore: makeBitMapDescriptor(kReadingMore),
  dataEmitted: makeBitMapDescriptor(kDataEmitted)
})
function ReadableState(options, stream, isDuplex) {
  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof __webpack_require__(60)

  // Bit map field to store ReadableState more effciently with 1 bit per field
  // instead of a V8 slot per field.
  this.state = kEmitClose | kAutoDestroy | kConstructed | kSync
  // Object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away.
  if (options && options.objectMode) this.state |= kObjectMode
  if (isDuplex && options && options.readableObjectMode) this.state |= kObjectMode

  // The point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  this.highWaterMark = options
    ? getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex)
    : getDefaultHighWaterMark(false)

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift().
  this.buffer = new BufferList()
  this.length = 0
  this.pipes = []
  this.flowing = null
  this[kPaused] = null

  // Should close be emitted on destroy. Defaults to true.
  if (options && options.emitClose === false) this.state &= ~kEmitClose

  // Should .destroy() be called after 'end' (and potentially 'finish').
  if (options && options.autoDestroy === false) this.state &= ~kAutoDestroy

  // Indicates whether the stream has errored. When true no further
  // _read calls, 'data' or 'readable' events should occur. This is needed
  // since when autoDestroy is disabled we need a way to tell whether the
  // stream has failed.
  this.errored = null

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = (options && options.defaultEncoding) || 'utf8'

  // Ref the piped dest which we need a drain event on it
  // type: null | Writable | Set<Writable>.
  this.awaitDrainWriters = null
  this.decoder = null
  this.encoding = null
  if (options && options.encoding) {
    this.decoder = new StringDecoder(options.encoding)
    this.encoding = options.encoding
  }
}
function Readable(options) {
  if (!(this instanceof Readable)) return new Readable(options)

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5.
  const isDuplex = this instanceof __webpack_require__(60)
  this._readableState = new ReadableState(options, this, isDuplex)
  if (options) {
    if (typeof options.read === 'function') this._read = options.read
    if (typeof options.destroy === 'function') this._destroy = options.destroy
    if (typeof options.construct === 'function') this._construct = options.construct
    if (options.signal && !isDuplex) addAbortSignal(options.signal, this)
  }
  Stream.call(this, options)
  destroyImpl.construct(this, () => {
    if (this._readableState.needReadable) {
      maybeReadMore(this, this._readableState)
    }
  })
}
Readable.prototype.destroy = destroyImpl.destroy
Readable.prototype._undestroy = destroyImpl.undestroy
Readable.prototype._destroy = function (err, cb) {
  cb(err)
}
Readable.prototype[EE.captureRejectionSymbol] = function (err) {
  this.destroy(err)
}
Readable.prototype[SymbolAsyncDispose] = function () {
  let error
  if (!this.destroyed) {
    error = this.readableEnded ? null : new AbortError()
    this.destroy(error)
  }
  return new Promise((resolve, reject) => eos(this, (err) => (err && err !== error ? reject(err) : resolve(null))))
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  return readableAddChunk(this, chunk, encoding, false)
}

// Unshift should *always* be something directly out of read().
Readable.prototype.unshift = function (chunk, encoding) {
  return readableAddChunk(this, chunk, encoding, true)
}
function readableAddChunk(stream, chunk, encoding, addToFront) {
  debug('readableAddChunk', chunk)
  const state = stream._readableState
  let err
  if ((state.state & kObjectMode) === 0) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding
      if (state.encoding !== encoding) {
        if (addToFront && state.encoding) {
          // When unshifting, if state.encoding is set, we have to save
          // the string in the BufferList with the state encoding.
          chunk = Buffer.from(chunk, encoding).toString(state.encoding)
        } else {
          chunk = Buffer.from(chunk, encoding)
          encoding = ''
        }
      }
    } else if (chunk instanceof Buffer) {
      encoding = ''
    } else if (Stream._isUint8Array(chunk)) {
      chunk = Stream._uint8ArrayToBuffer(chunk)
      encoding = ''
    } else if (chunk != null) {
      err = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk)
    }
  }
  if (err) {
    errorOrDestroy(stream, err)
  } else if (chunk === null) {
    state.state &= ~kReading
    onEofChunk(stream, state)
  } else if ((state.state & kObjectMode) !== 0 || (chunk && chunk.length > 0)) {
    if (addToFront) {
      if ((state.state & kEndEmitted) !== 0) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT())
      else if (state.destroyed || state.errored) return false
      else addChunk(stream, state, chunk, true)
    } else if (state.ended) {
      errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF())
    } else if (state.destroyed || state.errored) {
      return false
    } else {
      state.state &= ~kReading
      if (state.decoder && !encoding) {
        chunk = state.decoder.write(chunk)
        if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false)
        else maybeReadMore(stream, state)
      } else {
        addChunk(stream, state, chunk, false)
      }
    }
  } else if (!addToFront) {
    state.state &= ~kReading
    maybeReadMore(stream, state)
  }

  // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.
  return !state.ended && (state.length < state.highWaterMark || state.length === 0)
}
function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync && stream.listenerCount('data') > 0) {
    // Use the guard to avoid creating `Set()` repeatedly
    // when we have multiple pipes.
    if ((state.state & kMultiAwaitDrain) !== 0) {
      state.awaitDrainWriters.clear()
    } else {
      state.awaitDrainWriters = null
    }
    state.dataEmitted = true
    stream.emit('data', chunk)
  } else {
    // Update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length
    if (addToFront) state.buffer.unshift(chunk)
    else state.buffer.push(chunk)
    if ((state.state & kNeedReadable) !== 0) emitReadable(stream)
  }
  maybeReadMore(stream, state)
}
Readable.prototype.isPaused = function () {
  const state = this._readableState
  return state[kPaused] === true || state.flowing === false
}

// Backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  const decoder = new StringDecoder(enc)
  this._readableState.decoder = decoder
  // If setEncoding(null), decoder.encoding equals utf8.
  this._readableState.encoding = this._readableState.decoder.encoding
  const buffer = this._readableState.buffer
  // Iterate over current buffer to convert already stored Buffers:
  let content = ''
  for (const data of buffer) {
    content += decoder.write(data)
  }
  buffer.clear()
  if (content !== '') buffer.push(content)
  this._readableState.length = content.length
  return this
}

// Don't raise the hwm > 1GB.
const MAX_HWM = 0x40000000
function computeNewHighWaterMark(n) {
  if (n > MAX_HWM) {
    throw new ERR_OUT_OF_RANGE('size', '<= 1GiB', n)
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts.
    n--
    n |= n >>> 1
    n |= n >>> 2
    n |= n >>> 4
    n |= n >>> 8
    n |= n >>> 16
    n++
  }
  return n
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || (state.length === 0 && state.ended)) return 0
  if ((state.state & kObjectMode) !== 0) return 1
  if (NumberIsNaN(n)) {
    // Only flow one buffer at a time.
    if (state.flowing && state.length) return state.buffer.first().length
    return state.length
  }
  if (n <= state.length) return n
  return state.ended ? state.length : 0
}

// You can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n)
  // Same as parseInt(undefined, 10), however V8 7.3 performance regressed
  // in this scenario, so we are doing it manually.
  if (n === undefined) {
    n = NaN
  } else if (!NumberIsInteger(n)) {
    n = NumberParseInt(n, 10)
  }
  const state = this._readableState
  const nOrig = n

  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n)
  if (n !== 0) state.state &= ~kEmittedReadable

  // If we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (
    n === 0 &&
    state.needReadable &&
    ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)
  ) {
    debug('read: emitReadable', state.length, state.ended)
    if (state.length === 0 && state.ended) endReadable(this)
    else emitReadable(this)
    return null
  }
  n = howMuchToRead(n, state)

  // If we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this)
    return null
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  let doRead = (state.state & kNeedReadable) !== 0
  debug('need readable', doRead)

  // If we currently have less than the highWaterMark, then also read some.
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true
    debug('length less than watermark', doRead)
  }

  // However, if we've ended, then there's no point, if we're already
  // reading, then it's unnecessary, if we're constructing we have to wait,
  // and if we're destroyed or errored, then it's not allowed,
  if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
    doRead = false
    debug('reading, ended or constructing', doRead)
  } else if (doRead) {
    debug('do read')
    state.state |= kReading | kSync
    // If the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.state |= kNeedReadable

    // Call internal read method
    try {
      this._read(state.highWaterMark)
    } catch (err) {
      errorOrDestroy(this, err)
    }
    state.state &= ~kSync

    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state)
  }
  let ret
  if (n > 0) ret = fromList(n, state)
  else ret = null
  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark
    n = 0
  } else {
    state.length -= n
    if (state.multiAwaitDrain) {
      state.awaitDrainWriters.clear()
    } else {
      state.awaitDrainWriters = null
    }
  }
  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this)
  }
  if (ret !== null && !state.errorEmitted && !state.closeEmitted) {
    state.dataEmitted = true
    this.emit('data', ret)
  }
  return ret
}
function onEofChunk(stream, state) {
  debug('onEofChunk')
  if (state.ended) return
  if (state.decoder) {
    const chunk = state.decoder.end()
    if (chunk && chunk.length) {
      state.buffer.push(chunk)
      state.length += state.objectMode ? 1 : chunk.length
    }
  }
  state.ended = true
  if (state.sync) {
    // If we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call.
    emitReadable(stream)
  } else {
    // Emit 'readable' now to make sure it gets picked up.
    state.needReadable = false
    state.emittedReadable = true
    // We have to emit readable now that we are EOF. Modules
    // in the ecosystem (e.g. dicer) rely on this event being sync.
    emitReadable_(stream)
  }
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  const state = stream._readableState
  debug('emitReadable', state.needReadable, state.emittedReadable)
  state.needReadable = false
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing)
    state.emittedReadable = true
    process.nextTick(emitReadable_, stream)
  }
}
function emitReadable_(stream) {
  const state = stream._readableState
  debug('emitReadable_', state.destroyed, state.length, state.ended)
  if (!state.destroyed && !state.errored && (state.length || state.ended)) {
    stream.emit('readable')
    state.emittedReadable = false
  }

  // The stream needs another readable event if:
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.
  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark
  flow(stream)
}

// At this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore && state.constructed) {
    state.readingMore = true
    process.nextTick(maybeReadMore_, stream, state)
  }
}
function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (
    !state.reading &&
    !state.ended &&
    (state.length < state.highWaterMark || (state.flowing && state.length === 0))
  ) {
    const len = state.length
    debug('maybeReadMore read 0')
    stream.read(0)
    if (len === state.length)
      // Didn't get any data, stop spinning.
      break
  }
  state.readingMore = false
}

// Abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  throw new ERR_METHOD_NOT_IMPLEMENTED('_read()')
}
Readable.prototype.pipe = function (dest, pipeOpts) {
  const src = this
  const state = this._readableState
  if (state.pipes.length === 1) {
    if (!state.multiAwaitDrain) {
      state.multiAwaitDrain = true
      state.awaitDrainWriters = new SafeSet(state.awaitDrainWriters ? [state.awaitDrainWriters] : [])
    }
  }
  state.pipes.push(dest)
  debug('pipe count=%d opts=%j', state.pipes.length, pipeOpts)
  const doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr
  const endFn = doEnd ? onend : unpipe
  if (state.endEmitted) process.nextTick(endFn)
  else src.once('end', endFn)
  dest.on('unpipe', onunpipe)
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe')
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true
        cleanup()
      }
    }
  }
  function onend() {
    debug('onend')
    dest.end()
  }
  let ondrain
  let cleanedUp = false
  function cleanup() {
    debug('cleanup')
    // Cleanup event handlers once the pipe is broken.
    dest.removeListener('close', onclose)
    dest.removeListener('finish', onfinish)
    if (ondrain) {
      dest.removeListener('drain', ondrain)
    }
    dest.removeListener('error', onerror)
    dest.removeListener('unpipe', onunpipe)
    src.removeListener('end', onend)
    src.removeListener('end', unpipe)
    src.removeListener('data', ondata)
    cleanedUp = true

    // If the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain)) ondrain()
  }
  function pause() {
    // If the user unpiped during `dest.write()`, it is possible
    // to get stuck in a permanently paused state if that write
    // also returned false.
    // => Check whether `dest` is still a piping destination.
    if (!cleanedUp) {
      if (state.pipes.length === 1 && state.pipes[0] === dest) {
        debug('false write response, pause', 0)
        state.awaitDrainWriters = dest
        state.multiAwaitDrain = false
      } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
        debug('false write response, pause', state.awaitDrainWriters.size)
        state.awaitDrainWriters.add(dest)
      }
      src.pause()
    }
    if (!ondrain) {
      // When the dest drains, it reduces the awaitDrain counter
      // on the source.  This would be more elegant with a .once()
      // handler in flow(), but adding and removing repeatedly is
      // too slow.
      ondrain = pipeOnDrain(src, dest)
      dest.on('drain', ondrain)
    }
  }
  src.on('data', ondata)
  function ondata(chunk) {
    debug('ondata')
    const ret = dest.write(chunk)
    debug('dest.write', ret)
    if (ret === false) {
      pause()
    }
  }

  // If the dest has an error, then stop piping into it.
  // However, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er)
    unpipe()
    dest.removeListener('error', onerror)
    if (dest.listenerCount('error') === 0) {
      const s = dest._writableState || dest._readableState
      if (s && !s.errorEmitted) {
        // User incorrectly emitted 'error' directly on the stream.
        errorOrDestroy(dest, er)
      } else {
        dest.emit('error', er)
      }
    }
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror)

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish)
    unpipe()
  }
  dest.once('close', onclose)
  function onfinish() {
    debug('onfinish')
    dest.removeListener('close', onclose)
    unpipe()
  }
  dest.once('finish', onfinish)
  function unpipe() {
    debug('unpipe')
    src.unpipe(dest)
  }

  // Tell the dest that it's being piped to.
  dest.emit('pipe', src)

  // Start the flow if it hasn't been started already.

  if (dest.writableNeedDrain === true) {
    pause()
  } else if (!state.flowing) {
    debug('pipe resume')
    src.resume()
  }
  return dest
}
function pipeOnDrain(src, dest) {
  return function pipeOnDrainFunctionResult() {
    const state = src._readableState

    // `ondrain` will call directly,
    // `this` maybe not a reference to dest,
    // so we use the real dest here.
    if (state.awaitDrainWriters === dest) {
      debug('pipeOnDrain', 1)
      state.awaitDrainWriters = null
    } else if (state.multiAwaitDrain) {
      debug('pipeOnDrain', state.awaitDrainWriters.size)
      state.awaitDrainWriters.delete(dest)
    }
    if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && src.listenerCount('data')) {
      src.resume()
    }
  }
}
Readable.prototype.unpipe = function (dest) {
  const state = this._readableState
  const unpipeInfo = {
    hasUnpiped: false
  }

  // If we're not piping anywhere, then do nothing.
  if (state.pipes.length === 0) return this
  if (!dest) {
    // remove all.
    const dests = state.pipes
    state.pipes = []
    this.pause()
    for (let i = 0; i < dests.length; i++)
      dests[i].emit('unpipe', this, {
        hasUnpiped: false
      })
    return this
  }

  // Try to find the right one.
  const index = ArrayPrototypeIndexOf(state.pipes, dest)
  if (index === -1) return this
  state.pipes.splice(index, 1)
  if (state.pipes.length === 0) this.pause()
  dest.emit('unpipe', this, unpipeInfo)
  return this
}

// Set up data events if they are asked for
// Ensure readable listeners eventually get something.
Readable.prototype.on = function (ev, fn) {
  const res = Stream.prototype.on.call(this, ev, fn)
  const state = this._readableState
  if (ev === 'data') {
    // Update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0

    // Try start flowing on next tick if stream isn't explicitly paused.
    if (state.flowing !== false) this.resume()
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true
      state.flowing = false
      state.emittedReadable = false
      debug('on readable', state.length, state.reading)
      if (state.length) {
        emitReadable(this)
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this)
      }
    }
  }
  return res
}
Readable.prototype.addListener = Readable.prototype.on
Readable.prototype.removeListener = function (ev, fn) {
  const res = Stream.prototype.removeListener.call(this, ev, fn)
  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this)
  }
  return res
}
Readable.prototype.off = Readable.prototype.removeListener
Readable.prototype.removeAllListeners = function (ev) {
  const res = Stream.prototype.removeAllListeners.apply(this, arguments)
  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this)
  }
  return res
}
function updateReadableListening(self) {
  const state = self._readableState
  state.readableListening = self.listenerCount('readable') > 0
  if (state.resumeScheduled && state[kPaused] === false) {
    // Flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true

    // Crude way to check if we should resume.
  } else if (self.listenerCount('data') > 0) {
    self.resume()
  } else if (!state.readableListening) {
    state.flowing = null
  }
}
function nReadingNextTick(self) {
  debug('readable nexttick read 0')
  self.read(0)
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  const state = this._readableState
  if (!state.flowing) {
    debug('resume')
    // We flow only if there is no one listening
    // for readable, but we still have to call
    // resume().
    state.flowing = !state.readableListening
    resume(this, state)
  }
  state[kPaused] = false
  return this
}
function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true
    process.nextTick(resume_, stream, state)
  }
}
function resume_(stream, state) {
  debug('resume', state.reading)
  if (!state.reading) {
    stream.read(0)
  }
  state.resumeScheduled = false
  stream.emit('resume')
  flow(stream)
  if (state.flowing && !state.reading) stream.read(0)
}
Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing)
  if (this._readableState.flowing !== false) {
    debug('pause')
    this._readableState.flowing = false
    this.emit('pause')
  }
  this._readableState[kPaused] = true
  return this
}
function flow(stream) {
  const state = stream._readableState
  debug('flow', state.flowing)
  while (state.flowing && stream.read() !== null);
}

// Wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  let paused = false

  // TODO (ronag): Should this.destroy(err) emit
  // 'error' on the wrapped stream? Would require
  // a static factory method, e.g. Readable.wrap(stream).

  stream.on('data', (chunk) => {
    if (!this.push(chunk) && stream.pause) {
      paused = true
      stream.pause()
    }
  })
  stream.on('end', () => {
    this.push(null)
  })
  stream.on('error', (err) => {
    errorOrDestroy(this, err)
  })
  stream.on('close', () => {
    this.destroy()
  })
  stream.on('destroy', () => {
    this.destroy()
  })
  this._read = () => {
    if (paused && stream.resume) {
      paused = false
      stream.resume()
    }
  }

  // Proxy all the other methods. Important when wrapping filters and duplexes.
  const streamKeys = ObjectKeys(stream)
  for (let j = 1; j < streamKeys.length; j++) {
    const i = streamKeys[j]
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = stream[i].bind(stream)
    }
  }
  return this
}
Readable.prototype[SymbolAsyncIterator] = function () {
  return streamToAsyncIterator(this)
}
Readable.prototype.iterator = function (options) {
  if (options !== undefined) {
    validateObject(options, 'options')
  }
  return streamToAsyncIterator(this, options)
}
function streamToAsyncIterator(stream, options) {
  if (typeof stream.read !== 'function') {
    stream = Readable.wrap(stream, {
      objectMode: true
    })
  }
  const iter = createAsyncIterator(stream, options)
  iter.stream = stream
  return iter
}
async function* createAsyncIterator(stream, options) {
  let callback = nop
  function next(resolve) {
    if (this === stream) {
      callback()
      callback = nop
    } else {
      callback = resolve
    }
  }
  stream.on('readable', next)
  let error
  const cleanup = eos(
    stream,
    {
      writable: false
    },
    (err) => {
      error = err ? aggregateTwoErrors(error, err) : null
      callback()
      callback = nop
    }
  )
  try {
    while (true) {
      const chunk = stream.destroyed ? null : stream.read()
      if (chunk !== null) {
        yield chunk
      } else if (error) {
        throw error
      } else if (error === null) {
        return
      } else {
        await new Promise(next)
      }
    }
  } catch (err) {
    error = aggregateTwoErrors(error, err)
    throw error
  } finally {
    if (
      (error || (options === null || options === undefined ? undefined : options.destroyOnReturn) !== false) &&
      (error === undefined || stream._readableState.autoDestroy)
    ) {
      destroyImpl.destroyer(stream, null)
    } else {
      stream.off('readable', next)
      cleanup()
    }
  }
}

// Making it explicit these properties are not enumerable
// because otherwise some prototype manipulation in
// userland will fail.
ObjectDefineProperties(Readable.prototype, {
  readable: {
    __proto__: null,
    get() {
      const r = this._readableState
      // r.readable === false means that this is part of a Duplex stream
      // where the readable side was disabled upon construction.
      // Compat. The user might manually disable readable side through
      // deprecated setter.
      return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted
    },
    set(val) {
      // Backwards compat.
      if (this._readableState) {
        this._readableState.readable = !!val
      }
    }
  },
  readableDidRead: {
    __proto__: null,
    enumerable: false,
    get: function () {
      return this._readableState.dataEmitted
    }
  },
  readableAborted: {
    __proto__: null,
    enumerable: false,
    get: function () {
      return !!(
        this._readableState.readable !== false &&
        (this._readableState.destroyed || this._readableState.errored) &&
        !this._readableState.endEmitted
      )
    }
  },
  readableHighWaterMark: {
    __proto__: null,
    enumerable: false,
    get: function () {
      return this._readableState.highWaterMark
    }
  },
  readableBuffer: {
    __proto__: null,
    enumerable: false,
    get: function () {
      return this._readableState && this._readableState.buffer
    }
  },
  readableFlowing: {
    __proto__: null,
    enumerable: false,
    get: function () {
      return this._readableState.flowing
    },
    set: function (state) {
      if (this._readableState) {
        this._readableState.flowing = state
      }
    }
  },
  readableLength: {
    __proto__: null,
    enumerable: false,
    get() {
      return this._readableState.length
    }
  },
  readableObjectMode: {
    __proto__: null,
    enumerable: false,
    get() {
      return this._readableState ? this._readableState.objectMode : false
    }
  },
  readableEncoding: {
    __proto__: null,
    enumerable: false,
    get() {
      return this._readableState ? this._readableState.encoding : null
    }
  },
  errored: {
    __proto__: null,
    enumerable: false,
    get() {
      return this._readableState ? this._readableState.errored : null
    }
  },
  closed: {
    __proto__: null,
    get() {
      return this._readableState ? this._readableState.closed : false
    }
  },
  destroyed: {
    __proto__: null,
    enumerable: false,
    get() {
      return this._readableState ? this._readableState.destroyed : false
    },
    set(value) {
      // We ignore the value if the stream
      // has not been initialized yet.
      if (!this._readableState) {
        return
      }

      // Backward compatibility, the user is explicitly
      // managing destroyed.
      this._readableState.destroyed = value
    }
  },
  readableEnded: {
    __proto__: null,
    enumerable: false,
    get() {
      return this._readableState ? this._readableState.endEmitted : false
    }
  }
})
ObjectDefineProperties(ReadableState.prototype, {
  // Legacy getter for `pipesCount`.
  pipesCount: {
    __proto__: null,
    get() {
      return this.pipes.length
    }
  },
  // Legacy property for `paused`.
  paused: {
    __proto__: null,
    get() {
      return this[kPaused] !== false
    },
    set(value) {
      this[kPaused] = !!value
    }
  }
})

// Exposed for testing purposes only.
Readable._fromList = fromList

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered.
  if (state.length === 0) return null
  let ret
  if (state.objectMode) ret = state.buffer.shift()
  else if (!n || n >= state.length) {
    // Read it all, truncate the list.
    if (state.decoder) ret = state.buffer.join('')
    else if (state.buffer.length === 1) ret = state.buffer.first()
    else ret = state.buffer.concat(state.length)
    state.buffer.clear()
  } else {
    // read part of list.
    ret = state.buffer.consume(n, state.decoder)
  }
  return ret
}
function endReadable(stream) {
  const state = stream._readableState
  debug('endReadable', state.endEmitted)
  if (!state.endEmitted) {
    state.ended = true
    process.nextTick(endReadableNT, state, stream)
  }
}
function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length)

  // Check that we didn't get one last unshift.
  if (!state.errored && !state.closeEmitted && !state.endEmitted && state.length === 0) {
    state.endEmitted = true
    stream.emit('end')
    if (stream.writable && stream.allowHalfOpen === false) {
      process.nextTick(endWritableNT, stream)
    } else if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well.
      const wState = stream._writableState
      const autoDestroy =
        !wState ||
        (wState.autoDestroy &&
          // We don't expect the writable to ever 'finish'
          // if writable is explicitly set to false.
          (wState.finished || wState.writable === false))
      if (autoDestroy) {
        stream.destroy()
      }
    }
  }
}
function endWritableNT(stream) {
  const writable = stream.writable && !stream.writableEnded && !stream.destroyed
  if (writable) {
    stream.end()
  }
}
Readable.from = function (iterable, opts) {
  return from(Readable, iterable, opts)
}
let webStreamsAdapters

// Lazy to avoid circular references
function lazyWebStreams() {
  if (webStreamsAdapters === undefined) webStreamsAdapters = {}
  return webStreamsAdapters
}
Readable.fromWeb = function (readableStream, options) {
  return lazyWebStreams().newStreamReadableFromReadableStream(readableStream, options)
}
Readable.toWeb = function (streamReadable, options) {
  return lazyWebStreams().newReadableStreamFromStreamReadable(streamReadable, options)
}
Readable.wrap = function (src, options) {
  var _ref, _src$readableObjectMo
  return new Readable({
    objectMode:
      (_ref =
        (_src$readableObjectMo = src.readableObjectMode) !== null && _src$readableObjectMo !== undefined
          ? _src$readableObjectMo
          : src.objectMode) !== null && _ref !== undefined
        ? _ref
        : true,
    ...options,
    destroy(err, callback) {
      destroyImpl.destroyer(src, err)
      callback(err)
    }
  }).wrap(src)
}


/***/ }),
/* 62 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { ArrayIsArray, ObjectSetPrototypeOf } = __webpack_require__(48)
const { EventEmitter: EE } = __webpack_require__(51)
function Stream(opts) {
  EE.call(this, opts)
}
ObjectSetPrototypeOf(Stream.prototype, EE.prototype)
ObjectSetPrototypeOf(Stream, EE)
Stream.prototype.pipe = function (dest, options) {
  const source = this
  function ondata(chunk) {
    if (dest.writable && dest.write(chunk) === false && source.pause) {
      source.pause()
    }
  }
  source.on('data', ondata)
  function ondrain() {
    if (source.readable && source.resume) {
      source.resume()
    }
  }
  dest.on('drain', ondrain)

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend)
    source.on('close', onclose)
  }
  let didOnEnd = false
  function onend() {
    if (didOnEnd) return
    didOnEnd = true
    dest.end()
  }
  function onclose() {
    if (didOnEnd) return
    didOnEnd = true
    if (typeof dest.destroy === 'function') dest.destroy()
  }

  // Don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup()
    if (EE.listenerCount(this, 'error') === 0) {
      this.emit('error', er)
    }
  }
  prependListener(source, 'error', onerror)
  prependListener(dest, 'error', onerror)

  // Remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata)
    dest.removeListener('drain', ondrain)
    source.removeListener('end', onend)
    source.removeListener('close', onclose)
    source.removeListener('error', onerror)
    dest.removeListener('error', onerror)
    source.removeListener('end', cleanup)
    source.removeListener('close', cleanup)
    dest.removeListener('close', cleanup)
  }
  source.on('end', cleanup)
  source.on('close', cleanup)
  dest.on('close', cleanup)
  dest.emit('pipe', source)

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest
}
function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn)

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn)
  else if (ArrayIsArray(emitter._events[event])) emitter._events[event].unshift(fn)
  else emitter._events[event] = [fn, emitter._events[event]]
}
module.exports = {
  Stream,
  prependListener
}


/***/ }),
/* 63 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { SymbolDispose } = __webpack_require__(48)
const { AbortError, codes } = __webpack_require__(53)
const { isNodeStream, isWebStream, kControllerErrorFunction } = __webpack_require__(56)
const eos = __webpack_require__(55)
const { ERR_INVALID_ARG_TYPE } = codes
let addAbortListener

// This method is inlined here for readable-stream
// It also does not allow for signal to not exist on the stream
// https://github.com/nodejs/node/pull/36061#discussion_r533718029
const validateAbortSignal = (signal, name) => {
  if (typeof signal !== 'object' || !('aborted' in signal)) {
    throw new ERR_INVALID_ARG_TYPE(name, 'AbortSignal', signal)
  }
}
module.exports.addAbortSignal = function addAbortSignal(signal, stream) {
  validateAbortSignal(signal, 'signal')
  if (!isNodeStream(stream) && !isWebStream(stream)) {
    throw new ERR_INVALID_ARG_TYPE('stream', ['ReadableStream', 'WritableStream', 'Stream'], stream)
  }
  return module.exports.addAbortSignalNoValidate(signal, stream)
}
module.exports.addAbortSignalNoValidate = function (signal, stream) {
  if (typeof signal !== 'object' || !('aborted' in signal)) {
    return stream
  }
  const onAbort = isNodeStream(stream)
    ? () => {
        stream.destroy(
          new AbortError(undefined, {
            cause: signal.reason
          })
        )
      }
    : () => {
        stream[kControllerErrorFunction](
          new AbortError(undefined, {
            cause: signal.reason
          })
        )
      }
  if (signal.aborted) {
    onAbort()
  } else {
    addAbortListener = addAbortListener || (__webpack_require__(49).addAbortListener)
    const disposable = addAbortListener(signal, onAbort)
    eos(stream, disposable[SymbolDispose])
  }
  return stream
}


/***/ }),
/* 64 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { StringPrototypeSlice, SymbolIterator, TypedArrayPrototypeSet, Uint8Array } = __webpack_require__(48)
const { Buffer } = __webpack_require__(9)
const { inspect } = __webpack_require__(49)
module.exports = class BufferList {
  constructor() {
    this.head = null
    this.tail = null
    this.length = 0
  }
  push(v) {
    const entry = {
      data: v,
      next: null
    }
    if (this.length > 0) this.tail.next = entry
    else this.head = entry
    this.tail = entry
    ++this.length
  }
  unshift(v) {
    const entry = {
      data: v,
      next: this.head
    }
    if (this.length === 0) this.tail = entry
    this.head = entry
    ++this.length
  }
  shift() {
    if (this.length === 0) return
    const ret = this.head.data
    if (this.length === 1) this.head = this.tail = null
    else this.head = this.head.next
    --this.length
    return ret
  }
  clear() {
    this.head = this.tail = null
    this.length = 0
  }
  join(s) {
    if (this.length === 0) return ''
    let p = this.head
    let ret = '' + p.data
    while ((p = p.next) !== null) ret += s + p.data
    return ret
  }
  concat(n) {
    if (this.length === 0) return Buffer.alloc(0)
    const ret = Buffer.allocUnsafe(n >>> 0)
    let p = this.head
    let i = 0
    while (p) {
      TypedArrayPrototypeSet(ret, p.data, i)
      i += p.data.length
      p = p.next
    }
    return ret
  }

  // Consumes a specified amount of bytes or characters from the buffered data.
  consume(n, hasStrings) {
    const data = this.head.data
    if (n < data.length) {
      // `slice` is the same for buffers and strings.
      const slice = data.slice(0, n)
      this.head.data = data.slice(n)
      return slice
    }
    if (n === data.length) {
      // First chunk is a perfect match.
      return this.shift()
    }
    // Result spans more than one buffer.
    return hasStrings ? this._getString(n) : this._getBuffer(n)
  }
  first() {
    return this.head.data
  }
  *[SymbolIterator]() {
    for (let p = this.head; p; p = p.next) {
      yield p.data
    }
  }

  // Consumes a specified amount of characters from the buffered data.
  _getString(n) {
    let ret = ''
    let p = this.head
    let c = 0
    do {
      const str = p.data
      if (n > str.length) {
        ret += str
        n -= str.length
      } else {
        if (n === str.length) {
          ret += str
          ++c
          if (p.next) this.head = p.next
          else this.head = this.tail = null
        } else {
          ret += StringPrototypeSlice(str, 0, n)
          this.head = p
          p.data = StringPrototypeSlice(str, n)
        }
        break
      }
      ++c
    } while ((p = p.next) !== null)
    this.length -= c
    return ret
  }

  // Consumes a specified amount of bytes from the buffered data.
  _getBuffer(n) {
    const ret = Buffer.allocUnsafe(n)
    const retLen = n
    let p = this.head
    let c = 0
    do {
      const buf = p.data
      if (n > buf.length) {
        TypedArrayPrototypeSet(ret, buf, retLen - n)
        n -= buf.length
      } else {
        if (n === buf.length) {
          TypedArrayPrototypeSet(ret, buf, retLen - n)
          ++c
          if (p.next) this.head = p.next
          else this.head = this.tail = null
        } else {
          TypedArrayPrototypeSet(ret, new Uint8Array(buf.buffer, buf.byteOffset, n), retLen - n)
          this.head = p
          p.data = buf.slice(n)
        }
        break
      }
      ++c
    } while ((p = p.next) !== null)
    this.length -= c
    return ret
  }

  // Make sure the linked list only shows the minimal necessary information.
  [Symbol.for('nodejs.util.inspect.custom')](_, options) {
    return inspect(this, {
      ...options,
      // Only inspect one level.
      depth: 0,
      // It should not recurse.
      customInspect: false
    })
  }
}


/***/ }),
/* 65 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { MathFloor, NumberIsInteger } = __webpack_require__(48)
const { validateInteger } = __webpack_require__(54)
const { ERR_INVALID_ARG_VALUE } = (__webpack_require__(53).codes)
let defaultHighWaterMarkBytes = 16 * 1024
let defaultHighWaterMarkObjectMode = 16
function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null
}
function getDefaultHighWaterMark(objectMode) {
  return objectMode ? defaultHighWaterMarkObjectMode : defaultHighWaterMarkBytes
}
function setDefaultHighWaterMark(objectMode, value) {
  validateInteger(value, 'value', 0)
  if (objectMode) {
    defaultHighWaterMarkObjectMode = value
  } else {
    defaultHighWaterMarkBytes = value
  }
}
function getHighWaterMark(state, options, duplexKey, isDuplex) {
  const hwm = highWaterMarkFrom(options, isDuplex, duplexKey)
  if (hwm != null) {
    if (!NumberIsInteger(hwm) || hwm < 0) {
      const name = isDuplex ? `options.${duplexKey}` : 'options.highWaterMark'
      throw new ERR_INVALID_ARG_VALUE(name, hwm)
    }
    return MathFloor(hwm)
  }

  // Default value
  return getDefaultHighWaterMark(state.objectMode)
}
module.exports = {
  getHighWaterMark,
  getDefaultHighWaterMark,
  setDefaultHighWaterMark
}


/***/ }),
/* 66 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



/*<replacement>*/

var Buffer = (__webpack_require__(67).Buffer);
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}

/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = __webpack_require__(9)
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}


/***/ }),
/* 68 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


/* replacement start */

const process = __webpack_require__(13)

/* replacement end */

const { PromisePrototypeThen, SymbolAsyncIterator, SymbolIterator } = __webpack_require__(48)
const { Buffer } = __webpack_require__(9)
const { ERR_INVALID_ARG_TYPE, ERR_STREAM_NULL_VALUES } = (__webpack_require__(53).codes)
function from(Readable, iterable, opts) {
  let iterator
  if (typeof iterable === 'string' || iterable instanceof Buffer) {
    return new Readable({
      objectMode: true,
      ...opts,
      read() {
        this.push(iterable)
        this.push(null)
      }
    })
  }
  let isAsync
  if (iterable && iterable[SymbolAsyncIterator]) {
    isAsync = true
    iterator = iterable[SymbolAsyncIterator]()
  } else if (iterable && iterable[SymbolIterator]) {
    isAsync = false
    iterator = iterable[SymbolIterator]()
  } else {
    throw new ERR_INVALID_ARG_TYPE('iterable', ['Iterable'], iterable)
  }
  const readable = new Readable({
    objectMode: true,
    highWaterMark: 1,
    // TODO(ronag): What options should be allowed?
    ...opts
  })

  // Flag to protect against _read
  // being called before last iteration completion.
  let reading = false
  readable._read = function () {
    if (!reading) {
      reading = true
      next()
    }
  }
  readable._destroy = function (error, cb) {
    PromisePrototypeThen(
      close(error),
      () => process.nextTick(cb, error),
      // nextTick is here in case cb throws
      (e) => process.nextTick(cb, e || error)
    )
  }
  async function close(error) {
    const hadError = error !== undefined && error !== null
    const hasThrow = typeof iterator.throw === 'function'
    if (hadError && hasThrow) {
      const { value, done } = await iterator.throw(error)
      await value
      if (done) {
        return
      }
    }
    if (typeof iterator.return === 'function') {
      const { value } = await iterator.return()
      await value
    }
  }
  async function next() {
    for (;;) {
      try {
        const { value, done } = isAsync ? await iterator.next() : iterator.next()
        if (done) {
          readable.push(null)
        } else {
          const res = value && typeof value.then === 'function' ? await value : value
          if (res === null) {
            reading = false
            throw new ERR_STREAM_NULL_VALUES()
          } else if (readable.push(res)) {
            continue
          } else {
            reading = false
          }
        }
      } catch (err) {
        readable.destroy(err)
      }
      break
    }
  }
  return readable
}
module.exports = from


/***/ }),
/* 69 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* replacement start */

const process = __webpack_require__(13)

/* replacement end */
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

;('use strict')
const {
  ArrayPrototypeSlice,
  Error,
  FunctionPrototypeSymbolHasInstance,
  ObjectDefineProperty,
  ObjectDefineProperties,
  ObjectSetPrototypeOf,
  StringPrototypeToLowerCase,
  Symbol,
  SymbolHasInstance
} = __webpack_require__(48)
module.exports = Writable
Writable.WritableState = WritableState
const { EventEmitter: EE } = __webpack_require__(51)
const Stream = (__webpack_require__(62).Stream)
const { Buffer } = __webpack_require__(9)
const destroyImpl = __webpack_require__(59)
const { addAbortSignal } = __webpack_require__(63)
const { getHighWaterMark, getDefaultHighWaterMark } = __webpack_require__(65)
const {
  ERR_INVALID_ARG_TYPE,
  ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK,
  ERR_STREAM_CANNOT_PIPE,
  ERR_STREAM_DESTROYED,
  ERR_STREAM_ALREADY_FINISHED,
  ERR_STREAM_NULL_VALUES,
  ERR_STREAM_WRITE_AFTER_END,
  ERR_UNKNOWN_ENCODING
} = (__webpack_require__(53).codes)
const { errorOrDestroy } = destroyImpl
ObjectSetPrototypeOf(Writable.prototype, Stream.prototype)
ObjectSetPrototypeOf(Writable, Stream)
function nop() {}
const kOnFinished = Symbol('kOnFinished')
function WritableState(options, stream, isDuplex) {
  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof __webpack_require__(60)

  // Object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!(options && options.objectMode)
  if (isDuplex) this.objectMode = this.objectMode || !!(options && options.writableObjectMode)

  // The point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write().
  this.highWaterMark = options
    ? getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex)
    : getDefaultHighWaterMark(false)

  // if _final has been called.
  this.finalCalled = false

  // drain event flag.
  this.needDrain = false
  // At the start of calling end()
  this.ending = false
  // When end() has been called, and returned.
  this.ended = false
  // When 'finish' is emitted.
  this.finished = false

  // Has it been destroyed
  this.destroyed = false

  // Should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  const noDecode = !!(options && options.decodeStrings === false)
  this.decodeStrings = !noDecode

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = (options && options.defaultEncoding) || 'utf8'

  // Not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0

  // A flag to see when we're in the middle of a write.
  this.writing = false

  // When true all writes will be buffered until .uncork() call.
  this.corked = 0

  // A flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true

  // A flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false

  // The callback that's passed to _write(chunk, cb).
  this.onwrite = onwrite.bind(undefined, stream)

  // The callback that the user supplies to write(chunk, encoding, cb).
  this.writecb = null

  // The amount that is being written when _write is called.
  this.writelen = 0

  // Storage for data passed to the afterWrite() callback in case of
  // synchronous _write() completion.
  this.afterWriteTickInfo = null
  resetBuffer(this)

  // Number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted.
  this.pendingcb = 0

  // Stream is still being constructed and cannot be
  // destroyed until construction finished or failed.
  // Async construction is opt in, therefore we start as
  // constructed.
  this.constructed = true

  // Emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams.
  this.prefinished = false

  // True if the error was already emitted and should not be thrown again.
  this.errorEmitted = false

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = !options || options.emitClose !== false

  // Should .destroy() be called after 'finish' (and potentially 'end').
  this.autoDestroy = !options || options.autoDestroy !== false

  // Indicates whether the stream has errored. When true all write() calls
  // should return false. This is needed since when autoDestroy
  // is disabled we need a way to tell whether the stream has failed.
  this.errored = null

  // Indicates whether the stream has finished destroying.
  this.closed = false

  // True if close has been emitted or would have been emitted
  // depending on emitClose.
  this.closeEmitted = false
  this[kOnFinished] = []
}
function resetBuffer(state) {
  state.buffered = []
  state.bufferedIndex = 0
  state.allBuffers = true
  state.allNoop = true
}
WritableState.prototype.getBuffer = function getBuffer() {
  return ArrayPrototypeSlice(this.buffered, this.bufferedIndex)
}
ObjectDefineProperty(WritableState.prototype, 'bufferedRequestCount', {
  __proto__: null,
  get() {
    return this.buffered.length - this.bufferedIndex
  }
})
function Writable(options) {
  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5.
  const isDuplex = this instanceof __webpack_require__(60)
  if (!isDuplex && !FunctionPrototypeSymbolHasInstance(Writable, this)) return new Writable(options)
  this._writableState = new WritableState(options, this, isDuplex)
  if (options) {
    if (typeof options.write === 'function') this._write = options.write
    if (typeof options.writev === 'function') this._writev = options.writev
    if (typeof options.destroy === 'function') this._destroy = options.destroy
    if (typeof options.final === 'function') this._final = options.final
    if (typeof options.construct === 'function') this._construct = options.construct
    if (options.signal) addAbortSignal(options.signal, this)
  }
  Stream.call(this, options)
  destroyImpl.construct(this, () => {
    const state = this._writableState
    if (!state.writing) {
      clearBuffer(this, state)
    }
    finishMaybe(this, state)
  })
}
ObjectDefineProperty(Writable, SymbolHasInstance, {
  __proto__: null,
  value: function (object) {
    if (FunctionPrototypeSymbolHasInstance(this, object)) return true
    if (this !== Writable) return false
    return object && object._writableState instanceof WritableState
  }
})

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE())
}
function _write(stream, chunk, encoding, cb) {
  const state = stream._writableState
  if (typeof encoding === 'function') {
    cb = encoding
    encoding = state.defaultEncoding
  } else {
    if (!encoding) encoding = state.defaultEncoding
    else if (encoding !== 'buffer' && !Buffer.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding)
    if (typeof cb !== 'function') cb = nop
  }
  if (chunk === null) {
    throw new ERR_STREAM_NULL_VALUES()
  } else if (!state.objectMode) {
    if (typeof chunk === 'string') {
      if (state.decodeStrings !== false) {
        chunk = Buffer.from(chunk, encoding)
        encoding = 'buffer'
      }
    } else if (chunk instanceof Buffer) {
      encoding = 'buffer'
    } else if (Stream._isUint8Array(chunk)) {
      chunk = Stream._uint8ArrayToBuffer(chunk)
      encoding = 'buffer'
    } else {
      throw new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk)
    }
  }
  let err
  if (state.ending) {
    err = new ERR_STREAM_WRITE_AFTER_END()
  } else if (state.destroyed) {
    err = new ERR_STREAM_DESTROYED('write')
  }
  if (err) {
    process.nextTick(cb, err)
    errorOrDestroy(stream, err, true)
    return err
  }
  state.pendingcb++
  return writeOrBuffer(stream, state, chunk, encoding, cb)
}
Writable.prototype.write = function (chunk, encoding, cb) {
  return _write(this, chunk, encoding, cb) === true
}
Writable.prototype.cork = function () {
  this._writableState.corked++
}
Writable.prototype.uncork = function () {
  const state = this._writableState
  if (state.corked) {
    state.corked--
    if (!state.writing) clearBuffer(this, state)
  }
}
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = StringPrototypeToLowerCase(encoding)
  if (!Buffer.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding)
  this._writableState.defaultEncoding = encoding
  return this
}

// If we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, callback) {
  const len = state.objectMode ? 1 : chunk.length
  state.length += len

  // stream._write resets state.length
  const ret = state.length < state.highWaterMark
  // We must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true
  if (state.writing || state.corked || state.errored || !state.constructed) {
    state.buffered.push({
      chunk,
      encoding,
      callback
    })
    if (state.allBuffers && encoding !== 'buffer') {
      state.allBuffers = false
    }
    if (state.allNoop && callback !== nop) {
      state.allNoop = false
    }
  } else {
    state.writelen = len
    state.writecb = callback
    state.writing = true
    state.sync = true
    stream._write(chunk, encoding, state.onwrite)
    state.sync = false
  }

  // Return false if errored or destroyed in order to break
  // any synchronous while(stream.write(data)) loops.
  return ret && !state.errored && !state.destroyed
}
function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len
  state.writecb = cb
  state.writing = true
  state.sync = true
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'))
  else if (writev) stream._writev(chunk, state.onwrite)
  else stream._write(chunk, encoding, state.onwrite)
  state.sync = false
}
function onwriteError(stream, state, er, cb) {
  --state.pendingcb
  cb(er)
  // Ensure callbacks are invoked even when autoDestroy is
  // not enabled. Passing `er` here doesn't make sense since
  // it's related to one specific write, not to the buffered
  // writes.
  errorBuffer(state)
  // This can emit error, but error must always follow cb.
  errorOrDestroy(stream, er)
}
function onwrite(stream, er) {
  const state = stream._writableState
  const sync = state.sync
  const cb = state.writecb
  if (typeof cb !== 'function') {
    errorOrDestroy(stream, new ERR_MULTIPLE_CALLBACK())
    return
  }
  state.writing = false
  state.writecb = null
  state.length -= state.writelen
  state.writelen = 0
  if (er) {
    // Avoid V8 leak, https://github.com/nodejs/node/pull/34103#issuecomment-652002364
    er.stack // eslint-disable-line no-unused-expressions

    if (!state.errored) {
      state.errored = er
    }

    // In case of duplex streams we need to notify the readable side of the
    // error.
    if (stream._readableState && !stream._readableState.errored) {
      stream._readableState.errored = er
    }
    if (sync) {
      process.nextTick(onwriteError, stream, state, er, cb)
    } else {
      onwriteError(stream, state, er, cb)
    }
  } else {
    if (state.buffered.length > state.bufferedIndex) {
      clearBuffer(stream, state)
    }
    if (sync) {
      // It is a common case that the callback passed to .write() is always
      // the same. In that case, we do not schedule a new nextTick(), but
      // rather just increase a counter, to improve performance and avoid
      // memory allocations.
      if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
        state.afterWriteTickInfo.count++
      } else {
        state.afterWriteTickInfo = {
          count: 1,
          cb,
          stream,
          state
        }
        process.nextTick(afterWriteTick, state.afterWriteTickInfo)
      }
    } else {
      afterWrite(stream, state, 1, cb)
    }
  }
}
function afterWriteTick({ stream, state, count, cb }) {
  state.afterWriteTickInfo = null
  return afterWrite(stream, state, count, cb)
}
function afterWrite(stream, state, count, cb) {
  const needDrain = !state.ending && !stream.destroyed && state.length === 0 && state.needDrain
  if (needDrain) {
    state.needDrain = false
    stream.emit('drain')
  }
  while (count-- > 0) {
    state.pendingcb--
    cb()
  }
  if (state.destroyed) {
    errorBuffer(state)
  }
  finishMaybe(stream, state)
}

// If there's something in the buffer waiting, then invoke callbacks.
function errorBuffer(state) {
  if (state.writing) {
    return
  }
  for (let n = state.bufferedIndex; n < state.buffered.length; ++n) {
    var _state$errored
    const { chunk, callback } = state.buffered[n]
    const len = state.objectMode ? 1 : chunk.length
    state.length -= len
    callback(
      (_state$errored = state.errored) !== null && _state$errored !== undefined
        ? _state$errored
        : new ERR_STREAM_DESTROYED('write')
    )
  }
  const onfinishCallbacks = state[kOnFinished].splice(0)
  for (let i = 0; i < onfinishCallbacks.length; i++) {
    var _state$errored2
    onfinishCallbacks[i](
      (_state$errored2 = state.errored) !== null && _state$errored2 !== undefined
        ? _state$errored2
        : new ERR_STREAM_DESTROYED('end')
    )
  }
  resetBuffer(state)
}

// If there's something in the buffer waiting, then process it.
function clearBuffer(stream, state) {
  if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) {
    return
  }
  const { buffered, bufferedIndex, objectMode } = state
  const bufferedLength = buffered.length - bufferedIndex
  if (!bufferedLength) {
    return
  }
  let i = bufferedIndex
  state.bufferProcessing = true
  if (bufferedLength > 1 && stream._writev) {
    state.pendingcb -= bufferedLength - 1
    const callback = state.allNoop
      ? nop
      : (err) => {
          for (let n = i; n < buffered.length; ++n) {
            buffered[n].callback(err)
          }
        }
    // Make a copy of `buffered` if it's going to be used by `callback` above,
    // since `doWrite` will mutate the array.
    const chunks = state.allNoop && i === 0 ? buffered : ArrayPrototypeSlice(buffered, i)
    chunks.allBuffers = state.allBuffers
    doWrite(stream, state, true, state.length, chunks, '', callback)
    resetBuffer(state)
  } else {
    do {
      const { chunk, encoding, callback } = buffered[i]
      buffered[i++] = null
      const len = objectMode ? 1 : chunk.length
      doWrite(stream, state, false, len, chunk, encoding, callback)
    } while (i < buffered.length && !state.writing)
    if (i === buffered.length) {
      resetBuffer(state)
    } else if (i > 256) {
      buffered.splice(0, i)
      state.bufferedIndex = 0
    } else {
      state.bufferedIndex = i
    }
  }
  state.bufferProcessing = false
}
Writable.prototype._write = function (chunk, encoding, cb) {
  if (this._writev) {
    this._writev(
      [
        {
          chunk,
          encoding
        }
      ],
      cb
    )
  } else {
    throw new ERR_METHOD_NOT_IMPLEMENTED('_write()')
  }
}
Writable.prototype._writev = null
Writable.prototype.end = function (chunk, encoding, cb) {
  const state = this._writableState
  if (typeof chunk === 'function') {
    cb = chunk
    chunk = null
    encoding = null
  } else if (typeof encoding === 'function') {
    cb = encoding
    encoding = null
  }
  let err
  if (chunk !== null && chunk !== undefined) {
    const ret = _write(this, chunk, encoding)
    if (ret instanceof Error) {
      err = ret
    }
  }

  // .end() fully uncorks.
  if (state.corked) {
    state.corked = 1
    this.uncork()
  }
  if (err) {
    // Do nothing...
  } else if (!state.errored && !state.ending) {
    // This is forgiving in terms of unnecessary calls to end() and can hide
    // logic errors. However, usually such errors are harmless and causing a
    // hard error can be disproportionately destructive. It is not always
    // trivial for the user to determine whether end() needs to be called
    // or not.

    state.ending = true
    finishMaybe(this, state, true)
    state.ended = true
  } else if (state.finished) {
    err = new ERR_STREAM_ALREADY_FINISHED('end')
  } else if (state.destroyed) {
    err = new ERR_STREAM_DESTROYED('end')
  }
  if (typeof cb === 'function') {
    if (err || state.finished) {
      process.nextTick(cb, err)
    } else {
      state[kOnFinished].push(cb)
    }
  }
  return this
}
function needFinish(state) {
  return (
    state.ending &&
    !state.destroyed &&
    state.constructed &&
    state.length === 0 &&
    !state.errored &&
    state.buffered.length === 0 &&
    !state.finished &&
    !state.writing &&
    !state.errorEmitted &&
    !state.closeEmitted
  )
}
function callFinal(stream, state) {
  let called = false
  function onFinish(err) {
    if (called) {
      errorOrDestroy(stream, err !== null && err !== undefined ? err : ERR_MULTIPLE_CALLBACK())
      return
    }
    called = true
    state.pendingcb--
    if (err) {
      const onfinishCallbacks = state[kOnFinished].splice(0)
      for (let i = 0; i < onfinishCallbacks.length; i++) {
        onfinishCallbacks[i](err)
      }
      errorOrDestroy(stream, err, state.sync)
    } else if (needFinish(state)) {
      state.prefinished = true
      stream.emit('prefinish')
      // Backwards compat. Don't check state.sync here.
      // Some streams assume 'finish' will be emitted
      // asynchronously relative to _final callback.
      state.pendingcb++
      process.nextTick(finish, stream, state)
    }
  }
  state.sync = true
  state.pendingcb++
  try {
    stream._final(onFinish)
  } catch (err) {
    onFinish(err)
  }
  state.sync = false
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.finalCalled = true
      callFinal(stream, state)
    } else {
      state.prefinished = true
      stream.emit('prefinish')
    }
  }
}
function finishMaybe(stream, state, sync) {
  if (needFinish(state)) {
    prefinish(stream, state)
    if (state.pendingcb === 0) {
      if (sync) {
        state.pendingcb++
        process.nextTick(
          (stream, state) => {
            if (needFinish(state)) {
              finish(stream, state)
            } else {
              state.pendingcb--
            }
          },
          stream,
          state
        )
      } else if (needFinish(state)) {
        state.pendingcb++
        finish(stream, state)
      }
    }
  }
}
function finish(stream, state) {
  state.pendingcb--
  state.finished = true
  const onfinishCallbacks = state[kOnFinished].splice(0)
  for (let i = 0; i < onfinishCallbacks.length; i++) {
    onfinishCallbacks[i]()
  }
  stream.emit('finish')
  if (state.autoDestroy) {
    // In case of duplex streams we need a way to detect
    // if the readable side is ready for autoDestroy as well.
    const rState = stream._readableState
    const autoDestroy =
      !rState ||
      (rState.autoDestroy &&
        // We don't expect the readable to ever 'end'
        // if readable is explicitly set to false.
        (rState.endEmitted || rState.readable === false))
    if (autoDestroy) {
      stream.destroy()
    }
  }
}
ObjectDefineProperties(Writable.prototype, {
  closed: {
    __proto__: null,
    get() {
      return this._writableState ? this._writableState.closed : false
    }
  },
  destroyed: {
    __proto__: null,
    get() {
      return this._writableState ? this._writableState.destroyed : false
    },
    set(value) {
      // Backward compatibility, the user is explicitly managing destroyed.
      if (this._writableState) {
        this._writableState.destroyed = value
      }
    }
  },
  writable: {
    __proto__: null,
    get() {
      const w = this._writableState
      // w.writable === false means that this is part of a Duplex stream
      // where the writable side was disabled upon construction.
      // Compat. The user might manually disable writable side through
      // deprecated setter.
      return !!w && w.writable !== false && !w.destroyed && !w.errored && !w.ending && !w.ended
    },
    set(val) {
      // Backwards compatible.
      if (this._writableState) {
        this._writableState.writable = !!val
      }
    }
  },
  writableFinished: {
    __proto__: null,
    get() {
      return this._writableState ? this._writableState.finished : false
    }
  },
  writableObjectMode: {
    __proto__: null,
    get() {
      return this._writableState ? this._writableState.objectMode : false
    }
  },
  writableBuffer: {
    __proto__: null,
    get() {
      return this._writableState && this._writableState.getBuffer()
    }
  },
  writableEnded: {
    __proto__: null,
    get() {
      return this._writableState ? this._writableState.ending : false
    }
  },
  writableNeedDrain: {
    __proto__: null,
    get() {
      const wState = this._writableState
      if (!wState) return false
      return !wState.destroyed && !wState.ending && wState.needDrain
    }
  },
  writableHighWaterMark: {
    __proto__: null,
    get() {
      return this._writableState && this._writableState.highWaterMark
    }
  },
  writableCorked: {
    __proto__: null,
    get() {
      return this._writableState ? this._writableState.corked : 0
    }
  },
  writableLength: {
    __proto__: null,
    get() {
      return this._writableState && this._writableState.length
    }
  },
  errored: {
    __proto__: null,
    enumerable: false,
    get() {
      return this._writableState ? this._writableState.errored : null
    }
  },
  writableAborted: {
    __proto__: null,
    enumerable: false,
    get: function () {
      return !!(
        this._writableState.writable !== false &&
        (this._writableState.destroyed || this._writableState.errored) &&
        !this._writableState.finished
      )
    }
  }
})
const destroy = destroyImpl.destroy
Writable.prototype.destroy = function (err, cb) {
  const state = this._writableState

  // Invoke pending callbacks.
  if (!state.destroyed && (state.bufferedIndex < state.buffered.length || state[kOnFinished].length)) {
    process.nextTick(errorBuffer, state)
  }
  destroy.call(this, err, cb)
  return this
}
Writable.prototype._undestroy = destroyImpl.undestroy
Writable.prototype._destroy = function (err, cb) {
  cb(err)
}
Writable.prototype[EE.captureRejectionSymbol] = function (err) {
  this.destroy(err)
}
let webStreamsAdapters

// Lazy to avoid circular references
function lazyWebStreams() {
  if (webStreamsAdapters === undefined) webStreamsAdapters = {}
  return webStreamsAdapters
}
Writable.fromWeb = function (writableStream, options) {
  return lazyWebStreams().newStreamWritableFromWritableStream(writableStream, options)
}
Writable.toWeb = function (streamWritable) {
  return lazyWebStreams().newWritableStreamFromStreamWritable(streamWritable)
}


/***/ }),
/* 70 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* replacement start */

const process = __webpack_require__(13)

/* replacement end */

;('use strict')
const bufferModule = __webpack_require__(9)
const {
  isReadable,
  isWritable,
  isIterable,
  isNodeStream,
  isReadableNodeStream,
  isWritableNodeStream,
  isDuplexNodeStream,
  isReadableStream,
  isWritableStream
} = __webpack_require__(56)
const eos = __webpack_require__(55)
const {
  AbortError,
  codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_RETURN_VALUE }
} = __webpack_require__(53)
const { destroyer } = __webpack_require__(59)
const Duplex = __webpack_require__(60)
const Readable = __webpack_require__(61)
const Writable = __webpack_require__(69)
const { createDeferredPromise } = __webpack_require__(49)
const from = __webpack_require__(68)
const Blob = globalThis.Blob || bufferModule.Blob
const isBlob =
  typeof Blob !== 'undefined'
    ? function isBlob(b) {
        return b instanceof Blob
      }
    : function isBlob(b) {
        return false
      }
const AbortController = globalThis.AbortController || (__webpack_require__(50).AbortController)
const { FunctionPrototypeCall } = __webpack_require__(48)

// This is needed for pre node 17.
class Duplexify extends Duplex {
  constructor(options) {
    super(options)

    // https://github.com/nodejs/node/pull/34385

    if ((options === null || options === undefined ? undefined : options.readable) === false) {
      this._readableState.readable = false
      this._readableState.ended = true
      this._readableState.endEmitted = true
    }
    if ((options === null || options === undefined ? undefined : options.writable) === false) {
      this._writableState.writable = false
      this._writableState.ending = true
      this._writableState.ended = true
      this._writableState.finished = true
    }
  }
}
module.exports = function duplexify(body, name) {
  if (isDuplexNodeStream(body)) {
    return body
  }
  if (isReadableNodeStream(body)) {
    return _duplexify({
      readable: body
    })
  }
  if (isWritableNodeStream(body)) {
    return _duplexify({
      writable: body
    })
  }
  if (isNodeStream(body)) {
    return _duplexify({
      writable: false,
      readable: false
    })
  }
  if (isReadableStream(body)) {
    return _duplexify({
      readable: Readable.fromWeb(body)
    })
  }
  if (isWritableStream(body)) {
    return _duplexify({
      writable: Writable.fromWeb(body)
    })
  }
  if (typeof body === 'function') {
    const { value, write, final, destroy } = fromAsyncGen(body)
    if (isIterable(value)) {
      return from(Duplexify, value, {
        // TODO (ronag): highWaterMark?
        objectMode: true,
        write,
        final,
        destroy
      })
    }
    const then = value === null || value === undefined ? undefined : value.then
    if (typeof then === 'function') {
      let d
      const promise = FunctionPrototypeCall(
        then,
        value,
        (val) => {
          if (val != null) {
            throw new ERR_INVALID_RETURN_VALUE('nully', 'body', val)
          }
        },
        (err) => {
          destroyer(d, err)
        }
      )
      return (d = new Duplexify({
        // TODO (ronag): highWaterMark?
        objectMode: true,
        readable: false,
        write,
        final(cb) {
          final(async () => {
            try {
              await promise
              process.nextTick(cb, null)
            } catch (err) {
              process.nextTick(cb, err)
            }
          })
        },
        destroy
      }))
    }
    throw new ERR_INVALID_RETURN_VALUE('Iterable, AsyncIterable or AsyncFunction', name, value)
  }
  if (isBlob(body)) {
    return duplexify(body.arrayBuffer())
  }
  if (isIterable(body)) {
    return from(Duplexify, body, {
      // TODO (ronag): highWaterMark?
      objectMode: true,
      writable: false
    })
  }
  if (
    isReadableStream(body === null || body === undefined ? undefined : body.readable) &&
    isWritableStream(body === null || body === undefined ? undefined : body.writable)
  ) {
    return Duplexify.fromWeb(body)
  }
  if (
    typeof (body === null || body === undefined ? undefined : body.writable) === 'object' ||
    typeof (body === null || body === undefined ? undefined : body.readable) === 'object'
  ) {
    const readable =
      body !== null && body !== undefined && body.readable
        ? isReadableNodeStream(body === null || body === undefined ? undefined : body.readable)
          ? body === null || body === undefined
            ? undefined
            : body.readable
          : duplexify(body.readable)
        : undefined
    const writable =
      body !== null && body !== undefined && body.writable
        ? isWritableNodeStream(body === null || body === undefined ? undefined : body.writable)
          ? body === null || body === undefined
            ? undefined
            : body.writable
          : duplexify(body.writable)
        : undefined
    return _duplexify({
      readable,
      writable
    })
  }
  const then = body === null || body === undefined ? undefined : body.then
  if (typeof then === 'function') {
    let d
    FunctionPrototypeCall(
      then,
      body,
      (val) => {
        if (val != null) {
          d.push(val)
        }
        d.push(null)
      },
      (err) => {
        destroyer(d, err)
      }
    )
    return (d = new Duplexify({
      objectMode: true,
      writable: false,
      read() {}
    }))
  }
  throw new ERR_INVALID_ARG_TYPE(
    name,
    [
      'Blob',
      'ReadableStream',
      'WritableStream',
      'Stream',
      'Iterable',
      'AsyncIterable',
      'Function',
      '{ readable, writable } pair',
      'Promise'
    ],
    body
  )
}
function fromAsyncGen(fn) {
  let { promise, resolve } = createDeferredPromise()
  const ac = new AbortController()
  const signal = ac.signal
  const value = fn(
    (async function* () {
      while (true) {
        const _promise = promise
        promise = null
        const { chunk, done, cb } = await _promise
        process.nextTick(cb)
        if (done) return
        if (signal.aborted)
          throw new AbortError(undefined, {
            cause: signal.reason
          })
        ;({ promise, resolve } = createDeferredPromise())
        yield chunk
      }
    })(),
    {
      signal
    }
  )
  return {
    value,
    write(chunk, encoding, cb) {
      const _resolve = resolve
      resolve = null
      _resolve({
        chunk,
        done: false,
        cb
      })
    },
    final(cb) {
      const _resolve = resolve
      resolve = null
      _resolve({
        done: true,
        cb
      })
    },
    destroy(err, cb) {
      ac.abort()
      cb(err)
    }
  }
}
function _duplexify(pair) {
  const r = pair.readable && typeof pair.readable.read !== 'function' ? Readable.wrap(pair.readable) : pair.readable
  const w = pair.writable
  let readable = !!isReadable(r)
  let writable = !!isWritable(w)
  let ondrain
  let onfinish
  let onreadable
  let onclose
  let d
  function onfinished(err) {
    const cb = onclose
    onclose = null
    if (cb) {
      cb(err)
    } else if (err) {
      d.destroy(err)
    }
  }

  // TODO(ronag): Avoid double buffering.
  // Implement Writable/Readable/Duplex traits.
  // See, https://github.com/nodejs/node/pull/33515.
  d = new Duplexify({
    // TODO (ronag): highWaterMark?
    readableObjectMode: !!(r !== null && r !== undefined && r.readableObjectMode),
    writableObjectMode: !!(w !== null && w !== undefined && w.writableObjectMode),
    readable,
    writable
  })
  if (writable) {
    eos(w, (err) => {
      writable = false
      if (err) {
        destroyer(r, err)
      }
      onfinished(err)
    })
    d._write = function (chunk, encoding, callback) {
      if (w.write(chunk, encoding)) {
        callback()
      } else {
        ondrain = callback
      }
    }
    d._final = function (callback) {
      w.end()
      onfinish = callback
    }
    w.on('drain', function () {
      if (ondrain) {
        const cb = ondrain
        ondrain = null
        cb()
      }
    })
    w.on('finish', function () {
      if (onfinish) {
        const cb = onfinish
        onfinish = null
        cb()
      }
    })
  }
  if (readable) {
    eos(r, (err) => {
      readable = false
      if (err) {
        destroyer(r, err)
      }
      onfinished(err)
    })
    r.on('readable', function () {
      if (onreadable) {
        const cb = onreadable
        onreadable = null
        cb()
      }
    })
    r.on('end', function () {
      d.push(null)
    })
    d._read = function () {
      while (true) {
        const buf = r.read()
        if (buf === null) {
          onreadable = d._read
          return
        }
        if (!d.push(buf)) {
          return
        }
      }
    }
  }
  d._destroy = function (err, callback) {
    if (!err && onclose !== null) {
      err = new AbortError()
    }
    onreadable = null
    ondrain = null
    onfinish = null
    if (onclose === null) {
      callback(err)
    } else {
      onclose = callback
      destroyer(w, err)
      destroyer(r, err)
    }
  }
  return d
}


/***/ }),
/* 71 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.



const { ObjectSetPrototypeOf } = __webpack_require__(48)
module.exports = PassThrough
const Transform = __webpack_require__(72)
ObjectSetPrototypeOf(PassThrough.prototype, Transform.prototype)
ObjectSetPrototypeOf(PassThrough, Transform)
function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options)
  Transform.call(this, options)
}
PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk)
}


/***/ }),
/* 72 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.



const { ObjectSetPrototypeOf, Symbol } = __webpack_require__(48)
module.exports = Transform
const { ERR_METHOD_NOT_IMPLEMENTED } = (__webpack_require__(53).codes)
const Duplex = __webpack_require__(60)
const { getHighWaterMark } = __webpack_require__(65)
ObjectSetPrototypeOf(Transform.prototype, Duplex.prototype)
ObjectSetPrototypeOf(Transform, Duplex)
const kCallback = Symbol('kCallback')
function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options)

  // TODO (ronag): This should preferably always be
  // applied but would be semver-major. Or even better;
  // make Transform a Readable with the Writable interface.
  const readableHighWaterMark = options ? getHighWaterMark(this, options, 'readableHighWaterMark', true) : null
  if (readableHighWaterMark === 0) {
    // A Duplex will buffer both on the writable and readable side while
    // a Transform just wants to buffer hwm number of elements. To avoid
    // buffering twice we disable buffering on the writable side.
    options = {
      ...options,
      highWaterMark: null,
      readableHighWaterMark,
      // TODO (ronag): 0 is not optimal since we have
      // a "bug" where we check needDrain before calling _write and not after.
      // Refs: https://github.com/nodejs/node/pull/32887
      // Refs: https://github.com/nodejs/node/pull/35941
      writableHighWaterMark: options.writableHighWaterMark || 0
    }
  }
  Duplex.call(this, options)

  // We have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false
  this[kCallback] = null
  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform
    if (typeof options.flush === 'function') this._flush = options.flush
  }

  // When the writable side finishes, then flush out anything remaining.
  // Backwards compat. Some Transform streams incorrectly implement _final
  // instead of or in addition to _flush. By using 'prefinish' instead of
  // implementing _final we continue supporting this unfortunate use case.
  this.on('prefinish', prefinish)
}
function final(cb) {
  if (typeof this._flush === 'function' && !this.destroyed) {
    this._flush((er, data) => {
      if (er) {
        if (cb) {
          cb(er)
        } else {
          this.destroy(er)
        }
        return
      }
      if (data != null) {
        this.push(data)
      }
      this.push(null)
      if (cb) {
        cb()
      }
    })
  } else {
    this.push(null)
    if (cb) {
      cb()
    }
  }
}
function prefinish() {
  if (this._final !== final) {
    final.call(this)
  }
}
Transform.prototype._final = final
Transform.prototype._transform = function (chunk, encoding, callback) {
  throw new ERR_METHOD_NOT_IMPLEMENTED('_transform()')
}
Transform.prototype._write = function (chunk, encoding, callback) {
  const rState = this._readableState
  const wState = this._writableState
  const length = rState.length
  this._transform(chunk, encoding, (err, val) => {
    if (err) {
      callback(err)
      return
    }
    if (val != null) {
      this.push(val)
    }
    if (
      wState.ended ||
      // Backwards compat.
      length === rState.length ||
      // Backwards compat.
      rState.length < rState.highWaterMark
    ) {
      callback()
    } else {
      this[kCallback] = callback
    }
  })
}
Transform.prototype._read = function () {
  if (this[kCallback]) {
    const callback = this[kCallback]
    this[kCallback] = null
    callback()
  }
}


/***/ }),
/* 73 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { ArrayPrototypePop, Promise } = __webpack_require__(48)
const { isIterable, isNodeStream, isWebStream } = __webpack_require__(56)
const { pipelineImpl: pl } = __webpack_require__(58)
const { finished } = __webpack_require__(55)
__webpack_require__(47)
function pipeline(...streams) {
  return new Promise((resolve, reject) => {
    let signal
    let end
    const lastArg = streams[streams.length - 1]
    if (
      lastArg &&
      typeof lastArg === 'object' &&
      !isNodeStream(lastArg) &&
      !isIterable(lastArg) &&
      !isWebStream(lastArg)
    ) {
      const options = ArrayPrototypePop(streams)
      signal = options.signal
      end = options.end
    }
    pl(
      streams,
      (err, value) => {
        if (err) {
          reject(err)
        } else {
          resolve(value)
        }
      },
      {
        signal,
        end
      }
    )
  })
}
module.exports = {
  finished,
  pipeline
}


/***/ }),
/* 74 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Defer = void 0;
/**
 * An externally resolvable/rejectable "promise". Use it to resolve/reject
 * promise at any time.
 *
 * ```ts
 * const future = new Defer();
 *
 * future.promise.then(value => console.log(value));
 *
 * future.resolve(123);
 * ```
 */
class Defer {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
exports.Defer = Defer;
//# sourceMappingURL=Defer.js.map

/***/ }),
/* 75 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.concurrency = void 0;
const go_1 = __webpack_require__(76);
class Task {
    constructor(code) {
        this.code = code;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
/** Limits concurrency of async code. */
const concurrency = (limit) => {
    let workers = 0;
    const queue = new Set();
    const work = async () => {
        const task = queue.values().next().value;
        if (task)
            queue.delete(task);
        else
            return;
        workers++;
        try {
            task.resolve(await task.code());
        }
        catch (error) {
            task.reject(error);
        }
        finally {
            workers--, queue.size && (0, go_1.go)(work);
        }
    };
    return async (code) => {
        const task = new Task(code);
        queue.add(task);
        return workers < limit && (0, go_1.go)(work), task.promise;
    };
};
exports.concurrency = concurrency;
//# sourceMappingURL=concurrency.js.map

/***/ }),
/* 76 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.go = void 0;
/** Executes code concurrently. */
const go = (code) => {
    code().catch(() => { });
};
exports.go = go;
//# sourceMappingURL=go.js.map

/***/ }),
/* 77 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeReadStream = void 0;
const stream_1 = __webpack_require__(46);
const Defer_1 = __webpack_require__(74);
const concurrency_1 = __webpack_require__(75);
class FsaNodeReadStream extends stream_1.Readable {
    constructor(fs, handle, path, options) {
        super();
        this.fs = fs;
        this.handle = handle;
        this.path = path;
        this.options = options;
        this.__pending__ = true;
        this.__closed__ = false;
        this.__bytes__ = 0;
        this.__mutex__ = (0, concurrency_1.concurrency)(1);
        this.__file__ = new Defer_1.Defer();
        handle
            .then(file => {
            if (this.__closed__)
                return;
            this.__file__.resolve(file);
            if (this.options.fd !== undefined)
                this.emit('open', file.fd);
            this.emit('ready');
        })
            .catch(error => {
            this.__file__.reject(error);
        })
            .finally(() => {
            this.__pending__ = false;
        });
    }
    async __read__() {
        return await this.__mutex__(async () => {
            if (this.__closed__)
                return;
            const { file } = await this.__file__.promise;
            const blob = await file.getFile();
            const buffer = await blob.arrayBuffer();
            const start = this.options.start || 0;
            let end = typeof this.options.end === 'number' ? this.options.end + 1 : buffer.byteLength;
            if (end > buffer.byteLength)
                end = buffer.byteLength;
            const uint8 = new Uint8Array(buffer, start, end - start);
            return uint8;
        });
    }
    __close__() {
        if (this.__closed__)
            return;
        this.__closed__ = true;
        if (this.options.autoClose) {
            this.__file__.promise
                .then(file => {
                this.fs.close(file.fd, () => {
                    this.emit('close');
                });
                return file.close();
            })
                .catch(error => { });
        }
    }
    // -------------------------------------------------------------- IReadStream
    get bytesRead() {
        return this.__bytes__;
    }
    get pending() {
        return this.__pending__;
    }
    // ----------------------------------------------------------------- Readable
    _read() {
        this.__read__().then((uint8) => {
            if (this.__closed__)
                return;
            if (!uint8)
                return this.push(null);
            this.__bytes__ += uint8.length;
            this.__close__();
            this.push(uint8);
            this.push(null);
        }, error => {
            this.__close__();
            this.destroy(error);
        });
    }
}
exports.FsaNodeReadStream = FsaNodeReadStream;
//# sourceMappingURL=FsaNodeReadStream.js.map

/***/ }),
/* 78 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeCore = void 0;
const util_1 = __webpack_require__(38);
const util_2 = __webpack_require__(42);
const constants_1 = __webpack_require__(5);
const FsaNodeFsOpenFile_1 = __webpack_require__(79);
const util = __webpack_require__(38);
class FsaNodeCore {
    constructor(root, syncAdapter) {
        this.root = root;
        this.syncAdapter = syncAdapter;
        this.fds = new Map();
        /**
         * A list of reusable (opened and closed) file descriptors, that should be
         * used first before creating a new file descriptor.
         */
        this.releasedFds = [];
        if (root instanceof Promise) {
            root
                .then(root => {
                this.root = root;
            })
                .catch(error => { });
        }
    }
    getSyncAdapter() {
        const adapter = this.syncAdapter;
        if (!adapter)
            throw new Error('No sync adapter');
        return adapter;
    }
    newFdNumber() {
        const releasedFd = this.releasedFds.pop();
        return typeof releasedFd === 'number' ? releasedFd : FsaNodeCore.fd--;
    }
    /**
     * @param path Path from root to the new folder.
     * @param create Whether to create the folders if they don't exist.
     */
    async getDir(path, create, funcName) {
        let curr = await this.root;
        const options = { create };
        try {
            for (const name of path) {
                curr = await curr.getDirectoryHandle(name, options);
            }
        }
        catch (error) {
            if (error && typeof error === 'object') {
                switch (error.name) {
                    case 'TypeMismatchError':
                        throw (0, util_1.createError)('ENOTDIR', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                    case 'NotFoundError':
                        throw (0, util_1.createError)('ENOENT', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                }
            }
            throw error;
        }
        return curr;
    }
    async getFile(path, name, funcName, create) {
        const dir = await this.getDir(path, false, funcName);
        const file = await dir.getFileHandle(name, { create });
        return file;
    }
    async getFileOrDir(path, name, funcName) {
        const dir = await this.getDir(path, false, funcName);
        if (!name)
            return dir;
        try {
            const file = await dir.getFileHandle(name);
            return file;
        }
        catch (error) {
            if (error && typeof error === 'object') {
                switch (error.name) {
                    case 'TypeMismatchError':
                        try {
                            return await dir.getDirectoryHandle(name);
                        }
                        catch (error2) {
                            if (error2 && typeof error2 === 'object') {
                                switch (error2.name) {
                                    case 'TypeMismatchError':
                                        throw (0, util_1.createError)('ENOTDIR', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                                    case 'NotFoundError':
                                        throw (0, util_1.createError)('ENOENT', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                                }
                            }
                        }
                    case 'NotFoundError':
                        throw (0, util_1.createError)('ENOENT', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                }
            }
            throw error;
        }
    }
    getFileByFd(fd, funcName) {
        if (!(0, util_1.isFd)(fd))
            throw TypeError(constants_1.ERRSTR.FD);
        const file = this.fds.get(fd);
        if (!file)
            throw (0, util_1.createError)('EBADF', funcName);
        return file;
    }
    async getFileByFdAsync(fd, funcName) {
        return this.getFileByFd(fd, funcName);
    }
    async __getFileById(id, funcName) {
        if (typeof id === 'number')
            return (await this.getFileByFd(id, funcName)).file;
        const filename = (0, util_1.pathToFilename)(id);
        const [folder, name] = (0, util_2.pathToLocation)(filename);
        return await this.getFile(folder, name, funcName);
    }
    async getFileByIdOrCreate(id, funcName) {
        if (typeof id === 'number')
            return (await this.getFileByFd(id, funcName)).file;
        const filename = (0, util_1.pathToFilename)(id);
        const [folder, name] = (0, util_2.pathToLocation)(filename);
        const dir = await this.getDir(folder, false, funcName);
        return await dir.getFileHandle(name, { create: true });
    }
    async __open(filename, flags, mode) {
        const [folder, name] = (0, util_2.pathToLocation)(filename);
        const throwIfExists = !!(flags & 128 /* FLAG.O_EXCL */);
        if (throwIfExists) {
            try {
                await this.getFile(folder, name, 'open', false);
                throw util.createError('EEXIST', 'writeFile');
            }
            catch (error) {
                const file404 = error && typeof error === 'object' && (error.code === 'ENOENT' || error.name === 'NotFoundError');
                if (!file404) {
                    if (error && typeof error === 'object') {
                        switch (error.name) {
                            case 'TypeMismatchError':
                                throw (0, util_1.createError)('ENOTDIR', 'open', filename);
                            case 'NotFoundError':
                                throw (0, util_1.createError)('ENOENT', 'open', filename);
                        }
                    }
                    throw error;
                }
            }
        }
        try {
            const createIfMissing = !!(flags & 64 /* FLAG.O_CREAT */);
            const fsaFile = await this.getFile(folder, name, 'open', createIfMissing);
            return this.__open2(fsaFile, filename, flags, mode);
        }
        catch (error) {
            if (error && typeof error === 'object') {
                switch (error.name) {
                    case 'TypeMismatchError':
                        throw (0, util_1.createError)('ENOTDIR', 'open', filename);
                    case 'NotFoundError':
                        throw (0, util_1.createError)('ENOENT', 'open', filename);
                }
            }
            throw error;
        }
    }
    __open2(fsaFile, filename, flags, mode) {
        const fd = this.newFdNumber();
        const file = new FsaNodeFsOpenFile_1.FsaNodeFsOpenFile(fd, mode, flags, fsaFile, filename);
        this.fds.set(fd, file);
        return file;
    }
    async __close(fd) {
        const openFile = await this.getFileByFdAsync(fd, 'close');
        await openFile.close();
        const deleted = this.fds.delete(fd);
        if (deleted)
            this.releasedFds.push(fd);
    }
    getFileName(id) {
        if (typeof id === 'number') {
            const openFile = this.fds.get(id);
            if (!openFile)
                throw (0, util_1.createError)('EBADF', 'readFile');
            return openFile.filename;
        }
        return (0, util_1.pathToFilename)(id);
    }
}
exports.FsaNodeCore = FsaNodeCore;
FsaNodeCore.fd = 0x7fffffff;
//# sourceMappingURL=FsaNodeCore.js.map

/***/ }),
/* 79 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeFsOpenFile = void 0;
/**
 * Represents an open file. Stores additional metadata about the open file, such
 * as the seek position.
 */
class FsaNodeFsOpenFile {
    constructor(fd, createMode, flags, file, filename) {
        this.fd = fd;
        this.createMode = createMode;
        this.flags = flags;
        this.file = file;
        this.filename = filename;
        this.seek = 0;
        this.keepExistingData = !!(flags & 1024 /* FLAG.O_APPEND */);
    }
    async close() { }
    async write(data, seek) {
        if (typeof seek !== 'number')
            seek = this.seek;
        const writer = await this.file.createWritable({ keepExistingData: this.keepExistingData });
        await writer.write({
            type: 'write',
            data,
            position: seek,
        });
        await writer.close();
        this.keepExistingData = true;
        this.seek += data.byteLength;
    }
}
exports.FsaNodeFsOpenFile = FsaNodeFsOpenFile;
//# sourceMappingURL=FsaNodeFsOpenFile.js.map

/***/ }),
/* 80 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileHandle = void 0;
const util_1 = __webpack_require__(38);
class FileHandle {
    constructor(fs, fd) {
        this.fs = fs;
        this.fd = fd;
    }
    appendFile(data, options) {
        return (0, util_1.promisify)(this.fs, 'appendFile')(this.fd, data, options);
    }
    chmod(mode) {
        return (0, util_1.promisify)(this.fs, 'fchmod')(this.fd, mode);
    }
    chown(uid, gid) {
        return (0, util_1.promisify)(this.fs, 'fchown')(this.fd, uid, gid);
    }
    close() {
        return (0, util_1.promisify)(this.fs, 'close')(this.fd);
    }
    datasync() {
        return (0, util_1.promisify)(this.fs, 'fdatasync')(this.fd);
    }
    read(buffer, offset, length, position) {
        return (0, util_1.promisify)(this.fs, 'read', bytesRead => ({ bytesRead, buffer }))(this.fd, buffer, offset, length, position);
    }
    readv(buffers, position) {
        return (0, util_1.promisify)(this.fs, 'readv', bytesRead => ({ bytesRead, buffers }))(this.fd, buffers, position);
    }
    readFile(options) {
        return (0, util_1.promisify)(this.fs, 'readFile')(this.fd, options);
    }
    stat(options) {
        return (0, util_1.promisify)(this.fs, 'fstat')(this.fd, options);
    }
    sync() {
        return (0, util_1.promisify)(this.fs, 'fsync')(this.fd);
    }
    truncate(len) {
        return (0, util_1.promisify)(this.fs, 'ftruncate')(this.fd, len);
    }
    utimes(atime, mtime) {
        return (0, util_1.promisify)(this.fs, 'futimes')(this.fd, atime, mtime);
    }
    write(buffer, offset, length, position) {
        return (0, util_1.promisify)(this.fs, 'write', bytesWritten => ({ bytesWritten, buffer }))(this.fd, buffer, offset, length, position);
    }
    writev(buffers, position) {
        return (0, util_1.promisify)(this.fs, 'writev', bytesWritten => ({ bytesWritten, buffers }))(this.fd, buffers, position);
    }
    writeFile(data, options) {
        return (0, util_1.promisify)(this.fs, 'writeFile')(this.fd, data, options);
    }
}
exports.FileHandle = FileHandle;
//# sourceMappingURL=FileHandle.js.map

/***/ }),
/* 81 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeSyncAdapterWorker = void 0;
const Defer_1 = __webpack_require__(74);
const SyncMessenger_1 = __webpack_require__(82);
const json_1 = __webpack_require__(83);
let rootId = 0;
class FsaNodeSyncAdapterWorker {
    static async start(url, dir) {
        const worker = new Worker(url);
        const future = new Defer_1.Defer();
        let id = rootId++;
        let messenger = undefined;
        const _dir = await dir;
        worker.onmessage = e => {
            const data = e.data;
            if (!Array.isArray(data))
                return;
            const msg = data;
            const code = msg[0];
            switch (code) {
                case 0 /* FsaNodeWorkerMessageCode.Init */: {
                    const [, sab] = msg;
                    messenger = new SyncMessenger_1.SyncMessenger(sab);
                    const setRootMessage = [1 /* FsaNodeWorkerMessageCode.SetRoot */, id, _dir];
                    worker.postMessage(setRootMessage);
                    break;
                }
                case 2 /* FsaNodeWorkerMessageCode.RootSet */: {
                    const [, rootId] = msg;
                    if (id !== rootId)
                        return;
                    const adapter = new FsaNodeSyncAdapterWorker(messenger, _dir);
                    future.resolve(adapter);
                    break;
                }
            }
        };
        return await future.promise;
    }
    constructor(messenger, root) {
        this.messenger = messenger;
        this.root = root;
    }
    call(method, payload) {
        const request = [3 /* FsaNodeWorkerMessageCode.Request */, method, payload];
        const encoded = json_1.encoder.encode(request);
        const encodedResponse = this.messenger.callSync(encoded);
        const [code, data] = json_1.decoder.decode(encodedResponse);
        switch (code) {
            case 4 /* FsaNodeWorkerMessageCode.Response */:
                return data;
            case 5 /* FsaNodeWorkerMessageCode.ResponseError */:
                throw data;
            default: {
                throw new Error('Invalid response message code');
            }
        }
    }
}
exports.FsaNodeSyncAdapterWorker = FsaNodeSyncAdapterWorker;
//# sourceMappingURL=FsaNodeSyncAdapterWorker.js.map

/***/ }),
/* 82 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SyncMessenger = void 0;
/**
 * @param condition Condition to wait for, when true, the function returns.
 * @param ms Maximum time to wait in milliseconds.
 */
const sleepUntil = (condition, ms = 100) => {
    const start = Date.now();
    while (!condition()) {
        const now = Date.now();
        if (now - start > ms)
            throw new Error('Timeout');
    }
};
/**
 * `SyncMessenger` allows to execute asynchronous code synchronously. The
 * asynchronous code is executed in a Worker thread, while the main thread is
 * blocked until the asynchronous code is finished.
 *
 * First four 4-byte words is the header, where the first word is used for Atomics
 * notifications. The second word is used for spin-locking the main thread until
 * the asynchronous code is finished. The third word is used to specify payload
 * length. The fourth word is currently unused.
 *
 * The maximum payload size is the size of the SharedArrayBuffer minus the
 * header size.
 */
class SyncMessenger {
    constructor(sab) {
        this.sab = sab;
        this.int32 = new Int32Array(sab);
        this.uint8 = new Uint8Array(sab);
        this.headerSize = 4 * 4;
        this.dataSize = sab.byteLength - this.headerSize;
    }
    callSync(data) {
        const requestLength = data.length;
        const headerSize = this.headerSize;
        const int32 = this.int32;
        int32[1] = 0;
        int32[2] = requestLength;
        this.uint8.set(data, headerSize);
        Atomics.notify(int32, 0);
        sleepUntil(() => int32[1] === 1);
        const responseLength = int32[2];
        const response = this.uint8.slice(headerSize, headerSize + responseLength);
        return response;
    }
    serveAsync(callback) {
        const headerSize = this.headerSize;
        (async () => {
            try {
                const int32 = this.int32;
                const res = Atomics.wait(int32, 0, 0);
                if (res !== 'ok')
                    throw new Error(`Unexpected Atomics.wait result: ${res}`);
                const requestLength = this.int32[2];
                const request = this.uint8.slice(headerSize, headerSize + requestLength);
                const response = await callback(request);
                const responseLength = response.length;
                int32[2] = responseLength;
                this.uint8.set(response, headerSize);
                int32[1] = 1;
            }
            catch (_a) { }
            this.serveAsync(callback);
        })().catch(() => { });
    }
}
exports.SyncMessenger = SyncMessenger;
//# sourceMappingURL=SyncMessenger.js.map

/***/ }),
/* 83 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.decoder = exports.encoder = void 0;
const CborEncoder_1 = __webpack_require__(84);
const CborDecoder_1 = __webpack_require__(90);
exports.encoder = new CborEncoder_1.CborEncoder();
exports.decoder = new CborDecoder_1.CborDecoder();
//# sourceMappingURL=json.js.map

/***/ }),
/* 84 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CborEncoder = void 0;
const isFloat32_1 = __webpack_require__(85);
const JsonPackExtension_1 = __webpack_require__(86);
const CborEncoderFast_1 = __webpack_require__(87);
class CborEncoder extends CborEncoderFast_1.CborEncoderFast {
    /**
     * Called when the encoder encounters a value that it does not know how to encode.
     *
     * @param value Some JavaScript value.
     */
    writeUnknown(value) {
        this.writeNull();
    }
    writeAny(value) {
        switch (typeof value) {
            case 'number':
                return this.writeNumber(value);
            case 'string':
                return this.writeStr(value);
            case 'boolean':
                return this.writer.u8(0xf4 + +value);
            case 'object': {
                if (!value)
                    return this.writer.u8(0xf6);
                const constructor = value.constructor;
                switch (constructor) {
                    case Object:
                        return this.writeObj(value);
                    case Array:
                        return this.writeArr(value);
                    case Uint8Array:
                        return this.writeBin(value);
                    case Map:
                        return this.writeMap(value);
                    case JsonPackExtension_1.JsonPackExtension:
                        return this.writeTag(value.tag, value.val);
                    default:
                        return this.writeUnknown(value);
                }
            }
            case 'undefined':
                return this.writeUndef();
            case 'bigint':
                return this.writeBigInt(value);
            default:
                return this.writeUnknown(value);
        }
    }
    writeFloat(float) {
        if ((0, isFloat32_1.isFloat32)(float))
            this.writer.u8f32(0xfa, float);
        else
            this.writer.u8f64(0xfb, float);
    }
    writeMap(map) {
        this.writeMapHdr(map.size);
        map.forEach((value, key) => {
            this.writeAny(key);
            this.writeAny(value);
        });
    }
    writeUndef() {
        this.writer.u8(0xf7);
    }
}
exports.CborEncoder = CborEncoder;
//# sourceMappingURL=CborEncoder.js.map

/***/ }),
/* 85 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isFloat32 = void 0;
const view = new DataView(new ArrayBuffer(4));
const isFloat32 = (n) => {
    view.setFloat32(0, n);
    return n === view.getFloat32(0);
};
exports.isFloat32 = isFloat32;
//# sourceMappingURL=isFloat32.js.map

/***/ }),
/* 86 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JsonPackExtension = void 0;
/**
 * A wrapping for MessagePack extension or CBOR tag value. When encoder
 * encounters {@link JsonPackExtension} it will encode it as a MessagePack
 * extension or CBOR tag. Likewise, the decoder will
 * decode extensions into {@link JsonPackExtension}.
 *
 * @category Value
 */
class JsonPackExtension {
    constructor(tag, val) {
        this.tag = tag;
        this.val = val;
    }
}
exports.JsonPackExtension = JsonPackExtension;
//# sourceMappingURL=JsonPackExtension.js.map

/***/ }),
/* 87 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CborEncoderFast = void 0;
const Writer_1 = __webpack_require__(88);
const isSafeInteger = Number.isSafeInteger;
/**
 * Fast CBOR encoder supports only JSON values. Use regular `CborEncoder` if
 * you need ability to encode all CBOR value types.
 */
class CborEncoderFast {
    constructor(writer = new Writer_1.Writer()) {
        this.writer = writer;
    }
    encode(value) {
        this.writeAny(value);
        return this.writer.flush();
    }
    encodeToSlice(value) {
        this.writeAny(value);
        return this.writer.flushSlice();
    }
    writeAny(value) {
        switch (typeof value) {
            case 'number':
                return this.writeNumber(value);
            case 'string':
                return this.writeStr(value);
            case 'boolean':
                return this.writer.u8(0xf4 + +value);
            case 'object': {
                if (!value)
                    return this.writer.u8(0xf6);
                const constructor = value.constructor;
                switch (constructor) {
                    case Array:
                        return this.writeArr(value);
                    default:
                        return this.writeObj(value);
                }
            }
        }
    }
    writeCbor() {
        this.writer.u8u16(0xd9, 0xd9f7);
    }
    writeEnd() {
        this.writer.u8(255 /* CONST.END */);
    }
    writeNull() {
        this.writer.u8(0xf6);
    }
    writeBoolean(bool) {
        if (bool)
            this.writer.u8(0xf5);
        else
            this.writer.u8(0xf4);
    }
    writeNumber(num) {
        if (isSafeInteger(num))
            this.writeInteger(num);
        else if (typeof num === 'bigint')
            this.writeBigInt(num);
        else
            this.writeFloat(num);
    }
    writeBigInt(int) {
        if (int >= 0)
            this.writeBigUint(int);
        else
            this.writeBigSint(int);
    }
    writeBigUint(uint) {
        if (uint <= Number.MAX_SAFE_INTEGER)
            return this.writeUInteger(Number(uint));
        this.writer.u8u64(0x1b, uint);
    }
    writeBigSint(int) {
        if (int >= Number.MIN_SAFE_INTEGER)
            return this.encodeNint(Number(int));
        const uint = -BigInt(1) - int;
        this.writer.u8u64(0x3b, uint);
    }
    writeInteger(int) {
        if (int >= 0)
            this.writeUInteger(int);
        else
            this.encodeNint(int);
    }
    writeUInteger(uint) {
        const writer = this.writer;
        writer.ensureCapacity(9);
        const uint8 = writer.uint8;
        let x = writer.x;
        if (uint <= 23) {
            uint8[x++] = 0 /* MAJOR_OVERLAY.UIN */ + uint;
        }
        else if (uint <= 0xff) {
            uint8[x++] = 0x18;
            uint8[x++] = uint;
        }
        else if (uint <= 0xffff) {
            uint8[x++] = 0x19;
            writer.view.setUint16(x, uint);
            x += 2;
        }
        else if (uint <= 0xffffffff) {
            uint8[x++] = 0x1a;
            writer.view.setUint32(x, uint);
            x += 4;
        }
        else {
            uint8[x++] = 0x1b;
            writer.view.setBigUint64(x, BigInt(uint));
            x += 8;
        }
        writer.x = x;
    }
    /** @deprecated Remove and use `writeNumber` instead. */
    encodeNumber(num) {
        this.writeNumber(num);
    }
    /** @deprecated Remove and use `writeInteger` instead. */
    encodeInteger(int) {
        this.writeInteger(int);
    }
    /** @deprecated */
    encodeUint(uint) {
        this.writeUInteger(uint);
    }
    encodeNint(int) {
        const uint = -1 - int;
        const writer = this.writer;
        writer.ensureCapacity(9);
        const uint8 = writer.uint8;
        let x = writer.x;
        if (uint < 24) {
            uint8[x++] = 32 /* MAJOR_OVERLAY.NIN */ + uint;
        }
        else if (uint <= 0xff) {
            uint8[x++] = 0x38;
            uint8[x++] = uint;
        }
        else if (uint <= 0xffff) {
            uint8[x++] = 0x39;
            writer.view.setUint16(x, uint);
            x += 2;
        }
        else if (uint <= 0xffffffff) {
            uint8[x++] = 0x3a;
            writer.view.setUint32(x, uint);
            x += 4;
        }
        else {
            uint8[x++] = 0x3b;
            writer.view.setBigUint64(x, BigInt(uint));
            x += 8;
        }
        writer.x = x;
    }
    writeFloat(float) {
        this.writer.u8f64(0xfb, float);
    }
    writeBin(buf) {
        const length = buf.length;
        this.writeBinHdr(length);
        this.writer.buf(buf, length);
    }
    writeBinHdr(length) {
        const writer = this.writer;
        if (length <= 23)
            writer.u8(64 /* MAJOR_OVERLAY.BIN */ + length);
        else if (length <= 0xff)
            writer.u16((0x58 << 8) + length);
        else if (length <= 0xffff)
            writer.u8u16(0x59, length);
        else if (length <= 0xffffffff)
            writer.u8u32(0x5a, length);
        else
            writer.u8u64(0x5b, length);
    }
    writeStr(str) {
        const writer = this.writer;
        const length = str.length;
        const maxSize = length * 4;
        writer.ensureCapacity(5 + maxSize);
        const uint8 = writer.uint8;
        let lengthOffset = writer.x;
        if (maxSize <= 23)
            writer.x++;
        else if (maxSize <= 0xff) {
            uint8[writer.x++] = 0x78;
            lengthOffset = writer.x;
            writer.x++;
        }
        else if (maxSize <= 0xffff) {
            uint8[writer.x++] = 0x79;
            lengthOffset = writer.x;
            writer.x += 2;
        }
        else {
            uint8[writer.x++] = 0x7a;
            lengthOffset = writer.x;
            writer.x += 4;
        }
        const bytesWritten = writer.utf8(str);
        if (maxSize <= 23)
            uint8[lengthOffset] = 96 /* MAJOR_OVERLAY.STR */ + bytesWritten;
        else if (maxSize <= 0xff)
            uint8[lengthOffset] = bytesWritten;
        else if (maxSize <= 0xffff)
            writer.view.setUint16(lengthOffset, bytesWritten);
        else
            writer.view.setUint32(lengthOffset, bytesWritten);
    }
    writeStrHdr(length) {
        const writer = this.writer;
        if (length <= 23)
            writer.u8(96 /* MAJOR_OVERLAY.STR */ + length);
        else if (length <= 0xff)
            writer.u16((0x78 << 8) + length);
        else if (length <= 0xffff)
            writer.u8u16(0x79, length);
        else
            writer.u8u32(0x7a, length);
    }
    writeAsciiStr(str) {
        this.writeStrHdr(str.length);
        this.writer.ascii(str);
    }
    writeArr(arr) {
        const length = arr.length;
        this.writeArrHdr(length);
        for (let i = 0; i < length; i++)
            this.writeAny(arr[i]);
    }
    writeArrHdr(length) {
        const writer = this.writer;
        if (length <= 23)
            writer.u8(128 /* MAJOR_OVERLAY.ARR */ + length);
        else if (length <= 0xff)
            writer.u16((0x98 << 8) + length);
        else if (length <= 0xffff)
            writer.u8u16(0x99, length);
        else if (length <= 0xffffffff)
            writer.u8u32(0x9a, length);
        else
            writer.u8u64(0x9b, length);
    }
    writeObj(obj) {
        const keys = Object.keys(obj);
        const length = keys.length;
        this.writeObjHdr(length);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key);
            this.writeAny(obj[key]);
        }
    }
    writeObjHdr(length) {
        const writer = this.writer;
        if (length <= 23)
            writer.u8(160 /* MAJOR_OVERLAY.MAP */ + length);
        else if (length <= 0xff)
            writer.u16((0xb8 << 8) + length);
        else if (length <= 0xffff)
            writer.u8u16(0xb9, length);
        else if (length <= 0xffffffff)
            writer.u8u32(0xba, length);
        else
            writer.u8u64(0xbb, length);
    }
    writeMapHdr(length) {
        this.writeObjHdr(length);
    }
    writeStartMap() {
        this.writer.u8(0xbf);
    }
    writeTag(tag, value) {
        this.writeTagHdr(tag);
        this.writeAny(value);
    }
    writeTagHdr(tag) {
        const writer = this.writer;
        if (tag <= 23)
            writer.u8(192 /* MAJOR_OVERLAY.TAG */ + tag);
        else if (tag <= 0xff)
            writer.u16((0xd8 << 8) + tag);
        else if (tag <= 0xffff)
            writer.u8u16(0xd9, tag);
        else if (tag <= 0xffffffff)
            writer.u8u32(0xda, tag);
        else
            writer.u8u64(0xdb, tag);
    }
    writeTkn(value) {
        const writer = this.writer;
        if (value <= 23)
            writer.u8(224 /* MAJOR_OVERLAY.TKN */ + value);
        else if (value <= 0xff)
            writer.u16((0xf8 << 8) + value);
    }
    // ------------------------------------------------------- Streaming encoding
    writeStartStr() {
        this.writer.u8(0x7f);
    }
    writeStrChunk(str) {
        throw new Error('Not implemented');
    }
    writeEndStr() {
        throw new Error('Not implemented');
    }
    writeStartBin() {
        this.writer.u8(0x5f);
    }
    writeBinChunk(buf) {
        throw new Error('Not implemented');
    }
    writeEndBin() {
        throw new Error('Not implemented');
    }
    writeStartArr() {
        this.writer.u8(0x9f);
    }
    writeArrChunk(item) {
        throw new Error('Not implemented');
    }
    writeEndArr() {
        this.writer.u8(255 /* CONST.END */);
    }
    writeStartObj() {
        this.writer.u8(0xbf);
    }
    writeObjChunk(key, value) {
        throw new Error('Not implemented');
    }
    writeEndObj() {
        this.writer.u8(255 /* CONST.END */);
    }
}
exports.CborEncoderFast = CborEncoderFast;
//# sourceMappingURL=CborEncoderFast.js.map

/***/ }),
/* 88 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
/* provided dependency */ var Buffer = __webpack_require__(9)["Buffer"];

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Writer = void 0;
const Slice_1 = __webpack_require__(89);
const EMPTY_UINT8 = new Uint8Array([]);
const EMPTY_VIEW = new DataView(EMPTY_UINT8.buffer);
const hasBuffer = typeof Buffer === 'function';
const utf8Write = hasBuffer
    ? Buffer.prototype.utf8Write
    : null;
const from = hasBuffer ? Buffer.from : null;
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
/**
 * Encoder class provides an efficient way to encode binary data. It grows the
 * internal memory buffer automatically as more space is required. It is useful
 * in cases when it is not known in advance the size of memory needed.
 */
class Writer {
    /**
     * @param allocSize Number of bytes to allocate at a time when buffer ends.
     */
    constructor(allocSize = 64 * 1024) {
        this.allocSize = allocSize;
        /** @ignore */
        this.view = EMPTY_VIEW;
        /** @ignore */
        this.x0 = 0;
        /** @ignore */
        this.x = 0;
        this.uint8 = new Uint8Array(allocSize);
        this.size = allocSize;
        this.view = new DataView(this.uint8.buffer);
    }
    /** @ignore */
    grow(size) {
        const x0 = this.x0;
        const x = this.x;
        const oldUint8 = this.uint8;
        const newUint8 = new Uint8Array(size);
        const view = new DataView(newUint8.buffer);
        const activeSlice = oldUint8.subarray(x0, x);
        newUint8.set(activeSlice, 0);
        this.x = x - x0;
        this.x0 = 0;
        this.uint8 = newUint8;
        this.size = size;
        this.view = view;
    }
    /**
     * Make sure the internal buffer has enough space to write the specified number
     * of bytes, otherwise resize the internal buffer to accommodate for more size.
     *
     * @param capacity Number of bytes.
     */
    ensureCapacity(capacity) {
        const byteLength = this.size;
        const remaining = byteLength - this.x;
        if (remaining < capacity) {
            const total = byteLength - this.x0;
            const required = capacity - remaining;
            const totalRequired = total + required;
            this.grow(totalRequired <= this.allocSize ? this.allocSize : totalRequired * 2);
        }
    }
    /** @todo Consider renaming to "skip"? */
    move(capacity) {
        this.ensureCapacity(capacity);
        this.x += capacity;
    }
    reset() {
        this.x0 = this.x;
    }
    /**
     * Allocates a new {@link ArrayBuffer}, useful when the underlying
     * {@link ArrayBuffer} cannot be shared between threads.
     *
     * @param size Size of memory to allocate.
     */
    newBuffer(size) {
        const uint8 = (this.uint8 = new Uint8Array(size));
        this.size = size;
        this.view = new DataView(uint8.buffer);
        this.x = this.x0 = 0;
    }
    /**
     * @returns Encoded memory buffer contents.
     */
    flush() {
        const result = this.uint8.subarray(this.x0, this.x);
        this.x0 = this.x;
        return result;
    }
    flushSlice() {
        const slice = new Slice_1.Slice(this.uint8, this.view, this.x0, this.x);
        this.x0 = this.x;
        return slice;
    }
    u8(char) {
        this.ensureCapacity(1);
        this.uint8[this.x++] = char;
    }
    u16(word) {
        this.ensureCapacity(2);
        this.view.setUint16(this.x, word);
        this.x += 2;
    }
    u32(dword) {
        this.ensureCapacity(4);
        this.view.setUint32(this.x, dword);
        this.x += 4;
    }
    i32(dword) {
        this.ensureCapacity(4);
        this.view.setInt32(this.x, dword);
        this.x += 4;
    }
    u64(qword) {
        this.ensureCapacity(8);
        this.view.setBigUint64(this.x, BigInt(qword));
        this.x += 8;
    }
    f64(float) {
        this.ensureCapacity(8);
        this.view.setFloat64(this.x, float);
        this.x += 8;
    }
    u8u16(u8, u16) {
        this.ensureCapacity(3);
        let x = this.x;
        this.uint8[x++] = u8;
        this.uint8[x++] = u16 >>> 8;
        this.uint8[x++] = u16 & 0xff;
        this.x = x;
    }
    u8u32(u8, u32) {
        this.ensureCapacity(5);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setUint32(x, u32);
        this.x = x + 4;
    }
    u8u64(u8, u64) {
        this.ensureCapacity(9);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setBigUint64(x, BigInt(u64));
        this.x = x + 8;
    }
    u8f32(u8, f32) {
        this.ensureCapacity(5);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setFloat32(x, f32);
        this.x = x + 4;
    }
    u8f64(u8, f64) {
        this.ensureCapacity(9);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setFloat64(x, f64);
        this.x = x + 8;
    }
    buf(buf, length) {
        this.ensureCapacity(length);
        const x = this.x;
        this.uint8.set(buf, x);
        this.x = x + length;
    }
    /**
     * Encodes string as UTF-8. You need to call .ensureCapacity(str.length * 4)
     * before calling
     *
     * @param str String to encode as UTF-8.
     * @returns The number of bytes written
     */
    utf8(str) {
        const maxLength = str.length * 4;
        if (maxLength < 168)
            return this.utf8Native(str);
        if (utf8Write) {
            const writeLength = utf8Write.call(this.uint8, str, this.x, maxLength);
            this.x += writeLength;
            return writeLength;
        }
        else if (from) {
            const uint8 = this.uint8;
            const offset = uint8.byteOffset + this.x;
            const buf = from(uint8.buffer).subarray(offset, offset + maxLength);
            const writeLength = buf.write(str, 0, maxLength, 'utf8');
            this.x += writeLength;
            return writeLength;
        }
        else if (maxLength > 1024 && textEncoder) {
            const writeLength = textEncoder.encodeInto(str, this.uint8.subarray(this.x, this.x + maxLength)).written;
            this.x += writeLength;
            return writeLength;
        }
        return this.utf8Native(str);
    }
    utf8Native(str) {
        const length = str.length;
        const uint8 = this.uint8;
        let offset = this.x;
        let pos = 0;
        while (pos < length) {
            let value = str.charCodeAt(pos++);
            if ((value & 0xffffff80) === 0) {
                uint8[offset++] = value;
                continue;
            }
            else if ((value & 0xfffff800) === 0) {
                uint8[offset++] = ((value >> 6) & 0x1f) | 0xc0;
            }
            else {
                if (value >= 0xd800 && value <= 0xdbff) {
                    if (pos < length) {
                        const extra = str.charCodeAt(pos);
                        if ((extra & 0xfc00) === 0xdc00) {
                            pos++;
                            value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                        }
                    }
                }
                if ((value & 0xffff0000) === 0) {
                    uint8[offset++] = ((value >> 12) & 0x0f) | 0xe0;
                    uint8[offset++] = ((value >> 6) & 0x3f) | 0x80;
                }
                else {
                    uint8[offset++] = ((value >> 18) & 0x07) | 0xf0;
                    uint8[offset++] = ((value >> 12) & 0x3f) | 0x80;
                    uint8[offset++] = ((value >> 6) & 0x3f) | 0x80;
                }
            }
            uint8[offset++] = (value & 0x3f) | 0x80;
        }
        const writeLength = offset - this.x;
        this.x = offset;
        return writeLength;
    }
    ascii(str) {
        const length = str.length;
        this.ensureCapacity(length);
        const uint8 = this.uint8;
        let x = this.x;
        let pos = 0;
        while (pos < length)
            uint8[x++] = str.charCodeAt(pos++);
        this.x = x;
    }
}
exports.Writer = Writer;
//# sourceMappingURL=Writer.js.map

/***/ }),
/* 89 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Slice = void 0;
class Slice {
    constructor(uint8, view, start, end) {
        this.uint8 = uint8;
        this.view = view;
        this.start = start;
        this.end = end;
    }
    subarray() {
        return this.uint8.subarray(this.start, this.end);
    }
}
exports.Slice = Slice;
//# sourceMappingURL=Slice.js.map

/***/ }),
/* 90 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CborDecoder = void 0;
const CborDecoderBase_1 = __webpack_require__(91);
const JsonPackValue_1 = __webpack_require__(93);
class CborDecoder extends CborDecoderBase_1.CborDecoderBase {
    // -------------------------------------------------------------- Map reading
    readAsMap() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        switch (major) {
            case 5 /* MAJOR.MAP */:
                return this.readMap(minor);
            default:
                throw 0 /* ERROR.UNEXPECTED_MAJOR */;
        }
    }
    readMap(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.readMapRaw(length);
        else
            return this.readMapIndef();
    }
    readMapRaw(length) {
        const map = new Map();
        for (let i = 0; i < length; i++) {
            const key = this.val();
            const value = this.val();
            map.set(key, value);
        }
        return map;
    }
    readMapIndef() {
        const map = new Map();
        while (this.reader.peak() !== 255 /* CONST.END */) {
            const key = this.val();
            if (this.reader.peak() === 255 /* CONST.END */)
                throw 7 /* ERROR.UNEXPECTED_OBJ_BREAK */;
            const value = this.val();
            map.set(key, value);
        }
        this.reader.x++;
        return map;
    }
    // ----------------------------------------------------------- Value skipping
    skipN(n) {
        for (let i = 0; i < n; i++)
            this.skipAny();
    }
    skipAny() {
        this.skipAnyRaw(this.reader.u8());
    }
    skipAnyRaw(octet) {
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        switch (major) {
            case 0 /* MAJOR.UIN */:
            case 1 /* MAJOR.NIN */:
                this.skipUNint(minor);
                break;
            case 2 /* MAJOR.BIN */:
                this.skipBin(minor);
                break;
            case 3 /* MAJOR.STR */:
                this.skipStr(minor);
                break;
            case 4 /* MAJOR.ARR */:
                this.skipArr(minor);
                break;
            case 5 /* MAJOR.MAP */:
                this.skipObj(minor);
                break;
            case 7 /* MAJOR.TKN */:
                this.skipTkn(minor);
                break;
            case 6 /* MAJOR.TAG */:
                this.skipTag(minor);
                break;
        }
    }
    skipMinorLen(minor) {
        if (minor <= 23)
            return minor;
        switch (minor) {
            case 24:
                return this.reader.u8();
            case 25:
                return this.reader.u16();
            case 26:
                return this.reader.u32();
            case 27:
                return Number(this.reader.u64());
            case 31:
                return -1;
            default:
                throw 1 /* ERROR.UNEXPECTED_MINOR */;
        }
    }
    // --------------------------------------------------------- Integer skipping
    skipUNint(minor) {
        if (minor <= 23)
            return;
        switch (minor) {
            case 24:
                return this.reader.skip(1);
            case 25:
                return this.reader.skip(2);
            case 26:
                return this.reader.skip(4);
            case 27:
                return this.reader.skip(8);
            default:
                throw 1 /* ERROR.UNEXPECTED_MINOR */;
        }
    }
    // ---------------------------------------------------------- Binary skipping
    skipBin(minor) {
        const length = this.skipMinorLen(minor);
        if (length >= 0)
            this.reader.skip(length);
        else {
            while (this.reader.peak() !== 255 /* CONST.END */)
                this.skipBinChunk();
            this.reader.x++;
        }
    }
    skipBinChunk() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major !== 2 /* MAJOR.BIN */)
            throw 2 /* ERROR.UNEXPECTED_BIN_CHUNK_MAJOR */;
        if (minor > 27)
            throw 3 /* ERROR.UNEXPECTED_BIN_CHUNK_MINOR */;
        this.skipBin(minor);
    }
    // ---------------------------------------------------------- String skipping
    skipStr(minor) {
        const length = this.skipMinorLen(minor);
        if (length >= 0)
            this.reader.skip(length);
        else {
            while (this.reader.peak() !== 255 /* CONST.END */)
                this.skipStrChunk();
            this.reader.x++;
        }
    }
    skipStrChunk() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major !== 3 /* MAJOR.STR */)
            throw 4 /* ERROR.UNEXPECTED_STR_CHUNK_MAJOR */;
        if (minor > 27)
            throw 5 /* ERROR.UNEXPECTED_STR_CHUNK_MINOR */;
        this.skipStr(minor);
    }
    // ----------------------------------------------------------- Array skipping
    skipArr(minor) {
        const length = this.skipMinorLen(minor);
        if (length >= 0)
            this.skipN(length);
        else {
            while (this.reader.peak() !== 255 /* CONST.END */)
                this.skipAny();
            this.reader.x++;
        }
    }
    // ---------------------------------------------------------- Object skipping
    skipObj(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.skipN(length * 2);
        else {
            while (this.reader.peak() !== 255 /* CONST.END */) {
                this.skipAny();
                if (this.reader.peak() === 255 /* CONST.END */)
                    throw 7 /* ERROR.UNEXPECTED_OBJ_BREAK */;
                this.skipAny();
            }
            this.reader.x++;
        }
    }
    // ------------------------------------------------------------- Tag skipping
    skipTag(minor) {
        const length = this.skipMinorLen(minor);
        if (length < 0)
            throw 1 /* ERROR.UNEXPECTED_MINOR */;
        this.skipAny();
    }
    // ----------------------------------------------------------- Token skipping
    skipTkn(minor) {
        switch (minor) {
            case 0xf8 & 31 /* CONST.MINOR_MASK */:
                this.reader.skip(1);
                return;
            case 0xf9 & 31 /* CONST.MINOR_MASK */:
                this.reader.skip(2);
                return;
            case 0xfa & 31 /* CONST.MINOR_MASK */:
                this.reader.skip(4);
                return;
            case 0xfb & 31 /* CONST.MINOR_MASK */:
                this.reader.skip(8);
                return;
        }
        if (minor <= 23)
            return;
        throw 1 /* ERROR.UNEXPECTED_MINOR */;
    }
    // --------------------------------------------------------------- Validation
    /**
     * Throws if at given offset in a buffer there is an invalid CBOR value, or
     * if the value does not span the exact length specified in `size`. I.e.
     * throws if:
     *
     * - The value is not a valid CBOR value.
     * - The value is shorter than `size`.
     * - The value is longer than `size`.
     *
     * @param value Buffer in which to validate CBOR value.
     * @param offset Offset at which the value starts.
     * @param size Expected size of the value.
     */
    validate(value, offset = 0, size = value.length) {
        this.reader.reset(value);
        this.reader.x = offset;
        const start = offset;
        this.skipAny();
        const end = this.reader.x;
        if (end - start !== size)
            throw 8 /* ERROR.INVALID_SIZE */;
    }
    // -------------------------------------------- One level reading - any value
    decodeLevel(value) {
        this.reader.reset(value);
        return this.readLevel();
    }
    /**
     * Decodes only one level of objects and arrays. Other values are decoded
     * completely.
     *
     * @returns One level of decoded CBOR value.
     */
    readLevel() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        switch (major) {
            case 4 /* MAJOR.ARR */:
                return this.readArrLevel(minor);
            case 5 /* MAJOR.MAP */:
                return this.readObjLevel(minor);
            default:
                return super.readAnyRaw(octet);
        }
    }
    /**
     * Decodes primitive values, returns container values as `JsonPackValue`.
     *
     * @returns A primitive value, or CBOR container value as a blob.
     */
    readPrimitiveOrVal() {
        const octet = this.reader.peak();
        const major = octet >> 5;
        switch (major) {
            case 4 /* MAJOR.ARR */:
            case 5 /* MAJOR.MAP */:
                return this.readAsValue();
            default:
                return this.val();
        }
    }
    readAsValue() {
        const reader = this.reader;
        const start = reader.x;
        this.skipAny();
        const end = reader.x;
        return new JsonPackValue_1.JsonPackValue(reader.uint8.subarray(start, end));
    }
    // ----------------------------------------------- One level reading - object
    readObjLevel(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.readObjRawLevel(length);
        else
            return this.readObjIndefLevel();
    }
    readObjRawLevel(length) {
        const obj = {};
        for (let i = 0; i < length; i++) {
            const key = this.key();
            const value = this.readPrimitiveOrVal();
            obj[key] = value;
        }
        return obj;
    }
    readObjIndefLevel() {
        const obj = {};
        while (this.reader.peak() !== 255 /* CONST.END */) {
            const key = this.key();
            if (this.reader.peak() === 255 /* CONST.END */)
                throw 7 /* ERROR.UNEXPECTED_OBJ_BREAK */;
            const value = this.readPrimitiveOrVal();
            obj[key] = value;
        }
        this.reader.x++;
        return obj;
    }
    // ------------------------------------------------ One level reading - array
    readArrLevel(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.readArrRawLevel(length);
        return this.readArrIndefLevel();
    }
    readArrRawLevel(length) {
        const arr = [];
        for (let i = 0; i < length; i++)
            arr.push(this.readPrimitiveOrVal());
        return arr;
    }
    readArrIndefLevel() {
        const arr = [];
        while (this.reader.peak() !== 255 /* CONST.END */)
            arr.push(this.readPrimitiveOrVal());
        this.reader.x++;
        return arr;
    }
    // ---------------------------------------------------------- Shallow reading
    readHdr(expectedMajor) {
        const octet = this.reader.u8();
        const major = octet >> 5;
        if (major !== expectedMajor)
            throw 0 /* ERROR.UNEXPECTED_MAJOR */;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (minor < 24)
            return minor;
        switch (minor) {
            case 24:
                return this.reader.u8();
            case 25:
                return this.reader.u16();
            case 26:
                return this.reader.u32();
            case 27:
                return Number(this.reader.u64());
            case 31:
                return -1;
        }
        throw 1 /* ERROR.UNEXPECTED_MINOR */;
    }
    readStrHdr() {
        return this.readHdr(3 /* MAJOR.STR */);
    }
    readObjHdr() {
        return this.readHdr(5 /* MAJOR.MAP */);
    }
    readArrHdr() {
        return this.readHdr(4 /* MAJOR.ARR */);
    }
    findKey(key) {
        const size = this.readObjHdr();
        for (let i = 0; i < size; i++) {
            const k = this.key();
            if (k === key)
                return this;
            this.skipAny();
        }
        throw 9 /* ERROR.KEY_NOT_FOUND */;
    }
    findIndex(index) {
        const size = this.readArrHdr();
        if (index >= size)
            throw 10 /* ERROR.INDEX_OUT_OF_BOUNDS */;
        for (let i = 0; i < index; i++)
            this.skipAny();
        return this;
    }
    find(path) {
        for (let i = 0; i < path.length; i++) {
            const segment = path[i];
            if (typeof segment === 'string')
                this.findKey(segment);
            else
                this.findIndex(segment);
        }
        return this;
    }
}
exports.CborDecoder = CborDecoder;
//# sourceMappingURL=CborDecoder.js.map

/***/ }),
/* 91 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CborDecoderBase = void 0;
const f16_1 = __webpack_require__(92);
const JsonPackExtension_1 = __webpack_require__(86);
const JsonPackValue_1 = __webpack_require__(93);
const Reader_1 = __webpack_require__(94);
const sharedCachedUtf8Decoder_1 = __webpack_require__(99);
class CborDecoderBase {
    constructor(reader = new Reader_1.Reader(), keyDecoder = sharedCachedUtf8Decoder_1.default) {
        this.reader = reader;
        this.keyDecoder = keyDecoder;
    }
    read(uint8) {
        this.reader.reset(uint8);
        return this.val();
    }
    /** @deprecated */
    decode(uint8) {
        this.reader.reset(uint8);
        return this.val();
    }
    // -------------------------------------------------------- Any value reading
    val() {
        const reader = this.reader;
        const octet = reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major < 4 /* MAJOR.ARR */) {
            if (major < 2 /* MAJOR.BIN */)
                return major === 0 /* MAJOR.UIN */ ? this.readUint(minor) : this.readNint(minor);
            else
                return major === 2 /* MAJOR.BIN */ ? this.readBin(minor) : this.readStr(minor);
        }
        else {
            if (major < 6 /* MAJOR.TAG */)
                return major === 4 /* MAJOR.ARR */ ? this.readArr(minor) : this.readObj(minor);
            else
                return major === 6 /* MAJOR.TAG */ ? this.readTag(minor) : this.readTkn(minor);
        }
    }
    readAnyRaw(octet) {
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major < 4 /* MAJOR.ARR */) {
            if (major < 2 /* MAJOR.BIN */)
                return major === 0 /* MAJOR.UIN */ ? this.readUint(minor) : this.readNint(minor);
            else
                return major === 2 /* MAJOR.BIN */ ? this.readBin(minor) : this.readStr(minor);
        }
        else {
            if (major < 6 /* MAJOR.TAG */)
                return major === 4 /* MAJOR.ARR */ ? this.readArr(minor) : this.readObj(minor);
            else
                return major === 6 /* MAJOR.TAG */ ? this.readTag(minor) : this.readTkn(minor);
        }
    }
    readMinorLen(minor) {
        if (minor < 24)
            return minor;
        switch (minor) {
            case 24:
                return this.reader.u8();
            case 25:
                return this.reader.u16();
            case 26:
                return this.reader.u32();
            case 27:
                return Number(this.reader.u64());
            case 31:
                return -1;
            default:
                throw 1 /* ERROR.UNEXPECTED_MINOR */;
        }
    }
    // ----------------------------------------------------- Unsigned int reading
    readUint(minor) {
        if (minor < 25) {
            return minor === 24 ? this.reader.u8() : minor;
        }
        else {
            if (minor < 27) {
                return minor === 25 ? this.reader.u16() : this.reader.u32();
            }
            else {
                const num = this.reader.u64();
                return num > 9007199254740991 /* CONST.MAX_UINT */ ? num : Number(num);
            }
        }
    }
    // ----------------------------------------------------- Negative int reading
    readNint(minor) {
        if (minor < 25) {
            return minor === 24 ? -this.reader.u8() - 1 : -minor - 1;
        }
        else {
            if (minor < 27) {
                return minor === 25 ? -this.reader.u16() - 1 : -this.reader.u32() - 1;
            }
            else {
                const num = this.reader.u64();
                return num > 9007199254740991 /* CONST.MAX_UINT */ - 1 ? -num - BigInt(1) : -Number(num) - 1;
            }
        }
    }
    // ----------------------------------------------------------- Binary reading
    readBin(minor) {
        const reader = this.reader;
        if (minor <= 23)
            return reader.buf(minor);
        switch (minor) {
            case 24:
                return reader.buf(reader.u8());
            case 25:
                return reader.buf(reader.u16());
            case 26:
                return reader.buf(reader.u32());
            case 27:
                return reader.buf(Number(reader.u64()));
            case 31: {
                let size = 0;
                const list = [];
                while (this.reader.peak() !== 255 /* CONST.END */) {
                    const uint8 = this.readBinChunk();
                    size += uint8.length;
                    list.push(uint8);
                }
                this.reader.x++;
                const res = new Uint8Array(size);
                let offset = 0;
                const length = list.length;
                for (let i = 0; i < length; i++) {
                    const arr = list[i];
                    res.set(arr, offset);
                    offset += arr.length;
                }
                return res;
            }
            default:
                throw 1 /* ERROR.UNEXPECTED_MINOR */;
        }
    }
    readBinChunk() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major !== 2 /* MAJOR.BIN */)
            throw 2 /* ERROR.UNEXPECTED_BIN_CHUNK_MAJOR */;
        if (minor > 27)
            throw 3 /* ERROR.UNEXPECTED_BIN_CHUNK_MINOR */;
        return this.readBin(minor);
    }
    // ----------------------------------------------------------- String reading
    readAsStr() {
        const reader = this.reader;
        const octet = reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major !== 3 /* MAJOR.STR */)
            throw 11 /* ERROR.UNEXPECTED_STR_MAJOR */;
        return this.readStr(minor);
    }
    readStr(minor) {
        const reader = this.reader;
        if (minor <= 23)
            return reader.utf8(minor);
        switch (minor) {
            case 24:
                return reader.utf8(reader.u8());
            case 25:
                return reader.utf8(reader.u16());
            case 26:
                return reader.utf8(reader.u32());
            case 27:
                return reader.utf8(Number(reader.u64()));
            case 31: {
                let str = '';
                while (reader.peak() !== 255 /* CONST.END */)
                    str += this.readStrChunk();
                this.reader.x++;
                return str;
            }
            default:
                throw 1 /* ERROR.UNEXPECTED_MINOR */;
        }
    }
    readStrLen(minor) {
        if (minor <= 23)
            return minor;
        switch (minor) {
            case 24:
                return this.reader.u8();
            case 25:
                return this.reader.u16();
            case 26:
                return this.reader.u32();
            case 27:
                return Number(this.reader.u64());
            default:
                throw 1 /* ERROR.UNEXPECTED_MINOR */;
        }
    }
    readStrChunk() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major !== 3 /* MAJOR.STR */)
            throw 4 /* ERROR.UNEXPECTED_STR_CHUNK_MAJOR */;
        if (minor > 27)
            throw 5 /* ERROR.UNEXPECTED_STR_CHUNK_MINOR */;
        return this.readStr(minor);
    }
    // ------------------------------------------------------------ Array reading
    readArr(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.readArrRaw(length);
        return this.readArrIndef();
    }
    readArrRaw(length) {
        const arr = [];
        for (let i = 0; i < length; i++)
            arr.push(this.val());
        return arr;
    }
    readArrIndef() {
        const arr = [];
        while (this.reader.peak() !== 255 /* CONST.END */)
            arr.push(this.val());
        this.reader.x++;
        return arr;
    }
    // ----------------------------------------------------------- Object reading
    readObj(minor) {
        if (minor < 28) {
            let length = minor;
            switch (minor) {
                case 24:
                    length = this.reader.u8();
                    break;
                case 25:
                    length = this.reader.u16();
                    break;
                case 26:
                    length = this.reader.u32();
                    break;
                case 27:
                    length = Number(this.reader.u64());
                    break;
            }
            const obj = {};
            for (let i = 0; i < length; i++) {
                const key = this.key();
                if (key === '__proto__')
                    throw 6 /* ERROR.UNEXPECTED_OBJ_KEY */;
                const value = this.val();
                obj[key] = value;
            }
            return obj;
        }
        else if (minor === 31)
            return this.readObjIndef();
        else
            throw 1 /* ERROR.UNEXPECTED_MINOR */;
    }
    /** Remove this? */
    readObjRaw(length) {
        const obj = {};
        for (let i = 0; i < length; i++) {
            const key = this.key();
            const value = this.val();
            obj[key] = value;
        }
        return obj;
    }
    readObjIndef() {
        const obj = {};
        while (this.reader.peak() !== 255 /* CONST.END */) {
            const key = this.key();
            if (this.reader.peak() === 255 /* CONST.END */)
                throw 7 /* ERROR.UNEXPECTED_OBJ_BREAK */;
            const value = this.val();
            obj[key] = value;
        }
        this.reader.x++;
        return obj;
    }
    key() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31 /* CONST.MINOR_MASK */;
        if (major !== 3 /* MAJOR.STR */)
            return String(this.readAnyRaw(octet));
        const length = this.readStrLen(minor);
        if (length > 31)
            return this.reader.utf8(length);
        const key = this.keyDecoder.decode(this.reader.uint8, this.reader.x, length);
        this.reader.skip(length);
        return key;
    }
    // -------------------------------------------------------------- Tag reading
    readTag(minor) {
        if (minor <= 23)
            return this.readTagRaw(minor);
        switch (minor) {
            case 24:
                return this.readTagRaw(this.reader.u8());
            case 25:
                return this.readTagRaw(this.reader.u16());
            case 26:
                return this.readTagRaw(this.reader.u32());
            case 27:
                return this.readTagRaw(Number(this.reader.u64()));
            default:
                throw 1 /* ERROR.UNEXPECTED_MINOR */;
        }
    }
    readTagRaw(tag) {
        return new JsonPackExtension_1.JsonPackExtension(tag, this.val());
    }
    // ------------------------------------------------------------ Token reading
    readTkn(minor) {
        switch (minor) {
            case 0xf4 & 31 /* CONST.MINOR_MASK */:
                return false;
            case 0xf5 & 31 /* CONST.MINOR_MASK */:
                return true;
            case 0xf6 & 31 /* CONST.MINOR_MASK */:
                return null;
            case 0xf7 & 31 /* CONST.MINOR_MASK */:
                return undefined;
            case 0xf8 & 31 /* CONST.MINOR_MASK */:
                return new JsonPackValue_1.JsonPackValue(this.reader.u8());
            case 0xf9 & 31 /* CONST.MINOR_MASK */:
                return this.f16();
            case 0xfa & 31 /* CONST.MINOR_MASK */:
                return this.reader.f32();
            case 0xfb & 31 /* CONST.MINOR_MASK */:
                return this.reader.f64();
        }
        if (minor <= 23)
            return new JsonPackValue_1.JsonPackValue(minor);
        throw 1 /* ERROR.UNEXPECTED_MINOR */;
    }
    f16() {
        return (0, f16_1.decodeF16)(this.reader.u16());
    }
}
exports.CborDecoderBase = CborDecoderBase;
//# sourceMappingURL=CborDecoderBase.js.map

/***/ }),
/* 92 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.decodeF16 = void 0;
const pow = Math.pow;
const decodeF16 = (binary) => {
    const exponent = (binary & 0x7c00) >> 10;
    const fraction = binary & 0x03ff;
    return ((binary >> 15 ? -1 : 1) *
        (exponent
            ? exponent === 0x1f
                ? fraction
                    ? NaN
                    : Infinity
                : pow(2, exponent - 15) * (1 + fraction / 0x400)
            : 6.103515625e-5 * (fraction / 0x400)));
};
exports.decodeF16 = decodeF16;
//# sourceMappingURL=f16.js.map

/***/ }),
/* 93 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JsonPackValue = void 0;
/**
 * Use this wrapper is you have a pre-encoded MessagePack or CBOR value and you would
 * like to dump it into a the document as-is. The contents of `buf` will
 * be written as is to the document.
 *
 * It also serves as CBOR simple value container. In which case the type of value
 * `val` field is "number".
 *
 * @category Value
 */
class JsonPackValue {
    constructor(val) {
        this.val = val;
    }
}
exports.JsonPackValue = JsonPackValue;
//# sourceMappingURL=JsonPackValue.js.map

/***/ }),
/* 94 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Reader = void 0;
const decodeUtf8_1 = __webpack_require__(95);
class Reader {
    constructor() {
        this.uint8 = new Uint8Array([]);
        this.view = new DataView(this.uint8.buffer);
        this.x = 0;
    }
    reset(uint8) {
        this.x = 0;
        this.uint8 = uint8;
        this.view = new DataView(uint8.buffer, uint8.byteOffset, uint8.length);
    }
    peak() {
        return this.view.getUint8(this.x);
    }
    skip(length) {
        this.x += length;
    }
    buf(size) {
        const end = this.x + size;
        const bin = this.uint8.subarray(this.x, end);
        this.x = end;
        return bin;
    }
    u8() {
        return this.uint8[this.x++];
        // return this.view.getUint8(this.x++);
    }
    i8() {
        return this.view.getInt8(this.x++);
    }
    u16() {
        // const num = this.view.getUint16(this.x);
        // this.x += 2;
        // return num;
        let x = this.x;
        const num = (this.uint8[x++] << 8) + this.uint8[x++];
        this.x = x;
        return num;
    }
    i16() {
        const num = this.view.getInt16(this.x);
        this.x += 2;
        return num;
    }
    u32() {
        const num = this.view.getUint32(this.x);
        this.x += 4;
        return num;
    }
    i32() {
        const num = this.view.getInt32(this.x);
        this.x += 4;
        return num;
    }
    u64() {
        const num = this.view.getBigUint64(this.x);
        this.x += 8;
        return num;
    }
    i64() {
        const num = this.view.getBigInt64(this.x);
        this.x += 8;
        return num;
    }
    f32() {
        const pos = this.x;
        this.x += 4;
        return this.view.getFloat32(pos);
    }
    f64() {
        const pos = this.x;
        this.x += 8;
        return this.view.getFloat64(pos);
    }
    utf8(size) {
        const start = this.x;
        this.x += size;
        return (0, decodeUtf8_1.decodeUtf8)(this.uint8, start, size);
    }
    ascii(length) {
        const uint8 = this.uint8;
        let str = '';
        const end = this.x + length;
        for (let i = this.x; i < end; i++)
            str += String.fromCharCode(uint8[i]);
        this.x = end;
        return str;
    }
}
exports.Reader = Reader;
//# sourceMappingURL=Reader.js.map

/***/ }),
/* 95 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.decodeUtf8 = void 0;
const v16_1 = __webpack_require__(96);
exports.decodeUtf8 = v16_1.default;
//# sourceMappingURL=index.js.map

/***/ }),
/* 96 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
/* provided dependency */ var Buffer = __webpack_require__(9)["Buffer"];

Object.defineProperty(exports, "__esModule", ({ value: true }));
const decodeAscii_1 = __webpack_require__(97);
const v18_1 = __webpack_require__(98);
const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;
const from = hasBuffer ? Buffer.from : null;
const shortDecoder = (buf, start, length) => { var _a; return (_a = (0, decodeAscii_1.decodeAsciiMax15)(buf, start, length)) !== null && _a !== void 0 ? _a : (0, v18_1.default)(buf, start, length); };
const midDecoder = (buf, start, length) => { var _a; return (_a = (0, decodeAscii_1.decodeAscii)(buf, start, length)) !== null && _a !== void 0 ? _a : (0, v18_1.default)(buf, start, length); };
const longDecoder = utf8Slice
    ? (buf, start, length) => utf8Slice.call(buf, start, start + length)
    : from
        ? (buf, start, length) => from(buf)
            .subarray(start, start + length)
            .toString('utf8')
        : v18_1.default;
const decoder = (buf, start, length) => {
    if (length < 16)
        return shortDecoder(buf, start, length);
    if (length < 32)
        return midDecoder(buf, start, length);
    return longDecoder(buf, start, length);
};
exports["default"] = decoder;
//# sourceMappingURL=v16.js.map

/***/ }),
/* 97 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.decodeAsciiMax15 = exports.decodeAscii = void 0;
const fromCharCode = String.fromCharCode;
/** This code was borrowed form cbor-x under the MIT license. */
// MIT License
// Copyright (c) 2020 Kris Zyp
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
const decodeAscii = (src, position, length) => {
    const bytes = [];
    for (let i = 0; i < length; i++) {
        const byte = src[position++];
        if (byte & 0x80)
            return;
        bytes.push(byte);
    }
    return fromCharCode.apply(String, bytes);
};
exports.decodeAscii = decodeAscii;
const decodeAsciiMax15 = (src, position, length) => {
    if (length < 4) {
        if (length < 2) {
            if (length === 0)
                return '';
            else {
                const a = src[position++];
                if ((a & 0x80) > 1) {
                    position -= 1;
                    return;
                }
                return fromCharCode(a);
            }
        }
        else {
            const a = src[position++];
            const b = src[position++];
            if ((a & 0x80) > 0 || (b & 0x80) > 0) {
                position -= 2;
                return;
            }
            if (length < 3)
                return fromCharCode(a, b);
            const c = src[position++];
            if ((c & 0x80) > 0) {
                position -= 3;
                return;
            }
            return fromCharCode(a, b, c);
        }
    }
    else {
        const a = src[position++];
        const b = src[position++];
        const c = src[position++];
        const d = src[position++];
        if ((a & 0x80) > 0 || (b & 0x80) > 0 || (c & 0x80) > 0 || (d & 0x80) > 0) {
            position -= 4;
            return;
        }
        if (length < 6) {
            if (length === 4)
                return fromCharCode(a, b, c, d);
            else {
                const e = src[position++];
                if ((e & 0x80) > 0) {
                    position -= 5;
                    return;
                }
                return fromCharCode(a, b, c, d, e);
            }
        }
        else if (length < 8) {
            const e = src[position++];
            const f = src[position++];
            if ((e & 0x80) > 0 || (f & 0x80) > 0) {
                position -= 6;
                return;
            }
            if (length < 7)
                return fromCharCode(a, b, c, d, e, f);
            const g = src[position++];
            if ((g & 0x80) > 0) {
                position -= 7;
                return;
            }
            return fromCharCode(a, b, c, d, e, f, g);
        }
        else {
            const e = src[position++];
            const f = src[position++];
            const g = src[position++];
            const h = src[position++];
            if ((e & 0x80) > 0 || (f & 0x80) > 0 || (g & 0x80) > 0 || (h & 0x80) > 0) {
                position -= 8;
                return;
            }
            if (length < 10) {
                if (length === 8)
                    return fromCharCode(a, b, c, d, e, f, g, h);
                else {
                    const i = src[position++];
                    if ((i & 0x80) > 0) {
                        position -= 9;
                        return;
                    }
                    return fromCharCode(a, b, c, d, e, f, g, h, i);
                }
            }
            else if (length < 12) {
                const i = src[position++];
                const j = src[position++];
                if ((i & 0x80) > 0 || (j & 0x80) > 0) {
                    position -= 10;
                    return;
                }
                if (length < 11)
                    return fromCharCode(a, b, c, d, e, f, g, h, i, j);
                const k = src[position++];
                if ((k & 0x80) > 0) {
                    position -= 11;
                    return;
                }
                return fromCharCode(a, b, c, d, e, f, g, h, i, j, k);
            }
            else {
                const i = src[position++];
                const j = src[position++];
                const k = src[position++];
                const l = src[position++];
                if ((i & 0x80) > 0 || (j & 0x80) > 0 || (k & 0x80) > 0 || (l & 0x80) > 0) {
                    position -= 12;
                    return;
                }
                if (length < 14) {
                    if (length === 12)
                        return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l);
                    else {
                        const m = src[position++];
                        if ((m & 0x80) > 0) {
                            position -= 13;
                            return;
                        }
                        return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m);
                    }
                }
                else {
                    const m = src[position++];
                    const n = src[position++];
                    if ((m & 0x80) > 0 || (n & 0x80) > 0) {
                        position -= 14;
                        return;
                    }
                    if (length < 15)
                        return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n);
                    const o = src[position++];
                    if ((o & 0x80) > 0) {
                        position -= 15;
                        return;
                    }
                    return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
                }
            }
        }
    }
};
exports.decodeAsciiMax15 = decodeAsciiMax15;
//# sourceMappingURL=decodeAscii.js.map

/***/ }),
/* 98 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const fromCharCode = String.fromCharCode;
exports["default"] = (buf, start, length) => {
    let offset = start;
    const end = offset + length;
    const points = [];
    while (offset < end) {
        let code = buf[offset++];
        if ((code & 0x80) !== 0) {
            const octet2 = buf[offset++] & 0x3f;
            if ((code & 0xe0) === 0xc0) {
                code = ((code & 0x1f) << 6) | octet2;
            }
            else {
                const octet3 = buf[offset++] & 0x3f;
                if ((code & 0xf0) === 0xe0) {
                    code = ((code & 0x1f) << 12) | (octet2 << 6) | octet3;
                }
                else {
                    if ((code & 0xf8) === 0xf0) {
                        const octet4 = buf[offset++] & 0x3f;
                        let unit = ((code & 0x07) << 0x12) | (octet2 << 0x0c) | (octet3 << 0x06) | octet4;
                        if (unit > 0xffff) {
                            unit -= 0x10000;
                            const unit0 = ((unit >>> 10) & 0x3ff) | 0xd800;
                            code = 0xdc00 | (unit & 0x3ff);
                            points.push(unit0);
                        }
                        else {
                            code = unit;
                        }
                    }
                }
            }
        }
        points.push(code);
    }
    return fromCharCode.apply(String, points);
};
//# sourceMappingURL=v18.js.map

/***/ }),
/* 99 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const CachedUtf8Decoder_1 = __webpack_require__(100);
exports["default"] = new CachedUtf8Decoder_1.CachedUtf8Decoder();
//# sourceMappingURL=sharedCachedUtf8Decoder.js.map

/***/ }),
/* 100 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CachedUtf8Decoder = void 0;
const v10_1 = __webpack_require__(101);
const randomU32_1 = __webpack_require__(102);
class CacheItem {
    constructor(bytes, value) {
        this.bytes = bytes;
        this.value = value;
    }
}
class CachedUtf8Decoder {
    constructor() {
        this.caches = [];
        for (let i = 0; i < 31 /* CONST.MAX_CACHED_STR_LEN */; i++)
            this.caches.push([]);
    }
    get(bytes, offset, size) {
        const records = this.caches[size - 1];
        const len = records.length;
        FIND_CHUNK: for (let i = 0; i < len; i++) {
            const record = records[i];
            const recordBytes = record.bytes;
            for (let j = 0; j < size; j++)
                if (recordBytes[j] !== bytes[offset + j])
                    continue FIND_CHUNK;
            return record.value;
        }
        return null;
    }
    store(bytes, value) {
        const records = this.caches[bytes.length - 1];
        const record = new CacheItem(bytes, value);
        const length = records.length;
        if (length >= 16 /* CONST.MAX_RECORDS_PER_SIZE */)
            records[(0, randomU32_1.randomU32)(0, 16 /* CONST.MAX_RECORDS_PER_SIZE */ - 1)] = record;
        else
            records.push(record);
    }
    decode(bytes, offset, size) {
        if (!size)
            return '';
        const cachedValue = this.get(bytes, offset, size);
        if (cachedValue !== null)
            return cachedValue;
        const value = (0, v10_1.default)(bytes, offset, size);
        // Ensure to copy a slice of bytes because the byte may be NodeJS Buffer and Buffer#slice() returns a reference to its internal ArrayBuffer.
        const copy = Uint8Array.prototype.slice.call(bytes, offset, offset + size);
        this.store(copy, value);
        return value;
    }
}
exports.CachedUtf8Decoder = CachedUtf8Decoder;
//# sourceMappingURL=CachedUtf8Decoder.js.map

/***/ }),
/* 101 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const fromCharCode = String.fromCharCode;
exports["default"] = (buf, start, length) => {
    let offset = start;
    const end = offset + length;
    let str = '';
    while (offset < end) {
        const octet1 = buf[offset++];
        if ((octet1 & 0x80) === 0) {
            str += fromCharCode(octet1);
            continue;
        }
        const octet2 = buf[offset++] & 0x3f;
        if ((octet1 & 0xe0) === 0xc0) {
            str += fromCharCode(((octet1 & 0x1f) << 6) | octet2);
            continue;
        }
        const octet3 = buf[offset++] & 0x3f;
        if ((octet1 & 0xf0) === 0xe0) {
            str += fromCharCode(((octet1 & 0x1f) << 12) | (octet2 << 6) | octet3);
            continue;
        }
        if ((octet1 & 0xf8) === 0xf0) {
            const octet4 = buf[offset++] & 0x3f;
            let unit = ((octet1 & 0x07) << 0x12) | (octet2 << 0x0c) | (octet3 << 0x06) | octet4;
            if (unit > 0xffff) {
                unit -= 0x10000;
                const unit0 = ((unit >>> 10) & 0x3ff) | 0xd800;
                unit = 0xdc00 | (unit & 0x3ff);
                str += fromCharCode(unit0, unit);
            }
            else {
                str += fromCharCode(unit);
            }
        }
        else {
            str += fromCharCode(octet1);
        }
    }
    return str;
};
//# sourceMappingURL=v10.js.map

/***/ }),
/* 102 */
/***/ (function(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.randomU32 = void 0;
let x = 1 + Math.round(Math.random() * ((-1 >>> 0) - 1));
/** Generate a random 32-bit unsigned integer in the specified [min, max] range. */
function randomU32(min, max) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) % (max - min + 1) + min;
}
exports.randomU32 = randomU32;
//# sourceMappingURL=randomU32.js.map

/***/ }),
/* 103 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FsaNodeSyncWorker = void 0;
const SyncMessenger_1 = __webpack_require__(82);
const FsaNodeFs_1 = __webpack_require__(2);
const json_1 = __webpack_require__(83);
class FsaNodeSyncWorker {
    constructor() {
        this.sab = new SharedArrayBuffer(1024 * 1024);
        this.messenger = new SyncMessenger_1.SyncMessenger(this.sab);
        this.onPostMessage = (msg) => {
            switch (msg[0]) {
                case 1 /* FsaNodeWorkerMessageCode.SetRoot */: {
                    const [, id, dir] = msg;
                    this.root = dir;
                    this.fs = new FsaNodeFs_1.FsaNodeFs(this.root);
                    const response = [2 /* FsaNodeWorkerMessageCode.RootSet */, id];
                    postMessage(response);
                    this.messenger.serveAsync(this.onRequest);
                    break;
                }
            }
        };
        this.onRequest = async (request) => {
            try {
                const message = json_1.decoder.decode(request);
                if (!Array.isArray(message))
                    throw new Error('Invalid message format');
                const code = message[0];
                if (code !== 3 /* FsaNodeWorkerMessageCode.Request */)
                    throw new Error('Invalid message code');
                const [, method, payload] = message;
                const handler = this.handlers[method];
                if (!handler)
                    throw new Error(`Unknown method ${method}`);
                const response = await handler(payload);
                return json_1.encoder.encode([4 /* FsaNodeWorkerMessageCode.Response */, response]);
            }
            catch (err) {
                const message = err && typeof err === 'object' && err.message ? err.message : 'Unknown error';
                const error = { message };
                if (err && typeof err === 'object' && (err.code || err.name))
                    error.code = err.code || err.name;
                return json_1.encoder.encode([5 /* FsaNodeWorkerMessageCode.ResponseError */, error]);
            }
        };
        this.handlers = {
            stat: async (location) => {
                const handle = await this.getFileOrDir(location[0], location[1], 'statSync');
                return {
                    kind: handle.kind,
                };
            },
            access: async ([filename, mode]) => {
                await this.fs.promises.access(filename, mode);
            },
            readFile: async ([filename, opts]) => {
                const buf = (await this.fs.promises.readFile(filename, Object.assign(Object.assign({}, opts), { encoding: 'buffer' })));
                const uint8 = new Uint8Array(buf, buf.byteOffset, buf.byteLength);
                return uint8;
            },
            writeFile: async ([filename, data, opts]) => {
                await this.fs.promises.writeFile(filename, data, Object.assign(Object.assign({}, opts), { encoding: 'buffer' }));
            },
            appendFile: async ([filename, data, opts]) => {
                await this.fs.promises.appendFile(filename, data, Object.assign(Object.assign({}, opts), { encoding: 'buffer' }));
            },
            copy: async ([src, dst, flags]) => {
                await this.fs.promises.copyFile(src, dst, flags);
            },
            move: async ([src, dst]) => {
                await this.fs.promises.rename(src, dst);
            },
            rmdir: async ([filename, options]) => {
                await this.fs.promises.rmdir(filename, options);
            },
            rm: async ([filename, options]) => {
                await this.fs.promises.rm(filename, options);
            },
            mkdir: async ([filename, options]) => {
                return await this.fs.promises.mkdir(filename, options);
            },
            mkdtemp: async ([filename]) => {
                return (await this.fs.promises.mkdtemp(filename, { encoding: 'utf8' }));
            },
            trunc: async ([filename, len]) => {
                await this.fs.promises.truncate(filename, len);
            },
            unlink: async ([filename]) => {
                await this.fs.promises.unlink(filename);
            },
            readdir: async ([filename]) => {
                const list = (await this.fs.promises.readdir(filename, { withFileTypes: true, encoding: 'utf8' }));
                const res = list.map(entry => ({
                    kind: entry.isDirectory() ? 'directory' : 'file',
                    name: entry.name,
                }));
                return res;
            },
            read: async ([filename, position, length]) => {
                let uint8 = new Uint8Array(length);
                const handle = await this.fs.promises.open(filename, 'r');
                const bytesRead = await new Promise((resolve, reject) => {
                    this.fs.read(handle.fd, uint8, 0, length, position, (err, bytesRead) => {
                        if (err)
                            return reject(err);
                        resolve(bytesRead || length);
                    });
                });
                if (bytesRead < length)
                    uint8 = uint8.slice(0, bytesRead);
                return uint8;
            },
            write: async ([filename, data, position]) => {
                const handle = await this.fs.promises.open(filename, 'a');
                const { bytesWritten } = await handle.write(data, 0, data.length, position || undefined);
                return bytesWritten;
            },
            open: async ([filename, flags, mode]) => {
                const handle = await this.fs.promises.open(filename, flags, mode);
                const file = await this.fs.__getFileById(handle.fd);
                await handle.close();
                return file;
            },
        };
    }
    start() {
        onmessage = e => {
            if (!Array.isArray(e.data))
                return;
            this.onPostMessage(e.data);
        };
        const initMsg = [0 /* FsaNodeWorkerMessageCode.Init */, this.sab];
        postMessage(initMsg);
    }
    async getDir(path, create, funcName) {
        let curr = this.root;
        const options = { create };
        try {
            for (const name of path) {
                curr = await curr.getDirectoryHandle(name, options);
            }
        }
        catch (error) {
            // if (error && typeof error === 'object' && error.name === 'TypeMismatchError')
            //   throw createError('ENOTDIR', funcName, path.join(FsaToNodeConstants.Separator));
            throw error;
        }
        return curr;
    }
    async getFile(path, name, funcName, create) {
        const dir = await this.getDir(path, false, funcName);
        const file = await dir.getFileHandle(name, { create });
        return file;
    }
    async getFileOrDir(path, name, funcName, create) {
        const dir = await this.getDir(path, false, funcName);
        try {
            const file = await dir.getFileHandle(name);
            return file;
        }
        catch (error) {
            if (error && typeof error === 'object') {
                switch (error.name) {
                    case 'TypeMismatchError':
                        return await dir.getDirectoryHandle(name);
                    // case 'NotFoundError':
                    //   throw createError('ENOENT', funcName, path.join(FsaToNodeConstants.Separator));
                }
            }
            throw error;
        }
    }
}
exports.FsaNodeSyncWorker = FsaNodeSyncWorker;
//# sourceMappingURL=FsaNodeSyncWorker.js.map

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	!function() {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});