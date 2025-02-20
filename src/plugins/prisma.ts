import { PrismaClient } from '@prisma/client'
import Hapi from '@hapi/hapi'

declare module '@hapi/hapi' {
  interface ServerApplicationState {
    prisma: PrismaClient
  }
}

const prismaPlugin: Hapi.Plugin<void> = {
  name: 'prisma',
  register: async (server: Hapi.Server) => {
    const prisma = new PrismaClient()

    server.app.prisma = prisma

    server.ext({
      type: 'onPostStop',
      method: async () => {
        await prisma.$disconnect()
      },
    })
  },
}
export default prismaPlugin
