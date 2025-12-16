import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user, apiKey } = auth

  if (apiKey.type === 'test') {
    return NextResponse.json({
      id: params.id,
      status: 'SUCCEEDED',
      resultImageUrl: 'https://placehold.co/1024x1024.png?text=Mock+Result',
      createdAt: new Date().toISOString()
    })
  }

  const generation = await prisma.generation.findUnique({
    where: { id: params.id }
  })

  if (!generation) {
    return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
  }

  if (generation.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    id: generation.id,
    status: generation.status,
    resultImageUrl: generation.resultImageUrl,
    createdAt: generation.createdAt,
    prompt: generation.prompt
  })
}
