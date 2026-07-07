const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./inventaris.db', (err) => {
    if (err) console.error(err.message);
    console.log('Terhubung ke database SQLite.');
});

db.serialize(() => {
    // 1. Tabel Karyawan
    db.run(`CREATE TABLE IF NOT EXISTS karyawan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // 2. Tabel Barang
    db.run(`CREATE TABLE IF NOT EXISTS barang (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_barang TEXT NOT NULL,
        jenis_barang TEXT NOT NULL
    )`, () => {
        // SETELAH TABEL TERBUAT, JALANKAN PROSES OTOMATIS INPUT DATA BARANG (SEEDING)
        cekDanIsiDataMasterBarang();
    });

    // 3. Tabel Transaksi
    db.run(`CREATE TABLE IF NOT EXISTS transaksi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barang_id INTEGER,
        jenis_transaksi TEXT CHECK(jenis_transaksi IN ('masuk', 'keluar')),
        jumlah INTEGER NOT NULL,
        tanggal TEXT NOT NULL,
        FOREIGN KEY(barang_id) REFERENCES barang(id)
    )`);
});

// Fungsi Otomatis untuk Mengisi Daftar Barang Milik Galih
function cekDanIsiDataMasterBarang() {
    db.get(`SELECT COUNT(*) AS total FROM barang`, [], (err, row) => {
        if (err) return console.error(err.message);
        
        // Jika tabel barang masih kosong (0), isi otomatis seluruh daftar barang dari Galih
        if (row.total === 0) {
            console.log("Database barang kosong. Memulai pengisian barang otomatis...");
            
            const daftarBarangGalih = [
                // 1. Sistem Proteksi Katodik
                { nama: "Aluminum Anode", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "Zinc Anode", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "MMO Coated Titanium Anode", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "Silicon Iron Anode", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "Transformer Rectifier (TR Unit)", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "Test Point Junction Box", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "Permanent Reference Cell", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "CP Coupon", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                { nama: "Kabel Proteksi Katodik", kat: "Sistem Proteksi Katodik (Cathodic Protection System)" },
                
                // 2. Alat Pemantau Korosi Internal
                { nama: "Corrosion Coupon", kat: "Alat Pemantau Korosi Internal (Internal Corrosion Monitoring Product)" },
                { nama: "Coupon Probe", kat: "Alat Pemantau Korosi Internal (Internal Corrosion Monitoring Product)" },
                { nama: "Plug Assembly", kat: "Alat Pemantau Korosi Internal (Internal Corrosion Monitoring Product)" },
                { nama: "Side Stream Assembly (SSA) Bioprobe", kat: "Alat Pemantau Korosi Internal (Internal Corrosion Monitoring Product)" },
                { nama: "Sand Probe Material", kat: "Alat Pemantau Korosi Internal (Internal Corrosion Monitoring Product)" },
                { nama: "Tee Less Injection System", kat: "Alat Pemantau Korosi Internal (Internal Corrosion Monitoring Product)" },
                { nama: "Ladder Coupon System", kat: "Alat Pemantau Korosi Internal (Internal Corrosion Monitoring Product)" },
                
                // 3. Solusi Penguatan & Kebocoran Darurat
                { nama: "Stopkit Temporary Offshore", kat: "Solusi Penguatan & Kebocoran Darurat (Reinforcement & Emergency Leak Solution)" },
                { nama: "Pipe Strapping Belt Reinforcement", kat: "Solusi Penguatan & Kebocoran Darurat (Reinforcement & Emergency Leak Solution)" },
                
                // 4. Perangkat Inspeksi Pipa Pintar
                { nama: "Poly Pig High Density Criss Cross", kat: "Perangkat Inspeksi Pipa Pintar (Inline Inspection & Integrity Tools)" },
                { nama: "Smart Ball Pipeline Inspection", kat: "Perangkat Inspeksi Pipa Pintar (Inline Inspection & Integrity Tools)" },
                
                // 5. Pelapis Khusus
                { nama: "Epoxy 100% Solid Coating", kat: "Pelapis Khusus (Specialty Coating)" }
            ];

            const stmt = db.prepare(`INSERT INTO barang (nama_barang, jenis_barang) VALUES (?, ?)`);
            daftarBarangGalih.forEach(b => {
                stmt.run(b.nama, b.kat);
            });
            stmt.finalize();
            console.log(`Berhasil memasukkan ${daftarBarangGalih.length} data barang otomatis ke database.`);
        } else {
            console.log(`Database barang aman. Sudah terisi ${row.total} jenis barang.`);
        }
    });
}

// ==================== API UTAMA (LOGIN, BARANG, TRANSAKSI) ====================

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        db.run(`INSERT INTO karyawan (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username sudah terdaftar!' });
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Karyawan berhasil didaftarkan!' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Gagal memproses pendaftaran' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM karyawan WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'Username tidak ditemukan!' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Password salah!' });

        res.json({ success: true, message: 'Login berhasil!', username: user.username });
    });
});

app.post('/api/barang', (req, res) => {
    const { nama_barang, jenis_barang } = req.body;
    db.run(`INSERT INTO barang (nama_barang, jenis_barang) VALUES (?, ?)`, [nama_barang, jenis_barang], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, nama_barang, jenis_barang });
    });
});

app.get('/api/barang', (req, res) => {
    const query = `
        SELECT b.id, b.nama_barang, b.jenis_barang,
        COALESCE(SUM(CASE WHEN t.jenis_transaksi = 'masuk' THEN t.jumlah ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.jenis_transaksi = 'keluar' THEN t.jumlah ELSE 0 END), 0) AS stok
        FROM barang b
        LEFT JOIN transaksi t ON b.id = t.barang_id
        GROUP BY b.id
        ORDER BY b.jenis_barang ASC, b.nama_barang ASC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/transaksi', (req, res) => {
    const { barang_id, jenis_transaksi, jumlah, tanggal } = req.body;

    if (jenis_transaksi === 'keluar') {
        const cekStokQuery = `
            SELECT 
            COALESCE(SUM(CASE WHEN jenis_transaksi = 'masuk' THEN jumlah ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN jenis_transaksi = 'keluar' THEN jumlah ELSE 0 END), 0) AS stok_sekarang
            FROM transaksi WHERE barang_id = ?
        `;
        db.get(cekStokQuery, [barang_id], (err, row) => {
            const stokSekarang = row ? row.stok_sekarang : 0;
            if (stokSekarang < parseInt(jumlah)) {
                return res.status(400).json({ error: `Stok tidak mencukupi! Stok saat ini tinggal ${stokSekarang}` });
            }
            eksekusiSimpanTransaksi(barang_id, jenis_transaksi, jumlah, tanggal, res);
        });
    } else {
        eksekusiSimpanTransaksi(barang_id, jenis_transaksi, jumlah, tanggal, res);
    }
});

function eksekusiSimpanTransaksi(barang_id, jenis_transaksi, jumlah, tanggal, res) {
    db.run(`INSERT INTO transaksi (barang_id, jenis_transaksi, jumlah, tanggal) VALUES (?, ?, ?, ?)`,
        [barang_id, jenis_transaksi, jumlah, tanggal], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, barang_id, jenis_transaksi, jumlah, tanggal });
        });
}

app.get('/api/transaksi', (req, res) => {
    const query = `
        SELECT t.id, b.nama_barang, b.jenis_barang, t.jenis_transaksi, t.jumlah, t.tanggal 
        FROM transaksi t
        JOIN barang b ON t.barang_id = b.id
        ORDER BY t.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/transaksi/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM transaksi WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Transaksi berhasil dihapus" });
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});