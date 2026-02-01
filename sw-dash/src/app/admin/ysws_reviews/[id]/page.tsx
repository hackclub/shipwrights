import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { getOne } from '@/lib/ysws'
import { Review } from './review'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const r = await getOne(parseInt(id, 10))
  return { title: r?.shipCert?.projectName || 'YSWS' }
}

export default async function YswsPage({ params }: Props) {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.ysws_view)) redirect('/admin')

  const { id } = await params
  const yswsId = parseInt(id, 10)
  if (isNaN(yswsId)) notFound()

  const review = await getOne(yswsId)
  if (!review) notFound()

  const showFraud = can(user.role, PERMS.billy_btn) || can(user.role, PERMS.joe_btn)
  const data = { ...review, fraudUrls: showFraud ? review.fraudUrls : null }

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <Review data={data} canEdit={can(user.role, PERMS.ysws_edit)} />
    </main>
  )
}
