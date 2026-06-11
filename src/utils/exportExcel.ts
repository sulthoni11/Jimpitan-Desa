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

/**
 * Mengekspor data jimpitan ke file Excel (.xlsx) dengan 2 sheet:
 * 1. Sheet "Rekap per RT" — ringkasan total uang dan rumah per RT
 * 2. Sheet "Detail Transaksi" — seluruh baris data transaksi
 */
export function exportJimpitanToExcel(
  records: JimpitanRecord[],
  filterDate: string,
  filterRt: string
) {
  const workbook = XLSX.utils.book_new()

  // =============================================
  // SHEET 1: Rekap per RT
  // =============================================
  const rts = ['RT 01', 'RT 02', 'RT 03', 'RT 04']

  const rekapRows = rts.map((rt) => {
    const rtRecords = records.filter((r) => r.rumah?.rt === rt)
    const totalUang = rtRecords
      .filter((r) => r.status === 'ada')
      .reduce((sum, r) => sum + Number(r.nominal), 0)
    const jumlahAda = rtRecords.filter((r) => r.status === 'ada').length
    const jumlahTidakAda = rtRecords.filter((r) => r.status === 'tidak ada').length

    return {
      'Rukun Tetangga': rt,
      'Jumlah Scan': rtRecords.length,
      'Uang Ada (Rumah)': jumlahAda,
      'Tidak Ada (Rumah)': jumlahTidakAda,
      'Total Uang Terkumpul (Rp)': totalUang,
    }
  })

  // Tambahkan baris Total keseluruhan
  const grandTotal = records
    .filter((r) => r.status === 'ada')
    .reduce((sum, r) => sum + Number(r.nominal), 0)

  rekapRows.push({
    'Rukun Tetangga': 'TOTAL KESELURUHAN',
    'Jumlah Scan': records.length,
    'Uang Ada (Rumah)': records.filter((r) => r.status === 'ada').length,
    'Tidak Ada (Rumah)': records.filter((r) => r.status === 'tidak ada').length,
    'Total Uang Terkumpul (Rp)': grandTotal,
  })

  const rekapSheet = XLSX.utils.json_to_sheet(rekapRows)

  // Atur lebar kolom rekap
  rekapSheet['!cols'] = [
    { wch: 22 }, // Rukun Tetangga
    { wch: 16 }, // Jumlah Scan
    { wch: 20 }, // Uang Ada
    { wch: 22 }, // Tidak Ada
    { wch: 28 }, // Total Uang
  ]

  XLSX.utils.book_append_sheet(workbook, rekapSheet, 'Rekap per RT')

  // =============================================
  // SHEET 2: Detail Transaksi
  // =============================================
  const detailRows = records.map((record, index) => {
    const waktu = new Date(record.created_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    return {
      'No': index + 1,
      'Tanggal': record.tanggal,
      'Jam Scan': waktu,
      'ID Rumah': record.rumah?.id || '-',
      'RT': record.rumah?.rt || '-',
      'No. Rumah': record.rumah?.no_rumah || '-',
      'Nama Pemilik': record.rumah?.nama_pemilik || '-',
      'Status': record.status === 'ada' ? 'Ada' : 'Tidak Ada',
      'Nominal (Rp)': record.status === 'ada' ? Number(record.nominal) : 0,
    }
  })

  const detailSheet = XLSX.utils.json_to_sheet(detailRows)

  // Atur lebar kolom detail
  detailSheet['!cols'] = [
    { wch: 5  }, // No
    { wch: 14 }, // Tanggal
    { wch: 12 }, // Jam Scan
    { wch: 14 }, // ID Rumah
    { wch: 8  }, // RT
    { wch: 12 }, // No. Rumah
    { wch: 22 }, // Nama Pemilik
    { wch: 12 }, // Status
    { wch: 18 }, // Nominal
  ]

  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Transaksi')

  // =============================================
  // Tentukan nama file berdasarkan filter aktif
  // =============================================
  const dateLabel = filterDate || 'semua-tanggal'
  const rtLabel = filterRt === 'Semua' ? 'semua-rt' : filterRt.replace(' ', '-').toLowerCase()
  const fileName = `jimpitan_${dateLabel}_${rtLabel}.xlsx`

  // Unduh file
  XLSX.writeFile(workbook, fileName)
}
