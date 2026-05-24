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

const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD']
const ALLOWED_MODES = ['auto', 'manual']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Partial<InvoiceSettings>
  try {
    body = await req.json() as Partial<InvoiceSettings>
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Validate enums and numeric ranges
  const mode = body.mode ?? 'auto'
  if (!ALLOWED_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 })
  }
  const currency = body.currency ?? 'EUR'
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency.' }, { status: 400 })
  }
  const taxRate = body.tax_rate ?? 20
  if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 100) {
    return NextResponse.json({ error: 'Invalid tax rate.' }, { status: 400 })
  }
  // Reject non-HTTPS logo URLs to prevent mixed-content and SSRF
  if (body.logo_url && !/^https:\/\//i.test(body.logo_url)) {
    return NextResponse.json({ error: 'logo_url must be an HTTPS URL.' }, { status: 400 })
  }
  if (body.template_file_url && !/^https:\/\//i.test(body.template_file_url)) {
    return NextResponse.json({ error: 'template_file_url must be an HTTPS URL.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('invoice_settings')
    .upsert({
      user_id: user.id,
      mode,
      business_name: body.business_name ?? null,
      address: body.address ?? null,
      siret: body.siret ?? null,
      vat_number: body.vat_number ?? null,
      logo_url: body.logo_url ?? null,
      payment_terms: body.payment_terms ?? '30 jours net',
      currency,
      tax_rate: taxRate,
      template_file_url: body.template_file_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 })
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
