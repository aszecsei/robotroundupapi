import Hapi from '@hapi/hapi'
import Boom from '@hapi/boom'
import Joi from 'joi'

interface ICreatePostPayload {
    content: string,
}

const createPostHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const payload = request.payload as ICreatePostPayload
    const deviceId = request.headers['authorization']

    try {
        const user = await prisma.user.findUnique({ where: { deviceId: deviceId } })
        if (!user) {
            return Boom.unauthorized()
        }

        const createdPost = await prisma.post.create({
            data: {
                content: payload.content,
                author: { connect: { id: user.id } },
                version: user.version,
            },
            select: {
                id: true,
            }
        })
        return h.response(createdPost).code(201)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

interface IGetPostsQuery {
    cursor?: number,
    citizens?: boolean,
}
const getPostsHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const query = request.query as IGetPostsQuery

    try {
        const posts = await prisma.post.findMany({
            take: -20,
            skip: query.cursor ? 1 : 0,
            cursor: query.cursor ? { id: query.cursor } : undefined,
            where: query.citizens !== undefined ? { author: { citizen: query.citizens } } : undefined,
            orderBy: { id: 'asc' }
        })
        return h.response(posts).code(200)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

const getPostHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { prisma } = request.server.app
    const id = parseInt(request.params.id)

    try {
        const post = await prisma.post.findUnique({ where: { id } })
        if (!post) {
            return Boom.notFound()
        }
        return h.response(post).code(200)
    } catch (err) {
        console.error(err)
        return Boom.internal()
    }
}

const postsPlugin: Hapi.Plugin<undefined> = {
    name: 'app/posts',
    dependencies: ['prisma'],
    register: async (server: Hapi.Server) => {
        server.route({
            method: 'POST',
            path: '/posts',
            handler: createPostHandler,
            options: {
                tags: ['api'],
                validate: {
                    payload: Joi.object({
                        content: Joi.string().required()
                    }),
                    headers: Joi.object({
                        'authorization': Joi.string().required()
                    }).unknown()
                }
            }
        })

        server.route({
            method: 'GET',
            path: '/posts',
            handler: getPostsHandler,
            options: {
                tags: ['api'],
                validate: {
                    query: Joi.object({
                        cursor: Joi.number().integer().min(1),
                        citizens: Joi.boolean(),
                    }).unknown()
                }
            }
        })

        server.route({
            method: 'GET',
            path: '/posts/{id}',
            handler: getPostHandler,
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

export default postsPlugin