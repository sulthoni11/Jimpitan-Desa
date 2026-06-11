-- 1. Buat Tabel Rumah
CREATE TABLE public.rumah (
    id TEXT PRIMARY KEY, -- ID unik rumah yang akan dijadikan kode QR (misal: RMH-01-001)
    rt TEXT NOT NULL,    -- RT 01, RT 02, RT 03, RT 04
    no_rumah TEXT NOT NULL,
    nama_pemilik TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Buat Tabel Jimpitan
CREATE TABLE public.jimpitan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rumah_id TEXT NOT NULL REFERENCES public.rumah(id) ON DELETE CASCADE,
    tanggal DATE DEFAULT CURRENT_DATE NOT NULL,
    nominal NUMERIC DEFAULT 0 NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ada', 'tidak ada')),
    petugas_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Merujuk ke tabel user bawaan Supabase Auth
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Memastikan satu rumah hanya bisa dicatat sekali dalam sehari
    CONSTRAINT unique_rumah_tanggal UNIQUE (rumah_id, tanggal)
);

-- 3. Aktifkan Row Level Security (RLS) demi keamanan database
ALTER TABLE public.rumah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimpitan ENABLE ROW LEVEL SECURITY;

-- 4. Buat Kebijakan Keamanan (RLS Policies)
-- Mengizinkan petugas yang login (authenticated) untuk membaca data rumah
CREATE POLICY "Izinkan petugas membaca data rumah" 
ON public.rumah FOR SELECT 
TO authenticated 
USING (true);

-- Mengizinkan petugas yang login untuk mengelola (baca, tambah, edit, hapus) data jimpitan
CREATE POLICY "Izinkan petugas mengelola data jimpitan" 
ON public.jimpitan FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 5. Masukkan Data Uji Coba (Seed Data) Rumah untuk RT 01 - RT 04
INSERT INTO public.rumah (id, rt, no_rumah, nama_pemilik) VALUES
-- Data RT 01
('RMH-01-001', 'RT 01', 'No. 01', 'Pak Budi'),
('RMH-01-002', 'RT 01', 'No. 02', 'Bu Sri'),
('RMH-01-003', 'RT 01', 'No. 03', 'Pak Joko'),
('RMH-01-004', 'RT 01', 'No. 04', 'Bu Wati'),
-- Data RT 02
('RMH-02-001', 'RT 02', 'No. 12', 'Pak Slamet'),
('RMH-02-002', 'RT 02', 'No. 13', 'Bu Rahayu'),
('RMH-02-003', 'RT 02', 'No. 14', 'Pak Herman'),
-- Data RT 03
('RMH-03-001', 'RT 03', 'No. 25', 'Bu Siti'),
('RMH-03-002', 'RT 03', 'No. 26', 'Pak Bambang'),
('RMH-03-003', 'RT 03', 'No. 27', 'Bu Endang'),
-- Data RT 04
('RMH-04-001', 'RT 04', 'No. 38', 'Pak Agus'),
('RMH-04-002', 'RT 04', 'No. 39', 'Bu Hartati'),
('RMH-04-003', 'RT 04', 'No. 40', 'Pak Supardi')
ON CONFLICT (id) DO NOTHING;
