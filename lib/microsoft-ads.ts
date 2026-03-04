const MICROSOFT_ADS_BASE =
  'https://api.ads.microsoft.com/Api/Advertiser/CampaignManagement/v13/CampaignManagementService.svc'
const MICROSOFT_ADS_REPORTING_BASE =
  'https://api.ads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) {
    throw new Error(
      `Microsoft Advertising: missing required environment variable ${key}. ` +
        `Register an Azure App at https://portal.azure.com to obtain OAuth credentials.`
    )
  }
  return val
}

function requireDeveloperToken(): string {
  return requireEnv('MICROSOFT_ADS_DEVELOPER_TOKEN')
}

export async function getAccessToken(): Promise<string> {
  const clientId = requireEnv('MICROSOFT_ADS_CLIENT_ID')
  const clientSecret = requireEnv('MICROSOFT_ADS_CLIENT_SECRET')
  const refreshToken = requireEnv('MICROSOFT_ADS_REFRESH_TOKEN')

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://ads.microsoft.com/ads.manage offline_access',
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Microsoft Advertising token refresh failed: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

function getHeaders(accessToken: string, accountId: string): Record<string, string> {
  const developerToken = requireDeveloperToken()
  return {
    Authorization: `Bearer ${accessToken}`,
    DeveloperToken: developerToken,
    CustomerId: process.env.MICROSOFT_ADS_MCC_ACCOUNT_ID ?? '',
    CustomerAccountId: accountId,
    'Content-Type': 'application/json',
  }
}

export interface MicrosoftCampaignParams {
  name: string
  dailyBudget: number
  biddingStrategy?: string
}

export async function createCampaign(
  accountId: string,
  params: MicrosoftCampaignParams
): Promise<string> {
  requireDeveloperToken()
  const token = await getAccessToken()

  const response = await fetch(`${MICROSOFT_ADS_BASE}/json/AddCampaigns`, {
    method: 'POST',
    headers: getHeaders(token, accountId),
    body: JSON.stringify({
      AccountId: accountId,
      Campaigns: [
        {
          Name: params.name,
          DailyBudget: params.dailyBudget,
          BudgetType: 'DailyBudgetStandard',
          BiddingScheme: {
            Type: 'EnhancedCpc',
          },
          CampaignType: 'Search',
          Status: 'Paused',
          TimeZone: 'CentralStandardTime',
          TrackingUrlTemplate: '{lpurl}?msclkid={msclkid}',
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Microsoft Advertising campaign creation failed: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as {
    CampaignIds: string[]
    PartialErrors?: unknown[]
  }

  if (!data.CampaignIds?.[0]) {
    throw new Error(
      `Microsoft Advertising campaign creation returned no ID. Errors: ${JSON.stringify(data.PartialErrors)}`
    )
  }

  return data.CampaignIds[0]
}

export async function updateCampaignBudget(
  accountId: string,
  campaignId: string,
  dailyBudget: number
): Promise<void> {
  requireDeveloperToken()
  const token = await getAccessToken()

  const response = await fetch(`${MICROSOFT_ADS_BASE}/json/UpdateCampaigns`, {
    method: 'POST',
    headers: getHeaders(token, accountId),
    body: JSON.stringify({
      AccountId: accountId,
      Campaigns: [
        {
          Id: campaignId,
          DailyBudget: dailyBudget,
          BudgetType: 'DailyBudgetStandard',
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Microsoft Advertising budget update failed: ${response.status} ${response.statusText}`
    )
  }
}

export async function pauseCampaign(accountId: string, campaignId: string): Promise<void> {
  requireDeveloperToken()
  const token = await getAccessToken()

  const response = await fetch(`${MICROSOFT_ADS_BASE}/json/UpdateCampaigns`, {
    method: 'POST',
    headers: getHeaders(token, accountId),
    body: JSON.stringify({
      AccountId: accountId,
      Campaigns: [
        {
          Id: campaignId,
          Status: 'Paused',
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Microsoft Advertising campaign pause failed: ${response.status} ${response.statusText}`
    )
  }
}

export interface MicrosoftOfflineConversionParams {
  accountId: string
  msclkid: string
  conversionName: string
  conversionTime: string
  conversionValue: number
  currencyCode?: string
}

export async function uploadOfflineConversion(
  params: MicrosoftOfflineConversionParams
): Promise<void> {
  requireDeveloperToken()
  const token = await getAccessToken()

  // Microsoft requires a 2-hour delay after click before uploading
  const clickTime = new Date(params.conversionTime)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  if (clickTime > twoHoursAgo) {
    throw new Error(
      `Microsoft Advertising offline conversion must be uploaded at least 2 hours after click. ` +
        `Click time: ${params.conversionTime}`
    )
  }

  const response = await fetch(`${MICROSOFT_ADS_BASE}/json/ApplyOfflineConversions`, {
    method: 'POST',
    headers: getHeaders(token, params.accountId),
    body: JSON.stringify({
      OfflineConversions: [
        {
          MicrosoftClickId: params.msclkid,
          ConversionName: params.conversionName,
          ConversionTime: params.conversionTime,
          ConversionValue: params.conversionValue,
          ConversionCurrencyCode: params.currencyCode ?? 'USD',
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Microsoft Advertising offline conversion upload failed: ${response.status} ${response.statusText}`
    )
  }
}

export interface MicrosoftSpendRecord {
  campaignId: string
  spend: number
  impressions: number
  clicks: number
}

export async function getCampaignSpend(
  accountId: string,
  dateRange: { start: string; end: string }
): Promise<MicrosoftSpendRecord[]> {
  requireDeveloperToken()
  const token = await getAccessToken()

  // Step 1: Submit report request
  const submitResponse = await fetch(`${MICROSOFT_ADS_REPORTING_BASE}/json/SubmitGenerateReport`, {
    method: 'POST',
    headers: getHeaders(token, accountId),
    body: JSON.stringify({
      ReportRequest: {
        ExcludeColumnHeaders: false,
        ExcludeReportFooter: true,
        ExcludeReportHeader: true,
        Format: 'Csv',
        ReportName: 'CampaignPerformance',
        ReturnOnlyCompleteData: false,
        Type: 'CampaignPerformanceReport',
        Aggregation: 'Summary',
        Columns: ['CampaignId', 'Spend', 'Impressions', 'Clicks'],
        Scope: {
          AccountIds: [accountId],
        },
        Time: {
          CustomDateRangeStart: {
            Day: parseInt(dateRange.start.split('-')[2]),
            Month: parseInt(dateRange.start.split('-')[1]),
            Year: parseInt(dateRange.start.split('-')[0]),
          },
          CustomDateRangeEnd: {
            Day: parseInt(dateRange.end.split('-')[2]),
            Month: parseInt(dateRange.end.split('-')[1]),
            Year: parseInt(dateRange.end.split('-')[0]),
          },
        },
      },
    }),
  })

  if (!submitResponse.ok) {
    throw new Error(
      `Microsoft Advertising report submission failed: ${submitResponse.status} ${submitResponse.statusText}`
    )
  }

  const submitData = (await submitResponse.json()) as { ReportRequestId: string }
  const reportId = submitData.ReportRequestId

  // Step 2: Poll for report completion (up to 30 seconds)
  let reportUrl: string | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const pollResponse = await fetch(
      `${MICROSOFT_ADS_REPORTING_BASE}/json/PollGenerateReport`,
      {
        method: 'POST',
        headers: getHeaders(token, accountId),
        body: JSON.stringify({ ReportRequestId: reportId }),
      }
    )

    if (!pollResponse.ok) continue

    const pollData = (await pollResponse.json()) as {
      ReportRequestStatus?: { Status: string; ReportDownloadUrl?: string }
    }

    if (pollData.ReportRequestStatus?.Status === 'Success') {
      reportUrl = pollData.ReportRequestStatus.ReportDownloadUrl ?? null
      break
    }
  }

  if (!reportUrl) {
    throw new Error(`Microsoft Advertising report generation timed out for account ${accountId}`)
  }

  // Step 3: Download and parse CSV
  const csvResponse = await fetch(reportUrl)
  if (!csvResponse.ok) {
    throw new Error(`Microsoft Advertising report download failed: ${csvResponse.status}`)
  }

  const csvText = await csvResponse.text()
  const lines = csvText.trim().split('\n')
  const results: MicrosoftSpendRecord[] = []

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 4) continue
    results.push({
      campaignId: cols[0].trim(),
      impressions: parseInt(cols[1].trim()) || 0,
      clicks: parseInt(cols[2].trim()) || 0,
      spend: parseFloat(cols[3].trim()) || 0,
    })
  }

  return results
}
