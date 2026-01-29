'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function generateProjectSummary(
    shipCertId: number,
    projectDetails: {
        projectName: string
        projectType: string
        readmeUrl: string
        demoUrl: string
        repoUrl: string
    }
) {
    try {
        let readmeContent = ''
        if (projectDetails.readmeUrl) {
            try {
                const readmeRes = await fetch(projectDetails.readmeUrl)
                if (readmeRes.ok) {
                    readmeContent = await readmeRes.text()
                }
            } catch (e) {
                console.error('Failed to fetch README:', e)
            }
        }

        const response = await fetch('http://localhost:45200/projects/summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.SW_API_KEY || '',
            },
            body: JSON.stringify({
                ...projectDetails,
                readmeContent,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to generate summary')
        }

        const data = await response.json()
        const summary = data.summary

        await prisma.shipCert.update({
            where: { id: shipCertId },
            data: { aiSummary: summary },
        })

        revalidatePath(`/admin/ship_certifications/${shipCertId}/edit`)
        return { success: true, summary }
    } catch (error) {
        console.error('Error generating summary:', error)
        return { success: false, error: (error as Error).message }
    }
}
