-- MIGRASI: Ubah sistem jimpitan harian → pembayaran bulanan
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor

-- 1. Buat tabel pembayaran bulanan (menggantikan tabel jimpitan untuk data baru)
CREATE TABLE IF NOT EXISTS public.pembayaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rumah_id TEXT NOT NULL REFERENCES public.rumah(id) ON DELETE CASCADE,
    bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INTEGER NOT NULL,
    nominal NUMERIC DEFAULT 10000 NOT NULL,
    petugas_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Satu rumah hanya bisa 1x bayar per bulan
    UNIQUE (rumah_id, bulan, tahun)
);

-- 2. RLS untuk tabel pembayaran
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Izinkan petugas membaca pembayaran"
ON public.pembayaran FOR SELECT
TO authenticated
USING (true);

-- TAMBAHKAN NANTI SETELAH API ROUTE SELESAI:
-- CREATE POLICY "Izinkan petugas menambah pembayaran"
-- ON public.pembayaran FOR INSERT
-- TO authenticated
-- WITH CHECK (true);
-- (Untuk sementara, insert via API route pakai service role)
