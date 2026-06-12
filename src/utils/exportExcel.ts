import * as XLSX from 'xlsx'

interface JimpitanRecord {
  id: string
  tanggal: string
  nominal: number
  status: string
  created_at: string
  rumah: {
    id: string
    rt: string
    no_rumah: string
    nama_pemilik: string
  } | null
}

interface Rumah {
  id: string
  rt: string
  no_rumah: string
  nama_pemilik: string
}

interface PembayaranRecord {
  id: string
  rumah_id: string
  bulan: number
  tahun: number
  nominal: number
}

const rts = ['RT 01', 'RT 02', 'RT 03', 'RT 04']

const bulanNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

/**
 * Mengekspor data jimpitan ke file Excel (.xlsx) dengan 3 sheet:
 * 1. "Rekap per RT" — ringkasan per RT
 * 2. "Rincian per RT" — daftar seluruh warga per RT, lengkap status bayar
 * 3. "Rekap Tahunan" — matriks rumah × bulan (Jan-Des) per RT
 */
export function exportJimpitanToExcel(
  records: JimpitanRecord[],
  allHouses: Rumah[],
  filterDate: string,
  filterRt: string,
  pembayaran?: PembayaranRecord[]
) {
  const workbook = XLSX.utils.book_new()
  const isSpecificDate = !!filterDate

  // Helper: cari jimpitan record untuk rumah tertentu (filter berdasarkan tanggal jika ada)
  const findRecord = (rumahId: string) => {
    return records.find(r => r.rumah?.id === rumahId)
  }

  const filteredHouses = filterRt === 'Semua'
    ? allHouses
    : allHouses.filter(h => h.rt === filterRt)

  // =============================================
  // SHEET 1: Rekap per RT
  // =============================================
  const rekapRows = rts.map((rt) => {
    const rtHouses = allHouses.filter(h => h.rt === rt)
    const rtRecords = records.filter(r => r.rumah?.rt === rt)
    const jumlahAda = rtRecords.filter(r => r.status === 'ada').length
    const jumlahTidakAda = rtRecords.filter(r => r.status === 'tidak ada').length
    const jumlahBelumScan = isSpecificDate
      ? rtHouses.length - rtRecords.length
      : 0
    const totalUang = rtRecords
      .filter(r => r.status === 'ada')
      .reduce((sum, r) => sum + Number(r.nominal), 0)

    return {
      'Rukun Tetangga': rt,
      'Total Rumah': rtHouses.length,
      'Sudah Scan': rtRecords.length,
      'Uang Ada': jumlahAda,
      'Tidak Ada': jumlahTidakAda,
      ...(isSpecificDate ? { 'Belum Scan': jumlahBelumScan } : {}),
      'Total Uang (Rp)': totalUang,
    }
  })

  const grandTotalAda = records.filter(r => r.status === 'ada').length
  const grandTotalTidak = records.filter(r => r.status === 'tidak ada').length
  const grandTotalUang = records
    .filter(r => r.status === 'ada')
    .reduce((sum, r) => sum + Number(r.nominal), 0)

  const grandTotalRow: any = {
    'Rukun Tetangga': 'TOTAL KESELURUHAN',
    'Total Rumah': allHouses.length,
    'Sudah Scan': records.length,
    'Uang Ada': grandTotalAda,
    'Tidak Ada': grandTotalTidak,
    ...(isSpecificDate ? { 'Belum Scan': allHouses.length - records.length } : {}),
    'Total Uang (Rp)': grandTotalUang,
  }
  rekapRows.push(grandTotalRow)

  const rekapSheet = XLSX.utils.json_to_sheet(rekapRows)
  rekapSheet['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    ...(isSpecificDate ? [{ wch: 14 }] : []),
    { wch: 22 },
  ]

  XLSX.utils.book_append_sheet(workbook, rekapSheet, 'Rekap per RT')

  // =============================================
  // SHEET 2: Rincian per RT
  // =============================================
  const detailRows: any[] = []
  let noUrut = 0

  rts.forEach((rt) => {
    const rtHouses = filteredHouses
      .filter(h => h.rt === rt)
      .sort((a, b) => a.id.localeCompare(b.id))

    if (rtHouses.length === 0) return

    // Baris header RT
    detailRows.push({
      'No': '',
      'RT': rt,
      'No. Rumah': '',
      'Nama Pemilik': '',
      'Status': '',
      'Nominal (Rp)': '',
    })

    let subtotal = 0

    rtHouses.forEach((house) => {
      noUrut++
      const rec = findRecord(house.id)

      let status: string
      let nominal: number

      if (rec) {
        status = rec.status === 'ada' ? 'Ada' : 'Tidak Ada'
        nominal = rec.status === 'ada' ? Number(rec.nominal) : 0
      } else {
        status = 'Belum Scan'
        nominal = 0
      }

      subtotal += nominal

      detailRows.push({
        'No': isSpecificDate ? noUrut : '',
        'RT': '',
        'No. Rumah': house.no_rumah,
        'Nama Pemilik': house.nama_pemilik,
        'Status': status,
        'Nominal (Rp)': nominal,
      })
    })

    // Subtotal RT
    detailRows.push({
      'No': '',
      'RT': `SUBTOTAL ${rt}`,
      'No. Rumah': '',
      'Nama Pemilik': '',
      'Status': '',
      'Nominal (Rp)': subtotal,
    })

    // Baris kosong pemisah
    detailRows.push({
      'No': '',
      'RT': '',
      'No. Rumah': '',
      'Nama Pemilik': '',
      'Status': '',
      'Nominal (Rp)': '',
    })
  })

  // Grand total
  const grandTotalRincian = allHouses
    .filter(h => filterRt === 'Semua' || h.rt === filterRt)
    .reduce((sum, house) => {
      const rec = findRecord(house.id)
      return sum + (rec && rec.status === 'ada' ? Number(rec.nominal) : 0)
    }, 0)

  detailRows.push({
    'No': '',
    'RT': 'TOTAL KESELURUHAN',
    'No. Rumah': '',
    'Nama Pemilik': '',
    'Status': '',
    'Nominal (Rp)': grandTotalRincian,
  })

  const detailSheet = XLSX.utils.json_to_sheet(detailRows)

  detailSheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
  ]

  // Merge cell untuk header RT (kolom A-F)
  const merges: XLSX.Range[] = []
  let currentRow = 1 // 1-indexed, baris pertama data

  rts.forEach((rt) => {
    const rtHouses = filteredHouses
      .filter(h => h.rt === rt)
      .sort((a, b) => a.id.localeCompare(b.id))

    if (rtHouses.length === 0) return

    // Header RT and its data rows + subtotal = 2 + rtHouses.length rows
    const startRow = currentRow
    const endRow = currentRow + 1 + rtHouses.length // header + data rows
    merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow, c: 5 } }) // merge header row

    currentRow = endRow + 2 // +2 for subtotal + empty row
  })

  if (merges.length > 0) {
    detailSheet['!merges'] = merges
  }

  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Rincian per RT')

  // =============================================
  // SHEET 3: Rekap Tahunan (jika ada data pembayaran)
  // =============================================
  if (pembayaran && pembayaran.length > 0) {
    const tahun = new Date().getFullYear()
    const pembayaranFiltered = filterRt === 'Semua'
      ? pembayaran
      : pembayaran.filter(p => {
          const house = allHouses.find(h => h.id === p.rumah_id)
          return house?.rt === filterRt
        })

    const housesInView = filteredHouses.filter(h =>
      filterRt === 'Semua' || h.rt === filterRt
    )

    // Bangun matriks: baris = rumah, kolom = bulan
    const yearlyRows: any[] = []

    rts.forEach(rt => {
      const rtHouses = housesInView
        .filter(h => h.rt === rt)
        .sort((a, b) => a.id.localeCompare(b.id))

      if (rtHouses.length === 0) return

      // Header RT
      yearlyRows.push({
        'RT': rt,
        'Nama Pemilik': '',
        'No. Rumah': '',
        ...Object.fromEntries(bulanNames.map((_, i) => [`Bulan ${i + 1}`, ''])),
        'Total Bayar': '',
      })

      rtHouses.forEach(house => {
        const row: any = {
          'RT': '',
          'Nama Pemilik': house.nama_pemilik,
          'No. Rumah': house.no_rumah,
        }

        let totalBayar = 0
        for (let b = 1; b <= 12; b++) {
          const pay = pembayaranFiltered.find(
            p => p.rumah_id === house.id && p.bulan === b && p.tahun === tahun
          )
          const isPaid = !!pay
          row[`Bulan ${b}`] = isPaid ? 'LUNAS' : ''
          if (isPaid) totalBayar += Number(pay.nominal)
        }

        row['Total Bayar'] = totalBayar
        yearlyRows.push(row)
      })

      // Subtotal RT
      yearlyRows.push({
        'RT': `SUBTOTAL ${rt}`,
        'Nama Pemilik': '',
        'No. Rumah': '',
        ...Object.fromEntries(bulanNames.map((_, i) => {
          const count = rtHouses.filter(h =>
            pembayaranFiltered.some(p => p.rumah_id === h.id && p.bulan === i + 1 && p.tahun === tahun)
          ).length
          return [`Bulan ${i + 1}`, `${count} rmh`]
        })),
        'Total Bayar': rtHouses.reduce((sum, h) => {
          const pays = pembayaranFiltered.filter(
            p => p.rumah_id === h.id && p.tahun === tahun
          )
          return sum + pays.reduce((s, p) => s + Number(p.nominal), 0)
        }, 0),
      })

      // Baris kosong
      yearlyRows.push({
        'RT': '',
        'Nama Pemilik': '',
        'No. Rumah': '',
        ...Object.fromEntries(bulanNames.map((_, i) => [`Bulan ${i + 1}`, ''])),
        'Total Bayar': '',
      })
    })

    const yearlySheet = XLSX.utils.json_to_sheet(yearlyRows)
    yearlySheet['!cols'] = [
      { wch: 22 },
      { wch: 24 },
      { wch: 14 },
      ...Array(12).fill({ wch: 12 }),
      { wch: 16 },
    ]

    XLSX.utils.book_append_sheet(workbook, yearlySheet, `Rekap Tahunan ${tahun}`)
  }

  // Nama file
  const dateLabel = filterDate || 'semua-tanggal'
  const rtLabel = filterRt === 'Semua' ? 'semua-rt' : filterRt.replace(' ', '-').toLowerCase()
  const fileName = `jimpitan_${dateLabel}_${rtLabel}.xlsx`

  XLSX.writeFile(workbook, fileName)
}
