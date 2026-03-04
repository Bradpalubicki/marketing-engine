import { inngest } from '../client'
import { supabaseAdmin } from '@/lib/supabase'
import twilio from 'twilio'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function getTwilioClient(): twilio.Twilio {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

async function sendSMS(to: string, body: string): Promise<void> {
  const client = getTwilioClient()
  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
    body,
  })
}

async function logNurtureEvent(
  leadId: string,
  step: number,
  type: 'sms' | 'email' | 'retargeting_audience' | 'internal_alert',
  status: 'sent' | 'failed' | 'skipped',
  content?: string
): Promise<void> {
  await supabaseAdmin.from('nurture_events').insert({
    lead_id: leadId,
    step,
    type,
    status,
    content,
    sent_at: new Date().toISOString(),
  })
}

async function getLeadStatus(leadId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('status, nurture_paused')
    .eq('id', leadId)
    .single()
  if (!data) return 'not_found'
  if (data.nurture_paused) return 'paused'
  return data.status as string
}

export const leadNurture = inngest.createFunction(
  { id: 'lead-nurture', name: 'Lead Nurture Sequence' },
  { event: 'lead/created' },
  async ({ event, step }) => {
    const { leadId, firstName, phone, email, locationName, bookingLink, managerId } = event.data as {
      leadId: string
      firstName: string
      phone: string
      email?: string
      locationName: string
      bookingLink: string
      managerId?: string
    }

    await step.sleep('wait-for-data', '5s')

    const smsBody = `Hi ${firstName}, thanks for reaching out to ${locationName}. Book your free consultation: ${bookingLink}`

    await step.run('send-initial-sms', async () => {
      try {
        await sendSMS(phone, smsBody)
        await logNurtureEvent(leadId, 1, 'sms', 'sent', smsBody)
        await supabaseAdmin.from('leads').update({ nurture_sequence_step: 1, status: 'contacted' }).eq('id', leadId)
      } catch (err) {
        await logNurtureEvent(leadId, 1, 'sms', 'failed', String(err))
      }
    })

    await step.sleep('wait-2-hours', '2h')

    await step.run('send-followup-email', async () => {
      const status = await getLeadStatus(leadId)
      if (status === 'paused' || (status !== 'new' && status !== 'contacted')) return { skipped: true }

      if (!email) {
        await logNurtureEvent(leadId, 2, 'email', 'skipped', 'No email provided')
        return { skipped: true }
      }

      try {
        await resend.emails.send({
          from: 'noreply@nustack.digital',
          to: email,
          subject: `Book your free consultation at ${locationName}`,
          html: `
            <h2>Hi ${firstName},</h2>
            <p>We noticed you reached out to ${locationName}. We'd love to help you on your wellness journey.</p>
            <p><a href="${bookingLink}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Book Your Free Consultation</a></p>
            <p>Questions? Reply to this email or call us directly.</p>
          `,
        })
        await logNurtureEvent(leadId, 2, 'email', 'sent', `Booking link: ${bookingLink}`)
        await supabaseAdmin.from('leads').update({ nurture_sequence_step: 2 }).eq('id', leadId)
        return { sent: true }
      } catch (err) {
        await logNurtureEvent(leadId, 2, 'email', 'failed', String(err))
        return { error: String(err) }
      }
    })

    await step.sleep('wait-24-hours', '22h')

    await step.run('fire-retarget-event', async () => {
      const status = await getLeadStatus(leadId)
      if (status === 'paused' || (status !== 'new' && status !== 'contacted')) return { skipped: true }

      await inngest.send({ name: 'lead/retarget', data: { leadId, locationName } })
      await logNurtureEvent(leadId, 3, 'retargeting_audience', 'sent', 'Retarget event fired')
      await supabaseAdmin.from('leads').update({ nurture_sequence_step: 3 }).eq('id', leadId)
      return { fired: true }
    })

    await step.sleep('wait-72-hours', '48h')

    await step.run('internal-alert', async () => {
      const status = await getLeadStatus(leadId)
      if (status === 'paused' || (status !== 'new' && status !== 'contacted')) return { skipped: true }

      const alertEmail = managerId ?? 'brad@nustack.digital'
      try {
        await resend.emails.send({
          from: 'noreply@nustack.digital',
          to: alertEmail,
          subject: `[Alert] Uncontacted lead at ${locationName}`,
          html: `
            <p>Lead <strong>${firstName}</strong> has not been reached after 72 hours.</p>
            <p>Phone: ${phone}</p>
            ${email ? `<p>Email: ${email}</p>` : ''}
            <p>Please follow up directly.</p>
          `,
        })
        await logNurtureEvent(leadId, 4, 'internal_alert', 'sent', `Alert sent to ${alertEmail}`)
        await supabaseAdmin.from('leads').update({ nurture_sequence_step: 4 }).eq('id', leadId)
      } catch (err) {
        await logNurtureEvent(leadId, 4, 'internal_alert', 'failed', String(err))
      }
    })

    await step.sleep('wait-7-days', '4d')

    await step.run('final-reengagement-sms', async () => {
      const status = await getLeadStatus(leadId)
      if (status === 'paused' || (status !== 'new' && status !== 'contacted')) return { skipped: true }

      const finalSMS = `Still interested in ${locationName}? Reply YES for a callback or STOP to opt out.`
      try {
        await sendSMS(phone, finalSMS)
        await logNurtureEvent(leadId, 5, 'sms', 'sent', finalSMS)
        await supabaseAdmin.from('leads').update({ nurture_sequence_step: 5 }).eq('id', leadId)
      } catch (err) {
        await logNurtureEvent(leadId, 5, 'sms', 'failed', String(err))
      }
    })

    return { completed: true, leadId }
  }
)
