import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    await prisma.shipCert.deleteMany({})

    const project1 = await prisma.shipCert.create({
        data: {
            projectName: 'Machine Learning Model for Flood Detection in Karachi',
            ftProjectId: '4726',
            ftSlackId: 'U0A1HTAMWCW',
            ftUsername: 'eshangillani1',
            projectType: 'CLI',
            devTime: '2h 15m',
            description: 'Project: Machine Learning Model for Flood Detection in Karachi (FT #4726)',
            demoUrl: 'https://pypi.org/project/karachiFloodMLModel/0.1.0/',
            repoUrl: 'https://github.com/EshanGillani/MLFloodEarlyWarningSystem',
            readmeUrl: 'https://raw.githubusercontent.com/EshanGillani/MLFloodEarlyWarningSystem/main/README.md',
            status: 'pending',
        },
    })

    const project2 = await prisma.shipCert.create({
        data: {
            projectName: 'Asseto Corsa Reinforcement Learning',
            ftProjectId: '3102',
            ftSlackId: 'U07QKHJKLN6',
            ftUsername: 'ved patel',
            projectType: 'Other',
            devTime: '2h 15m',
            description: 'A reinforcement learning agent (using the SAC algorithm) learns to drive a Formula 1 car around the Monaco GP circuit in Assetto Corsa. The agent controls steering, acceleration, and braking by interacting with the track, receiving feedback, and improving over time.',
            demoUrl: 'https://assettocorsarl.github.io/AssettoCorsaRL-DOCS/install',
            repoUrl: 'https://github.com/ved-patel226/AssetoCorsaRL',
            readmeUrl: 'https://raw.githubusercontent.com/ved-patel226/AssetoCorsaRL/main/README.md',
            status: 'pending',
        },
    })

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
