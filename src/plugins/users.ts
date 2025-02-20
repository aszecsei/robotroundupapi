import Hapi from '@hapi/hapi'
import Boom from '@hapi/boom'
import Joi from 'joi'
import { hashPassword, verifyPassword } from '../helpers/hash'
import { randomUUID } from 'crypto'
import { request } from 'http'

interface ICreateUserPayload {
    deviceId: string,
}

const createUserHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const payload = request.payload as ICreateUserPayload

    try {
        const createdUser = await prisma.user.create({
            data: {
                deviceId: payload.deviceId,
                transfer: randomUUID(),
            },
            select: {
                id: true,
            }
        })
        return h.response(createdUser).code(201)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

interface ISetHandlerPayload {
    password: string,
}
const setUserPasswordHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const payload = request.payload as ISetHandlerPayload
    const deviceId = request.headers['authorization']

    try {
        const user = await prisma.user.findUnique({ where: { deviceId: deviceId } })
        if (!user) {
            return Boom.unauthorized()
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashPassword(payload.password)
            }
        })
        return h.response().code(200)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

interface ITransferHandlerPayload {
    transfer: string,
    password: string,
    deviceId: string,
}

const transferHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const payload = request.payload as ITransferHandlerPayload

    try {
        const user = await prisma.user.findUnique({ where: { transfer: payload.transfer } })
        if (!user) {
            return Boom.badRequest()
        }

        if (user.password && !verifyPassword(payload.password, user.password)) {
            return Boom.unauthorized()
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                deviceId: payload.deviceId,
            }
        })
        return h.response().code(200)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

const getCitizenshipHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const id = parseInt(request.params.id)

    try {
        const user = await prisma.user.findUnique({ where: { id: id } })
        if (!user) {
            return Boom.notFound()
        }

        let citizenship = 'none'
        if (user.supercitizen) {
            citizenship = 'supercitizen'
        } else if (user.citizen) {
            citizenship = 'citizen'
        }
        
        return h.response({ citizenship }).code(200)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

const usersPlugin: Hapi.Plugin<undefined> = {
    name: 'app/users',
    dependencies: ['prisma'],
    register: async (server: Hapi.Server) => {
        server.validator(Joi)
        server.route({
            method: 'POST',
            path: '/users',
            handler: createUserHandler,
            options: {
                tags: ['api'],
                validate: {
                    payload: {
                        deviceId: Joi.string().min(3).required()
                    }
                }
            }
        })
        server.route({
            method: 'PUT',
            path: '/users',
            handler: transferHandler,
            options: {
                tags: ['api'],
                validate: {
                    payload: {
                        transfer: Joi.string().required(),
                        password: Joi.string(),
                        deviceId: Joi.string().min(3).required()
                    }
                }
            }
        })

        server.route({
            method: 'POST',
            path: '/users/setpassword',
            handler: setUserPasswordHandler,
            options: {
                tags: ['api'],
                validate: {
                    payload: {
                        password: Joi.string().min(8).required()
                    },
                    headers: Joi.object({
                        'authorization': Joi.string().required()
                    }).unknown()
                }
            }
        })

        server.route({
            method: 'GET',
            path: '/citizenship/{id}',
            handler: getCitizenshipHandler,
            options: {
                tags: ['api'],
                validate: {
                    params: Joi.object({
                        id: Joi.number().integer().min(1)
                    }).unknown()
                }
            }
        })
    }
}

export default usersPlugin