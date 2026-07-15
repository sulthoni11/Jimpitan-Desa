# Jimpitan QR

Aplikasi pencatatan jimpitan/jimpitan RT berbasis QR Code. Data disimpan di **Google Sheets** (gratis), bisa di-export ke Excel kapan saja.

## Persiapan Google Sheets

### 1. Buat Google Spreadsheet

Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru. Buat **3 sheet/tab** dengan nama dan header berikut:

**Sheet `rumah`** (header di baris 1):
| id | rt | no_rumah | nama_pemilik | created_at |

**Sheet `pembayaran`** (header di baris 1):
| id | rumah_id | bulan | tahun | nominal | petugas | created_at |

> **Contoh isi sheet rumah:**
> | id | rt | no_rumah | nama_pemilik | created_at |
> |---|---|---|---|---|
> | RMH-01-001 | RT 01 | 01 | Ahmad Santoso | 2026-01-01T00:00:00.000Z |
> | RMH-01-002 | RT 01 | 02 | Budi Pratama | 2026-01-01T00:00:00.000Z |

> **Contoh isi sheet pembayaran:**
> | id | rumah_id | bulan | tahun | nominal | petugas | created_at |
> |---|---|---|---|---|---|---|
> | PAY-123-abc | RMH-01-001 | 1 | 2026 | 10000 | Budi | 2026-01-05T08:00:00.000Z |

### 2. Buat Service Account Google

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru (atau pilih existing)
3. Cari dan aktifkan **Google Sheets API**
4. Masuk ke **IAM & Admin → Service Accounts**
5. Klik **Create Service Account**
6. Beri nama (misal: "jimpitan-sheets"), klik **Create and Continue**
7. Klik **Done** (tidak perlu menambah role)
8. Klik service account yang baru dibuat
9. Buka tab **Keys** → **Add Key** → **Create New Key** → Pilih **JSON** → **Create**
10. File JSON akan ter-download. Isinya kira-kira:
    ```json
    {
      "type": "service_account",
      "project_id": "...",
      "private_key_id": "...",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "jimpitan-sheets@xxx.iam.gserviceaccount.com",
      ...
    }
    ```
11. Copy **client_email** dan **private_key**

### 3. Bagikan Spreadsheet ke Service Account

Di Google Spreadsheet Anda, klik **Share** (tombol kanan atas), masukkan email service account (dari `client_email` di atas), beri akses **Editor**.

### 4. Dapatkan Spreadsheet ID

Lihat URL spreadsheet Anda:
```
https://docs.google.com/spreadsheets/d/1ABC123xyz456/edit#gid=0
```
Spreadsheet ID adalah **`1ABC123xyz456`** (string di antara `/d/` dan `/edit`).

## Konfigurasi Environment

Edit `.env.local`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=jimpitan-sheets@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=1ABC123xyz456
APP_PASSWORD=jimpitan123
```

> **Catatan penting untuk `GOOGLE_PRIVATE_KEY`**:
> - Bungkus dengan tanda petik dua `" "`
> - Biarkan `\n` apa adanya (jangan diubah jadi enter)
> - Di Vercel, saat menambahkan environment variable, paste seluruh isi termasuk `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke Vercel

1. Push kode ke GitHub
2. Buka [vercel.com](https://vercel.com)
3. Import repository
4. Tambahkan environment variables di Vercel (sama seperti di `.env.local`):
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `SPREADSHEET_ID`
   - `APP_PASSWORD`
5. Deploy!

## Cara Pakai

1. **Login**: Masukkan password (default: `jimpitan123`) dan nama petugas
2. **Dashboard**: Lihat ringkasan iuran bulan ini per RT
3. **Scan**: Arahkan kamera ke QR Code rumah warga untuk mencatat pembayaran (Rp 10.000/bulan)
4. **Tambah**: Tambah data warga baru (QR Code langsung muncul)
5. **QR Code**: Lihat & cetak semua QR Code rumah
6. **Riwayat**: Filter per bulan/tahun/RT, export ke Excel (.xlsx)

## Export Excel

Excel akan berisi 3 sheet:
- **Rekap per RT** — ringkasan total per RT
- **Rincian per RT** — daftar detail per rumah
- **Rekap Tahunan** — matriks rumah × bulan (LUNAS/kosong)

## Catatan

- Pembayaran hanya bisa dilakukan tanggal **1–15** setiap bulan
- Minimal bayar **Rp 10.000** per rumah per bulan
- Bayar lebih untuk melunasi tunggakan atau bulan berikutnya
- Semua data tersimpan di Google Sheets Anda — aman dan gratis
