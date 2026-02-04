import { PrismaClient } from "@prisma/client"

// singleton pattern
declare global {
    var prismaClient: PrismaClient | undefined
}

const prismaClient = global.prismaClient || new PrismaClient()


if(process.env.NODE_ENV === "development") global.prismaClient = prismaClient


export default prismaClient