import Hapi from '@hapi/hapi'
import Boom from '@hapi/boom'
import Joi from 'joi'
import { request } from 'http'

const getRandomUnjudgedPostHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const deviceId = request.headers['authorization']

    try {
        const user = await prisma.user.findUnique({ where: { deviceId: deviceId } })
        if (!user) {
            return Boom.unauthorized()
        }

        // Find unjudged posts that were not authored by the user, preferring older posts
        const unjudgedPosts = prisma.post.findMany({
            take: 250,
            orderBy: { id: 'asc' },
            where: { judgments: { none: {} }, AND: { NOT: { authorId: user.id } } },
        })

        // Find recent posts that:
        // - Were not authored by the user
        // - Have not been judged by the user
        // - Have not been judged as "not human" by any other user (to prevent "brigading")
        const recentPosts = prisma.post.findMany({
            take: 50,
            orderBy: { id: 'desc' },
            where: { NOT: { authorId: user.id }, judgments: { none: { OR: [ { verdict: false }, { judgeId: user.id } ] } } },
        })

        const posts = [...await unjudgedPosts, ...await recentPosts]
        if (posts.length === 0) {
            return h.response({}).code(204)
        }

        const randomIndex = Math.floor(Math.random() * posts.length)
        return h.response(posts[randomIndex]).code(200)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

interface IJudgePostPayload {
    isHuman: boolean,
}
const judgePostHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const payload = request.payload as IJudgePostPayload
    const id = parseInt(request.params.id)
    const deviceId = request.headers['authorization']

    try {
        const user = await prisma.user.findUnique({ where: { deviceId: deviceId } })
        if (!user) {
            return Boom.unauthorized()
        }
        if (!user.citizen) {
            return Boom.forbidden()
        }

        const post = await prisma.post.findUnique({ where: { id: id } })
        if (!post) {
            return Boom.notFound()
        }

        if (payload.isHuman) {
            // Grant citizenship to the author.
            await prisma.user.updateMany({
                where: { id: post.authorId, version: post.version },
                data: {
                    citizen: true,
                }
            })
        } else {
            // "Exile" the author by revoking their citizenship and incrementing their version
            // This means their citizenship will only be judged based on posts created after this one
            await prisma.user.updateMany({
                where: { id: post.authorId, version: post.version },
                data: {
                    citizen: false,
                    version: { increment: 1 }
                }
            })
        }

        const judgment = await prisma.judgment.create({
            data: {
                judgeId: user.id,
                postId: post.id,
                verdict: payload.isHuman,
            }
        })

        return h.response(judgment)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

const judgmentPlugin: Hapi.Plugin<undefined> = {
    name: 'app/judgments',
    dependencies: ['prisma'],
    register: async (server: Hapi.Server) => {
        server.route({
            method: 'GET',
            path: '/judge/post',
            handler: getRandomUnjudgedPostHandler,
            options: {
                tags: ['api'],
                validate: {
                    headers: Joi.object({
                        'authorization': Joi.string().required()
                    }).unknown()
                }
            }
        })

        server.route({
            method: 'POST',
            path: '/judge/post/{id}',
            handler: judgePostHandler,
            options: {
                tags: ['api'],
                validate: {
                    payload: Joi.object({
                        isHuman: Joi.boolean().required()
                    }),
                    headers: Joi.object({
                        'authorization': Joi.string().required()
                    }).unknown(),
                    params: Joi.object({
                        id: Joi.number().integer().min(1)
                    }).unknown()
                }
            }
        })
    }
}

export default judgmentPlugin