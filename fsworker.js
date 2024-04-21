importScripts('./lib/base64js.min.js')
importScripts('./lib/ieee754.js')
importScripts('./lib/buffer.js')
importScripts('./lib/fsa-to-node.js')

const { FsaNodeSyncWorker } = memfsFsaToNode

if (typeof window === 'undefined') {
  const worker = new FsaNodeSyncWorker()
  worker.start()
}
