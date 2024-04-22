(function () {
  let fs, WASI, emnapiCore

  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    const nodeWorkerThreads = require('worker_threads')

    const parentPort = nodeWorkerThreads.parentPort

    parentPort.on('message', (data) => {
      globalThis.onmessage({ data })
    })

    fs = require('fs')

    Object.assign(globalThis, {
      self: globalThis,
      require,
      Worker: nodeWorkerThreads.Worker,
      importScripts: function (f) {
        (0, eval)(fs.readFileSync(f, 'utf8') + '//# sourceURL=' + f)
      },
      postMessage: function (msg) {
        parentPort.postMessage(msg)
      }
    })

    WASI = require('node:wasi').WASI
    emnapiCore = require('@emnapi/core')
    root = __dirname
  } else {
    importScripts('./lib/base64js.min.js')
    importScripts('./lib/ieee754.js')
    importScripts('./lib/buffer.js')
    importScripts('./node_modules/memfs-browser/dist/memfs.js')
    importScripts('./node_modules/@tybys/wasm-util/dist/wasm-util.js')
    importScripts('./node_modules/@emnapi/core/dist/emnapi-core.js')
    emnapiCore = globalThis.emnapiCore
    root = '/'

    fs = new Proxy({}, {
      get (target, p, receiver) {
        return function () {
          const sab = new SharedArrayBuffer(16 + 1024)
          const i32arr = new Int32Array(sab)
          Atomics.store(i32arr, 0, 21)

          postMessage({
            __fs__: {
              sab: i32arr,
              type: p,
              payload: Array.prototype.slice.call(arguments)
            }
          })

          Atomics.wait(i32arr, 0, 21)

          const status = Atomics.load(i32arr, 0)
          const type = Atomics.load(i32arr, 1)
          const size = Atomics.load(i32arr, 2)
          const content = new Uint8Array(sab, 16, size)
          if (status === 1) {
            const errobj = JSON.parse(new TextDecoder().decode(content.slice()))
            const err = new Error(errobj.message)
            Object.defineProperty(err, 'stack', {
              configurable: true,
              enumerable: false,
              writable: true,
              value: errobj.stack
            })
            Object.keys(errobj).filter((k) => k !== 'message' && k !== 'stack').forEach((k) => {
              err[k] = errobj[k]
            })
            throw err
          }
          if (type === 0) return undefined
          if (type === 1) return null
          if (type === 2) return Boolean(content[0])
          if (type === 3) return new Float64Array(sab, 16, 1)[0]
          if (type === 4) return new TextDecoder().decode(content.slice())
          if (type === 6) {
            const obj = JSON.parse(new TextDecoder().decode(content.slice()), (_key, value) => {
              if (typeof value === 'string') {
                const matched = value.match(/^BigInt\((-?\d+)\)$/)
                if (matched && matched[1]) {
                  return BigInt(matched[1])
                }
              }
              return value
            })
            if (obj.__constructor__) {
              const ctor = obj.__constructor__
              delete obj.__constructor__
              Object.setPrototypeOf(obj, memfs[ctor].prototype)
            }
            return obj
          }
          if (type === 9) return new BigInt64Array(sab, 16, 1)[0]
          throw new Error('unsupported data')
        }
      }
    })

    WASI = globalThis.wasmUtil.WASI
  }

  const { instantiateNapiModuleSync, MessageHandler } = emnapiCore

  const handler = new MessageHandler({
    onLoad ({ wasmModule, wasmMemory }) {
      const wasi = new WASI({
        version: 'preview1',
        preopens: {
          '/': root
        },
        fs
      })

      return instantiateNapiModuleSync(wasmModule, {
        childThread: true,
        wasi,
        overwriteImports (importObject) {
          importObject.env.memory = wasmMemory
        }
      })
    }
  })

  globalThis.onmessage = function (e) {
    handler.handle(e)
    // handle other messages
  }
})()
