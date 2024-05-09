const ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string';
function getPostMessage(options) {
    return typeof options.postMessage === 'function'
        ? options.postMessage
        : typeof postMessage === 'function'
            ? postMessage
            : undefined;
}

const WASI_THREADS_MAX_TID = 0x1FFFFFFF;
function checkSharedWasmMemory(wasmMemory) {
    if (typeof SharedArrayBuffer === 'undefined' || (wasmMemory && !(wasmMemory.buffer instanceof SharedArrayBuffer))) {
        throw new Error('Multithread features require shared wasm memory. ' +
            'Try to compile with `-matomics -mbulk-memory` and use `--import-memory --shared-memory` during linking');
    }
}
class ThreadManager {
    constructor(options) {
        var _a, _b;
        this.unusedWorkers = [];
        this.runningWorkers = [];
        this.pthreads = Object.create(null);
        this.nextWorkerID = 0;
        this.wasmModule = null;
        this.wasmMemory = null;
        this.messageEvents = new WeakMap();
        const onCreateWorker = options.onCreateWorker;
        if (typeof onCreateWorker !== 'function') {
            throw new TypeError('`options.onCreateWorker` is not provided');
        }
        this._onCreateWorker = onCreateWorker;
        this._reuseWorker = (_a = options.reuseWorker) !== null && _a !== void 0 ? _a : false;
        this._beforeLoad = options.beforeLoad;
        this.printErr = (_b = options.printErr) !== null && _b !== void 0 ? _b : console.error.bind(console);
    }
    init() { }
    setup(wasmModule, wasmMemory) {
        this.wasmModule = wasmModule;
        this.wasmMemory = wasmMemory;
    }
    markId(worker) {
        if (worker.__emnapi_tid)
            return worker.__emnapi_tid;
        const tid = this.nextWorkerID + 43;
        this.nextWorkerID = (this.nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42);
        this.pthreads[tid] = worker;
        worker.__emnapi_tid = tid;
        return tid;
    }
    returnWorkerToPool(worker) {
        var tid = worker.__emnapi_tid;
        if (tid !== undefined) {
            delete this.pthreads[tid];
        }
        this.unusedWorkers.push(worker);
        this.runningWorkers.splice(this.runningWorkers.indexOf(worker), 1);
        delete worker.__emnapi_tid;
        if (ENVIRONMENT_IS_NODE) {
            worker.unref();
        }
    }
    loadWasmModuleToWorker(worker, sab) {
        if (worker.whenLoaded)
            return worker.whenLoaded;
        const err = this.printErr;
        const beforeLoad = this._beforeLoad;
        worker.whenLoaded = new Promise((resolve, reject) => {
            const handleError = function (e) {
                let message = 'worker sent an error!';
                if (worker.__emnapi_tid !== undefined) {
                    message = 'worker (tid = ' + worker.__emnapi_tid + ') sent an error!';
                }
                err(message + ' ' + e.message);
                reject(e);
                throw e;
            };
            const handleMessage = (data) => {
                if (data.__emnapi__) {
                    const type = data.__emnapi__.type;
                    const payload = data.__emnapi__.payload;
                    if (type === 'loaded') {
                        worker.loaded = true;
                        if (ENVIRONMENT_IS_NODE && !worker.__emnapi_tid) {
                            worker.unref();
                        }
                        resolve(worker);
                    }
                    else if (type === 'cleanup-thread') {
                        this.cleanThread(worker, payload.tid);
                    }
                }
            };
            worker.onmessage = (e) => {
                handleMessage(e.data);
                this.fireMessageEvent(worker, e);
            };
            worker.onerror = handleError;
            if (ENVIRONMENT_IS_NODE) {
                worker.on('message', function (data) {
                    var _a, _b;
                    (_b = (_a = worker).onmessage) === null || _b === void 0 ? void 0 : _b.call(_a, {
                        data
                    });
                });
                worker.on('error', function (e) {
                    var _a, _b;
                    (_b = (_a = worker).onerror) === null || _b === void 0 ? void 0 : _b.call(_a, e);
                });
                worker.on('detachedExit', function () { });
            }
            if (typeof beforeLoad === 'function') {
                beforeLoad(worker);
            }
            try {
                worker.postMessage({
                    __emnapi__: {
                        type: 'load',
                        payload: {
                            wasmModule: this.wasmModule,
                            wasmMemory: this.wasmMemory,
                            sab
                        }
                    }
                });
            }
            catch (err) {
                checkSharedWasmMemory(this.wasmMemory);
                throw err;
            }
        });
        return worker.whenLoaded;
    }
    allocateUnusedWorker() {
        const _onCreateWorker = this._onCreateWorker;
        const worker = _onCreateWorker({ type: 'thread', name: 'emnapi-pthread' });
        this.unusedWorkers.push(worker);
        return worker;
    }
    getNewWorker(sab) {
        if (this._reuseWorker) {
            if (this.unusedWorkers.length === 0) {
                const worker = this.allocateUnusedWorker();
                this.loadWasmModuleToWorker(worker, sab);
            }
            return this.unusedWorkers.pop();
        }
        const worker = this.allocateUnusedWorker();
        this.loadWasmModuleToWorker(worker, sab);
        return this.unusedWorkers.pop();
    }
    cleanThread(worker, tid, force) {
        if (!force && this._reuseWorker) {
            this.returnWorkerToPool(worker);
        }
        else {
            delete this.pthreads[tid];
            const index = this.runningWorkers.indexOf(worker);
            if (index !== -1) {
                this.runningWorkers.splice(index, 1);
            }
            this.terminateWorker(worker);
            delete worker.__emnapi_tid;
        }
    }
    terminateWorker(worker) {
        var _a;
        const tid = worker.__emnapi_tid;
        worker.terminate();
        (_a = this.messageEvents.get(worker)) === null || _a === void 0 ? void 0 : _a.clear();
        this.messageEvents.delete(worker);
        worker.onmessage = (e) => {
            if (e.data.__emnapi__) {
                const err = this.printErr;
                err('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid);
            }
        };
    }
    addMessageEventListener(worker, onMessage) {
        let listeners = this.messageEvents.get(worker);
        if (!listeners) {
            listeners = new Set();
            this.messageEvents.set(worker, listeners);
        }
        listeners.add(onMessage);
        return () => {
            listeners === null || listeners === void 0 ? void 0 : listeners.delete(onMessage);
        };
    }
    fireMessageEvent(worker, e) {
        const listeners = this.messageEvents.get(worker);
        if (!listeners)
            return;
        const err = this.printErr;
        listeners.forEach((listener) => {
            try {
                listener(e);
            }
            catch (e) {
                err(e.message);
            }
        });
    }
}

class WASIThreads {
    constructor(options) {
        if (!options) {
            throw new TypeError('options is not provided');
        }
        if ('childThread' in options) {
            this.childThread = Boolean(options.childThread);
        }
        else {
            this.childThread = false;
        }
        this.PThread = undefined;
        if ('threadManager' in options) {
            if (typeof options.threadManager === 'function') {
                this.PThread = options.threadManager();
            }
            else {
                this.PThread = options.threadManager;
            }
        }
        else {
            if (!this.childThread) {
                this.PThread = new ThreadManager(options);
            }
        }
        let waitThreadStart = false;
        if ('waitThreadStart' in options) {
            waitThreadStart = Boolean(options.waitThreadStart);
        }
        const postMessage = getPostMessage(options);
        if (this.childThread && typeof postMessage !== 'function') {
            throw new TypeError('options.postMessage is not a function');
        }
        const wasm64 = Boolean(options.wasm64);
        const onSpawn = (e) => {
            if (e.data.__emnapi__) {
                const type = e.data.__emnapi__.type;
                const payload = e.data.__emnapi__.payload;
                if (type === 'spawn-thread') {
                    threadSpawn(payload.startArg, payload.errorOrTid);
                }
            }
        };
        const threadSpawn = (startArg, errorOrTid) => {
            checkSharedWasmMemory(this.wasmMemory);
            const isNewABI = errorOrTid !== undefined;
            if (!isNewABI) {
                const malloc = this.wasmInstance.exports.malloc;
                errorOrTid = wasm64 ? Number(malloc(BigInt(8))) : malloc(8);
                if (!errorOrTid) {
                    return -48;
                }
            }
            const _free = this.wasmInstance.exports.free;
            const free = wasm64 ? (ptr) => { _free(BigInt(ptr)); } : _free;
            const struct = new Int32Array(this.wasmMemory.buffer, errorOrTid, 2);
            Atomics.store(struct, 0, 0);
            Atomics.store(struct, 1, 0);
            if (this.childThread) {
                postMessage({
                    __emnapi__: {
                        type: 'spawn-thread',
                        payload: {
                            startArg,
                            errorOrTid: errorOrTid
                        }
                    }
                });
                Atomics.wait(struct, 1, 0);
                const isError = Atomics.load(struct, 0);
                const result = Atomics.load(struct, 1);
                if (isNewABI) {
                    return isError;
                }
                free(errorOrTid);
                return isError ? -result : result;
            }
            let sab;
            if (waitThreadStart) {
                sab = new Int32Array(new SharedArrayBuffer(4));
                Atomics.store(sab, 0, 0);
            }
            let worker;
            let tid;
            const PThread = this.PThread;
            try {
                worker = PThread.getNewWorker(sab);
                if (!worker) {
                    throw new Error('failed to get new worker');
                }
                PThread.addMessageEventListener(worker, onSpawn);
                tid = PThread.markId(worker);
                if (ENVIRONMENT_IS_NODE) {
                    worker.ref();
                }
                worker.postMessage({
                    __emnapi__: {
                        type: 'start',
                        payload: {
                            tid,
                            arg: startArg,
                            sab
                        }
                    }
                });
                if (waitThreadStart) {
                    Atomics.wait(sab, 0, 0);
                    const r = Atomics.load(sab, 0);
                    if (r === 2) {
                        throw new Error('failed to start pthread');
                    }
                }
            }
            catch (e) {
                const EAGAIN = 6;
                Atomics.store(struct, 0, 1);
                Atomics.store(struct, 1, EAGAIN);
                Atomics.notify(struct, 1);
                PThread === null || PThread === void 0 ? void 0 : PThread.printErr(e.message);
                if (isNewABI) {
                    return 1;
                }
                free(errorOrTid);
                return -EAGAIN;
            }
            Atomics.store(struct, 0, 0);
            Atomics.store(struct, 1, tid);
            Atomics.notify(struct, 1);
            PThread.runningWorkers.push(worker);
            if (!waitThreadStart) {
                worker.whenLoaded.catch((err) => {
                    delete worker.whenLoaded;
                    PThread.cleanThread(worker, tid, true);
                    throw err;
                });
            }
            if (isNewABI) {
                return 0;
            }
            free(errorOrTid);
            return tid;
        };
        this.threadSpawn = threadSpawn;
    }
    getImportObject() {
        return {
            wasi: {
                'thread-spawn': this.threadSpawn
            }
        };
    }
    setup(wasmInstance, wasmModule, wasmMemory) {
        this.wasmInstance = wasmInstance;
        this.wasmMemory = wasmMemory;
        if (this.PThread) {
            this.PThread.setup(wasmModule, wasmMemory);
        }
    }
}

class MessageHandler {
    constructor(options) {
        const onLoad = options.onLoad;
        const postMsg = getPostMessage(options);
        if (typeof onLoad !== 'function') {
            throw new TypeError('options.onLoad is not a function');
        }
        if (typeof postMsg !== 'function') {
            throw new TypeError('options.postMessage is not a function');
        }
        this.onLoad = onLoad;
        this.postMessage = postMsg;
        this.instance = undefined;
        this.messagesBeforeLoad = [];
    }
    handle(e) {
        var _a;
        if ((_a = e === null || e === void 0 ? void 0 : e.data) === null || _a === void 0 ? void 0 : _a.__emnapi__) {
            const type = e.data.__emnapi__.type;
            const payload = e.data.__emnapi__.payload;
            if (type === 'load') {
                this._load(payload);
            }
            else if (type === 'start') {
                this.handleAfterLoad(e, () => {
                    this._start(payload);
                });
            }
        }
    }
    _load(payload) {
        if (this.instance !== undefined)
            return;
        const onLoad = this.onLoad;
        let source;
        try {
            source = onLoad(payload);
        }
        catch (err) {
            this._loaded(err, null, payload);
            return;
        }
        const then = source && 'then' in source ? source.then : undefined;
        if (typeof then === 'function') {
            then.call(source, (source) => { this._loaded(null, source, payload); }, (err) => { this._loaded(err, null, payload); });
        }
        else {
            this._loaded(null, source, payload);
        }
    }
    _start(payload) {
        notifyPthreadCreateResult(payload.sab, 1);
        if (typeof this.instance.exports.wasi_thread_start !== 'function') {
            throw new TypeError('wasi_thread_start is not exported');
        }
        const postMessage = this.postMessage;
        const tid = payload.tid;
        const startArg = payload.arg;
        this.instance.exports.wasi_thread_start(tid, startArg);
        postMessage({
            __emnapi__: {
                type: 'cleanup-thread',
                payload: {
                    tid
                }
            }
        });
    }
    onLoadSuccess(_source) { }
    _loaded(err, source, payload) {
        if (err) {
            notifyPthreadCreateResult(payload.sab, 2);
            throw err;
        }
        if (source == null) {
            notifyPthreadCreateResult(payload.sab, 2);
            throw new TypeError('onLoad should return an object');
        }
        const instance = source.instance;
        if (!instance) {
            notifyPthreadCreateResult(payload.sab, 2);
            throw new TypeError('onLoad should return an object which includes "instance"');
        }
        this.instance = instance;
        this.onLoadSuccess(source);
        const postMessage = this.postMessage;
        postMessage({
            __emnapi__: {
                type: 'loaded',
                payload: {}
            }
        });
        const messages = this.messagesBeforeLoad;
        this.messagesBeforeLoad = [];
        for (let i = 0; i < messages.length; i++) {
            const data = messages[i];
            this.handle({ data });
        }
    }
    handleAfterLoad(e, f) {
        if (this.instance !== undefined) {
            f.call(this, e);
        }
        else {
            this.messagesBeforeLoad.push(e.data);
        }
    }
}
function notifyPthreadCreateResult(sab, result) {
    if (sab) {
        Atomics.store(sab, 0, result);
        Atomics.notify(sab, 0);
    }
}

function createInstanceProxy(instance, memory) {
    const originalExports = instance.exports;
    const createHandler = function (target) {
        const handlers = [
            'apply',
            'construct',
            'defineProperty',
            'deleteProperty',
            'get',
            'getOwnPropertyDescriptor',
            'getPrototypeOf',
            'has',
            'isExtensible',
            'ownKeys',
            'preventExtensions',
            'set',
            'setPrototypeOf'
        ];
        const handler = {};
        for (let i = 0; i < handlers.length; i++) {
            const name = handlers[i];
            handler[name] = function () {
                const args = Array.prototype.slice.call(arguments, 1);
                args.unshift(target);
                return Reflect[name].apply(Reflect, args);
            };
        }
        return handler;
    };
    const handler = createHandler(originalExports);
    const _initialize = () => { };
    const _start = () => 0;
    handler.get = function (_target, p, receiver) {
        var _a;
        if (p === 'memory') {
            return (_a = (typeof memory === 'function' ? memory() : memory)) !== null && _a !== void 0 ? _a : Reflect.get(originalExports, p, receiver);
        }
        if (p === '_initialize') {
            return p in originalExports ? _initialize : undefined;
        }
        if (p === '_start') {
            return p in originalExports ? _start : undefined;
        }
        return Reflect.get(originalExports, p, receiver);
    };
    handler.has = function (_target, p) {
        if (p === 'memory')
            return true;
        return Reflect.has(originalExports, p);
    };
    const exportsProxy = new Proxy(Object.create(null), handler);
    return new Proxy(instance, {
        get(target, p, receiver) {
            if (p === 'exports') {
                return exportsProxy;
            }
            return Reflect.get(target, p, receiver);
        }
    });
}

exports.MessageHandler = MessageHandler;
exports.ThreadManager = ThreadManager;
exports.WASIThreads = WASIThreads;
exports.createInstanceProxy = createInstanceProxy;
