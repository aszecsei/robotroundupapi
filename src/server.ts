import Hapi from '@hapi/hapi'
import { Server } from '@hapi/hapi'
import 'dotenv/config'
import prisma from './plugins/prisma'
import status from './plugins/status'
import users from './plugins/users'
import posts from './plugins/posts'
import judgment from './plugins/judgments'
import Inert from '@hapi/inert'
import Vision from '@hapi/vision'
import HapiSwagger from 'hapi-swagger'
import Pack from '../package.json'

export let server: Server

export const init = async () => {
  server = Hapi.server({
    port: process.env.PORT || 4000,
    host: 'localhost',
  })

  const swaggerOptions = {
    info: {
        title: 'Robot Roundup API Documentation',
        version: Pack.version,
    }
  }
  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions
    }
  ])

  await server.register([prisma, status, users, posts, judgment])

  return server
}

export const start = async () => {
  console.log(`Listening on ${server.info.uri}`)
  return server.start()
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})
