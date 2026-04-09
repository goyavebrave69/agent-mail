import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceSettings } from '@/lib/quotes/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('invoice_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ settings: data ?? null })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Partial<InvoiceSettings>

  const { error } = await supabase
    .from('invoice_settings')
    .upsert({
      user_id: user.id,
      mode: body.mode ?? 'auto',
      business_name: body.business_name ?? null,
      address: body.address ?? null,
      siret: body.siret ?? null,
      vat_number: body.vat_number ?? null,
      logo_url: body.logo_url ?? null,
      payment_terms: body.payment_terms ?? '30 jours net',
      currency: body.currency ?? 'EUR',
      tax_rate: body.tax_rate ?? 20,
      template_file_url: body.template_file_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

/**
 * PATCH — increment quote sequence and return the new quote number.
 * Called when the quote dialog opens to reserve a number.
 */
export async function PATCH() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Read current sequence
  const { data: current } = await supabase
    .from('invoice_settings')
    .select('last_quote_sequence')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentSeq = (current as { last_quote_sequence: number } | null)?.last_quote_sequence ?? 0
  const nextSeq = currentSeq + 1

  await supabase
    .from('invoice_settings')
    .update({ last_quote_sequence: nextSeq, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const quoteNumber = `DEV-${yyyy}${mm}${dd}-${String(nextSeq).padStart(3, '0')}`

  return NextResponse.json({ quoteNumber, nextSequence: nextSeq })
}
