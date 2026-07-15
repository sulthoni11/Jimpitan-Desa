import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || ''

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export async function getSheetRows(sheetName: string) {
  const sheets = getSheets()
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:Z`,
      valueRenderOption: 'FORMATTED_VALUE',
    })
    const values = res.data.values || []
    if (values.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] }
    const headers = values[0] as string[]
    const rows = values.slice(1).map(row => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').toString() })
      return obj
    })
    return { headers, rows }
  } catch (err: any) {
    console.error('Google Sheets API Error:', err.message, err.response?.data?.error || '')
    throw new Error(`Gagal membaca sheet "${sheetName}": ${err.message}`)
  }
}

export async function appendSheetRows(sheetName: string, values: string[][]) {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  })
}

export async function updateSheetRow(sheetName: string, range: string, values: string[][]) {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
}
