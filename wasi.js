let modulePromise

function runWasi() {
  let fs, WASI, emnapiCore, emnapiRuntime, root, Worker, wasmInput, workerInput, memfs, memfsExports

  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    fs = require('fs')
    WASI = require('node:wasi').WASI
    emnapiCore = require('@emnapi/core')
    emnapiRuntime = require('@emnapi/runtime')
    wasmInput = fs.readFileSync(require('path').join(__dirname, './cmakebuild/wasm32-wasip1-threads/playground.wasm'))
    workerInput = require('path').join(__dirname, './worker.js')
    root = __dirname
    Worker = require('worker_threads').Worker
  } else {
    emnapiCore = globalThis.emnapiCore
    emnapiRuntime = globalThis.emnapi
    wasmInput = fetch('./cmakebuild/wasm32-wasip1-threads/playground.wasm')
    root = '/'
    workerInput = './worker.js'
    Worker = globalThis.Worker
    memfs = globalThis.memfs

    const { Volume, createFsFromVolume } = memfs

    fs = createFsFromVolume(Volume.fromJSON({
      '/': null
    }))

    // const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
    // const dir = await navigator.storage.getDirectory()
    // console.log(dir)
    // const { FsaNodeFs, FsaNodeSyncAdapterWorker } = memfsFsaToNode
    // const adapter = await FsaNodeSyncAdapterWorker.start('./fsworker.js', dir);
    // fs = new FsaNodeFs(dir, adapter);

    WASI = globalThis.wasmUtil.WASI
  }

  if (memfs) {
    memfsExports = Object.entries(memfs)
  }
  const getType = (value) => {
    if (value === undefined) return 0
    if (value === null) return 1
    const t = typeof value
    if (t === 'boolean') return 2
    if (t === 'number') return 3
    if (t === 'string') return 4
    if (t === 'object') return 6
    if (t === 'bigint') return 9
    return -1
  }

  const encodeValue = (value, type) => {
    switch (type) {
      case 0:
      case 1:
        return new Uint8Array(0)
      case 2: {
        const view = new Int32Array(1)
        view[0] = value ? 1 : 0
        return new Uint8Array(view.buffer)
      }
      case 3: {
        const view = new Float64Array(1)
        view[0] = value
        return new Uint8Array(view.buffer)
      }
      case 4: {
        const view = new TextEncoder().encode(value)
        return view
      }
      case 6: {
        const entry = memfsExports.filter(([k, v]) => v === value.constructor)[0]
        console.log(entry)
        if (entry) {
          Object.defineProperty(value, '__constructor__', {
            configurable: true,
            writable: true,
            enumerable: true,
            value: entry[0]
          })
        }

        const json = JSON.stringify(value, (key, value) => {
          if (typeof value === 'bigint') {
            return Number(value)
          }
          return value
        })
        const view = new TextEncoder().encode(json)
        return view
      }
      case 9: {
        const view = new BigInt64Array(1)
        view[0] = value
        return new Uint8Array(view.buffer)
      }
    }
  }

  const { instantiateNapiModule } = emnapiCore
  const wasmMemory = new WebAssembly.Memory({
    initial: 16777216 / 65536,
    maximum: 2147483648 / 65536,
    shared: true
  })

  if (!modulePromise) {
    modulePromise = instantiateNapiModule(wasmInput, {
      context: emnapiRuntime.getDefaultContext(),
      wasi: new WASI({
        version: 'preview1',
        preopens: {
          '/': root
        },
        fs
      }),
      overwriteImports (importObject) {
        importObject.env.memory = wasmMemory
      },
      onCreateWorker () {
        const onMessage = function (e) {
          if (e.data.__fs__) {
            /**
             * @type {Int32Array}
             * 0..4                    status(int32_t):        21(waiting) 0(success) 1(error)
             * 4..8                    type(napi_valuetype):   0(undefined) 1(null) 2(boolean) 3(number) 4(string) 6(jsonstring) 9(bigint) -1(unsupported)
             * 8..16                   payload_size(uint32_t)  <= 1024
             * 16..16 + payload_size   payload_content
             */
            const { sab, type, payload } = e.data.__fs__
            const fn = fs[type]
            let ret
            const args = payload ? payload.map((value) => {
              if (value instanceof Uint8Array) {
                // buffer polyfill bug
                value._isBuffer = true
              }
              return value
            }) : payload
            try {
              ret = fn.apply(fs, args)
            } catch (err) {
              Atomics.store(sab, 0, 1)
              Atomics.store(sab, 1, 6)
              const payloadContent = new TextEncoder().encode(JSON.stringify({
                ...err,
                message: err.message,
                stack: err.stack
              }))
              Atomics.store(sab, 2, payloadContent.length)
              new Uint8Array(sab.buffer).set(payloadContent, 16)
              Atomics.notify(sab, 0)
              return
            }
            const t = getType(ret)
            const v = encodeValue(ret, t)
            Atomics.store(sab, 0, 0)
            Atomics.store(sab, 1, t)
            Atomics.store(sab, 2, v.length)
            new Uint8Array(sab.buffer).set(v, 16)
            Atomics.notify(sab, 0)
          }
        }
        let worker
        if (ENVIRONMENT_IS_NODE) {
          worker = new Worker(workerInput, {
            env: process.env,
            execArgv: ['--experimental-wasi-unstable-preview1']
          })
          worker.on('message', (data) => {
            onMessage({ data })
          })
        } else {
          worker = new Worker(workerInput)
          worker.addEventListener('message', onMessage)
        }
        return worker
      },
      asyncWorkPoolSize: 4,
    })
  }

  modulePromise.then(({ napiModule }) => {
    const { writeFileSync, readFileAsync, mkdirSync } = napiModule.exports

    mkdirSync('/out')
    mkdirSync('/out/wasi')
    const filepath = '/out/wasi/text.txt'

    writeFileSync(filepath, 'hello world')

    readFileAsync(filepath).then(res => {
      console.log(new TextDecoder().decode(res))
    })
  })
}

if (typeof document !== 'undefined') {
  document.getElementById('runWasi').addEventListener('click', () => {
    runWasi()
  })
} else {
  runWasi()
}
