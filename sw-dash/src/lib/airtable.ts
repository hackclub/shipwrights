import Airtable from 'airtable'

const pat = process.env.AIRTABLE_PAT
const baseId = process.env.AIRTABLE_BASE_ID
const tableName = process.env.AIRTABLE_TABLE_NAME || 'Projects'
const emailField = process.env.AIRTABLE_EMAIL_FIELD || 'Email'

export async function fetchProjectCountsByEmail(): Promise<Map<string, number>> {
  if (!pat || !baseId) {
    throw new Error('missing AIRTABLE_PAT or AIRTABLE_BASE_ID')
  }

  const base = new Airtable({ apiKey: pat }).base(baseId)
  const counts = new Map<string, number>()

  await new Promise<void>((resolve, reject) => {
    base(tableName)
      .select({ fields: [emailField], pageSize: 100 })
      .eachPage(
        (records, fetchNextPage) => {
          for (const record of records) {
            const email = record.get(emailField)
            if (typeof email === 'string' && email.trim()) {
              const normalized = email.trim().toLowerCase()
              counts.set(normalized, (counts.get(normalized) || 0) + 1)
            }
          }
          fetchNextPage()
        },
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
  })

  return counts
}
