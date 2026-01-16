import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { getOne } from '@/lib/ysws'
import { Review } from './review'

interface Props {
  params: Promise<{ id: string }>
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

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <Review data={review} canEdit={can(user.role, PERMS.ysws_edit)} />
    </main>
  )
}
