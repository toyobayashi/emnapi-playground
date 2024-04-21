let ModulePromise

function runEmscripten() {
  let emnapi, emnapiPlayground

  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    emnapi = require('@emnapi/runtime')
    emnapiPlayground = require('./cmakebuild/wasm32-emscripten/playground.js')
  } else {
    emnapi = globalThis.emnapi
    emnapiPlayground = globalThis.emnapiPlayground
  }

  if (!ModulePromise) {
    ModulePromise = emnapiPlayground().then(Module => {
      // cannot mount to '/'
      Module.FS.mkdir('/root');
      if (ENVIRONMENT_IS_NODE) {
        Module.FS.mount(Module.NODEFS, { root: __dirname }, '/root')
      }
      return Module
    })
  }

  ModulePromise.then(Module => {
    const binding = Module.emnapiInit({
      context: emnapi.getDefaultContext()
    })

    const { writeFileSync, readFileAsync, mkdirSync } = binding
    mkdirSync('/root/out')
    mkdirSync('/root/out/emscripten')
    const filepath = '/root/out/emscripten/text.txt'
    writeFileSync(filepath, 'hello world')

    readFileAsync(filepath).then(res => {
      console.log(new TextDecoder().decode(res))
    })
  })
}

if (typeof document !== 'undefined') {
  document.getElementById('runEmscripten').addEventListener('click', () => {
    runEmscripten()
  })
} else {
  runEmscripten()
}
