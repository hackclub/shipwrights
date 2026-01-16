import { Form } from './form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <Form assignmentId={id} />
}
