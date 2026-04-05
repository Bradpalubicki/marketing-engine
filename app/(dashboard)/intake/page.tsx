'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOrganization } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

// ── Schemas per stage ─────────────────────────────────────────────────────────

const stage1Schema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  primary_service: z.string().min(1, 'Primary service is required'),
  service_location_city: z.string().min(1, 'City is required'),
})

const stage2Schema = z.object({
  target_cpl: z.string().optional(),
  avg_transaction_value: z.string().optional(),
  primary_offer: z.string().optional(),
  proof_point: z.string().optional(),
})

const stage3Schema = z.object({
  geographic_radius_miles: z.string().optional(),
  service_area_type: z.enum(['single-location', 'multi-location', 'regional', 'national']).optional(),
  website_url: z.string().optional(),
  phone_number: z.string().optional(),
  vertical_tag: z.string().optional(),
})

type Stage1 = z.infer<typeof stage1Schema>
type Stage2 = z.infer<typeof stage2Schema>
type Stage3 = z.infer<typeof stage3Schema>

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score, canLaunch }: { score: number; canLaunch: boolean }) {
  const color =
    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Profile Completeness</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{score}%</span>
          {canLaunch && (
            <Badge className="bg-emerald-600 text-white text-xs">Ready to Launch</Badge>
          )}
        </div>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#0f1e3a' }}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      {score < 60 && (
        <p className="text-xs text-slate-400">60% required to launch campaigns</p>
      )}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
              i < current
                ? 'bg-[#F5C842] text-[#0A1628]'
                : i === current
                ? 'bg-[#0A1628] border-2 border-[#F5C842] text-[#F5C842]'
                : 'bg-slate-800 text-slate-500'
            )}
          >
            {i + 1}
          </div>
          {i < total - 1 && (
            <div className={cn('h-0.5 w-8', i < current ? 'bg-[#F5C842]' : 'bg-slate-700')} />
          )}
        </div>
      ))}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntakePage() {
  const { organization } = useOrganization()
  const orgId = organization?.id

  const [stage, setStage] = useState(0)
  const [score, setScore] = useState(0)
  const [canLaunch, setCanLaunch] = useState(false)
  const [competitorInput, setCompetitorInput] = useState('')
  const [competitors, setCompetitors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const form1 = useForm<Stage1>({ resolver: zodResolver(stage1Schema) })
  const form2 = useForm<Stage2>({ resolver: zodResolver(stage2Schema) })
  const form3 = useForm<Stage3>({ resolver: zodResolver(stage3Schema) })

  async function saveStage(data: Record<string, unknown>) {
    if (!orgId) return
    setSaving(true)
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, ...data }),
      })
      const json = (await res.json()) as { score: number; can_launch: boolean }
      setScore(json.score ?? 0)
      setCanLaunch(json.can_launch ?? false)
    } catch {
      // non-blocking
    } finally {
      setSaving(false)
    }
  }

  async function onStage1(data: Stage1) {
    await saveStage(data)
    setStage(1)
  }

  async function onStage2(data: Stage2) {
    await saveStage({
      ...data,
      target_cpl: data.target_cpl ? Number(data.target_cpl) : undefined,
      avg_transaction_value: data.avg_transaction_value ? Number(data.avg_transaction_value) : undefined,
    })
    setStage(2)
  }

  async function onStage3(data: Stage3) {
    await saveStage({
      ...data,
      geographic_radius_miles: data.geographic_radius_miles ? Number(data.geographic_radius_miles) : undefined,
      competitor_names: competitors,
    })
    setStage(3)
  }

  function addCompetitor() {
    if (competitorInput.trim() && competitors.length < 5) {
      setCompetitors(prev => [...prev, competitorInput.trim()])
      setCompetitorInput('')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Intelligence Profile</h1>
          <p className="text-slate-400 text-sm mt-1">
            Complete your profile to unlock campaign launch. Takes 5 minutes.
          </p>
        </div>

        <Card className="bg-[#0f1e3a] border-slate-700">
          <CardContent className="pt-4">
            <ScoreBar score={score} canLaunch={canLaunch} />
          </CardContent>
        </Card>

        <StepIndicator current={stage} total={3} />

        {/* Stage 0 — Basics */}
        {stage === 0 && (
          <Card className="bg-[#0f1e3a] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Business Basics</CardTitle>
              <CardDescription className="text-slate-400">
                Tell us about your business so we can build the right campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form1.handleSubmit(onStage1)} className="space-y-4">
                <div>
                  <Label className="text-slate-200">Business Name</Label>
                  <Input
                    {...form1.register('business_name')}
                    placeholder="e.g. Peak Men&apos;s Health"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                  <FieldError message={form1.formState.errors.business_name?.message} />
                </div>
                <div>
                  <Label className="text-slate-200">Primary Service</Label>
                  <Input
                    {...form1.register('primary_service')}
                    placeholder="e.g. HVAC Repair and Installation"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                  <FieldError message={form1.formState.errors.primary_service?.message} />
                </div>
                <div>
                  <Label className="text-slate-200">Primary City</Label>
                  <Input
                    {...form1.register('service_location_city')}
                    placeholder="e.g. Phoenix, AZ"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                  <FieldError message={form1.formState.errors.service_location_city?.message} />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#F5C842] text-[#0A1628] font-semibold hover:bg-[#e0b535]"
                >
                  {saving ? 'Saving...' : 'Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Stage 1 — Economics */}
        {stage === 1 && (
          <Card className="bg-[#0f1e3a] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Campaign Economics</CardTitle>
              <CardDescription className="text-slate-400">
                These numbers drive smart bidding. Be as accurate as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form2.handleSubmit(onStage2)} className="space-y-4">
                <div>
                  <Label className="text-slate-200">Target Cost Per Lead ($)</Label>
                  <Input
                    {...form2.register('target_cpl')}
                    type="number"
                    placeholder="e.g. 45"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Avg Transaction Value ($)</Label>
                  <Input
                    {...form2.register('avg_transaction_value')}
                    type="number"
                    placeholder="e.g. 850"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Primary Offer</Label>
                  <Input
                    {...form2.register('primary_offer')}
                    placeholder="e.g. Free AC tune-up with any repair"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Proof Point</Label>
                  <Input
                    {...form2.register('proof_point')}
                    placeholder="e.g. 4.9 stars, 600+ reviews"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStage(0)}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-[#F5C842] text-[#0A1628] font-semibold hover:bg-[#e0b535]"
                  >
                    {saving ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Stage 2 — Market */}
        {stage === 2 && (
          <Card className="bg-[#0f1e3a] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Market Intelligence</CardTitle>
              <CardDescription className="text-slate-400">
                Who are you competing against? Where do you serve?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form3.handleSubmit(onStage3)} className="space-y-4">
                <div>
                  <Label className="text-slate-200">Competitors (up to 5)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={competitorInput}
                      onChange={e => setCompetitorInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCompetitor()
                        }
                      }}
                      placeholder="Competitor name"
                      className="bg-[#0A1628] border-slate-600 text-white"
                      disabled={competitors.length >= 5}
                    />
                    <Button
                      type="button"
                      onClick={addCompetitor}
                      disabled={competitors.length >= 5}
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  {competitors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {competitors.map((c, i) => (
                        <Badge
                          key={i}
                          className="bg-slate-700 text-slate-200 cursor-pointer hover:bg-red-900"
                          onClick={() => setCompetitors(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          {c} &times;
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-slate-200">Service Radius (miles)</Label>
                  <Input
                    {...form3.register('geographic_radius_miles')}
                    type="number"
                    placeholder="e.g. 25"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-slate-200">Service Area Type</Label>
                  <Select
                    onValueChange={val =>
                      form3.setValue('service_area_type', val as Stage3['service_area_type'])
                    }
                  >
                    <SelectTrigger className="bg-[#0A1628] border-slate-600 text-white mt-1">
                      <SelectValue placeholder="Select area type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f1e3a] border-slate-600 text-white">
                      <SelectItem value="single-location">Single Location</SelectItem>
                      <SelectItem value="multi-location">Multi Location</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-200">Website URL</Label>
                  <Input
                    {...form3.register('website_url')}
                    placeholder="https://yoursite.com"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-slate-200">Phone Number</Label>
                  <Input
                    {...form3.register('phone_number')}
                    placeholder="(555) 555-5555"
                    className="bg-[#0A1628] border-slate-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-slate-200">Industry Vertical</Label>
                  <Select onValueChange={val => form3.setValue('vertical_tag', val)}>
                    <SelectTrigger className="bg-[#0A1628] border-slate-600 text-white mt-1">
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f1e3a] border-slate-600 text-white">
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="dental">Dental</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="healthcare_mens">Men&apos;s Health</SelectItem>
                      <SelectItem value="home_services">Home Services</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStage(1)}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-[#F5C842] text-[#0A1628] font-semibold hover:bg-[#e0b535]"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Complete */}
        {stage === 3 && (
          <Card className="bg-[#0f1e3a] border-slate-700">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="text-4xl text-white font-bold">
                {canLaunch ? '✓' : '○'}
              </div>
              <h2 className="text-xl font-bold text-white">
                {canLaunch ? 'Profile Complete — Ready to Launch' : 'Profile Saved'}
              </h2>
              <p className="text-slate-400 text-sm">
                {canLaunch
                  ? 'Your profile score is high enough to launch campaigns. Go to Campaigns to activate.'
                  : `Your score is ${score}%. Add more details to reach 60% and unlock campaign launch.`}
              </p>
              {!canLaunch && (
                <Button
                  onClick={() => setStage(0)}
                  variant="outline"
                  className="border-[#F5C842] text-[#F5C842] hover:bg-[#F5C842] hover:text-[#0A1628]"
                >
                  Complete Profile
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
