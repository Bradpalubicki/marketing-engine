import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.META_USER_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'META_USER_ACCESS_TOKEN not configured' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`,
      { next: { revalidate: 0 } }
    )

    const data = (await res.json()) as { id?: string; name?: string; error?: { message: string } }

    if (!res.ok || data.error) {
      return NextResponse.json(
        { success: false, error: data.error?.message ?? 'Meta API error' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, id: data.id, name: data.name })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
