const path = require('node:path')
const { writeFileSync, readFileAsync, mkdirSync } = require('./build/Release/playground.node')

mkdirSync(path.join(__dirname, 'out'))
mkdirSync(path.join(__dirname, 'out/native'))
const filepath = path.join(__dirname, 'out/native/text.txt')
writeFileSync(filepath, 'hello world')

readFileAsync(filepath).then(res => {
  console.log(new TextDecoder().decode(res))
})
