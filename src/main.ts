import { init, start } from './server'

init().then(() => start())
  .catch((err) => {
    console.error(err)
  })
