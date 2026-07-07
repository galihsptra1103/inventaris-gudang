const API_URL = 'http://localhost:3000/api';
let listBarangLokal = [];
let modeAuth = 'login'; // 'login' atau 'register'

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tanggalTransaksi').value = new Date().toISOString().split('T')[0];
    
    // Cek Session login agar kalau direfresh tidak usah login ulang
    const userSimpanan = localStorage.getItem('karyawanAktif');
    if (userSimpanan) {
        tampilkanDashboardUtama(userSimpanan);
    }

    // Event Tukar Mode Login / Register
    document.getElementById('btnGantiMode').addEventListener('click', () => {
        const judul = document.getElementById('judulAuth');
        const subjudul = document.getElementById('subjudulAuth');
        const btn = document.getElementById('btnAuth');
        const link = document.getElementById('btnGantiMode');

        if (modeAuth === 'login') {
            modeAuth = 'register';
            judul.textContent = 'Daftar Karyawan Baru';
            subjudul.textContent = 'Buat akun untuk karyawan tokomu';
            btn.textContent = 'Daftar Akun';
            link.textContent = 'Sudah punya akun? Login di sini';
        } else {
            modeAuth = 'login';
            judul.textContent = 'Login Karyawan';
            subjudul.textContent = 'Silakan masuk untuk mengelola inventaris';
            btn.textContent = 'Masuk';
            link.textContent = 'Belum punya akun? Daftar di sini';
        }
    });

    // Event Submit Form Login / Register
    document.getElementById('formAuth').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('usernameAuth').value;
        const password = document.getElementById('passwordAuth').value;

        try {
            const response = await fetch(`${API_URL}/${modeAuth}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok) {
                if (modeAuth === 'login') {
                    localStorage.setItem('karyawanAktif', data.username);
                    tampilkanDashboardUtama(data.username);
                    document.getElementById('formAuth').reset();
                } else {
                    alert('Pendaftaran berhasil! Silakan login.');
                    document.getElementById('btnGantiMode').click(); // balikin ke mode login
                }
            } else {
                alert(`Gagal: ${data.error}`);
            }
        } catch (error) {
            alert('Terjadi kesalahan jaringan.');
        }
    });

    // Event Tombol Logout
    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('karyawanAktif');
        document.getElementById('halamanUtama').classList.add('hidden');
        document.getElementById('halamanLogin').classList.remove('hidden');
    });

    // Event ganti barang di dropdown
    document.getElementById('pilihBarang').addEventListener('change', (e) => {
        const idTerpilih = e.target.value;
        const infoLabel = document.getElementById('infoStokDropdown');
        if(idTerpilih) {
            const barang = listBarangLokal.find(b => b.id == idTerpilih);
            infoLabel.textContent = `(Stok Saat Ini: ${barang ? barang.stok : 0})`;
        } else {
            infoLabel.textContent = '';
        }
    });

    // Event Forms Inventaris
    setupInventarisEvents();
});

function tampilkanDashboardUtama(username) {
    document.getElementById('halamanLogin').classList.add('hidden');
    document.getElementById('halamanUtama').classList.remove('hidden');
    document.getElementById('namaKaryawanAktif').textContent = username;
    loadSemuaData();
}

async function loadSemuaData() {
    await loadDaftarBarangDanStok();
    await loadRiwayatTransaksi();
}

async function loadDaftarBarangDanStok() {
    try {
        const response = await fetch(`${API_URL}/barang`);
        listBarangLokal = await response.json();
        
        const selectBarang = document.getElementById('pilihBarang');
        const idSebelumnya = selectBarang.value;
        selectBarang.innerHTML = '<option value="">-- Pilih Barang --</option>';
        
        const tabelStokBody = document.getElementById('tabelStok');
        tabelStokBody.innerHTML = '';

        listBarangLokal.forEach(barang => {
            const option = document.createElement('option');
            option.value = barang.id;
            option.textContent = `${barang.nama_barang} (${barang.jenis_barang})`;
            selectBarang.appendChild(option);

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            const warnaStok = barang.stok <= 3 ? 'text-amber-600 font-bold' : 'text-gray-700';
            row.innerHTML = `
                <td class="p-3 border-b font-medium">${barang.nama_barang}</td>
                <td class="p-3 border-b text-right ${warnaStok}">${barang.stok} pcs</td>
            `;
            tabelStokBody.appendChild(row);
        });

        if(idSebelumnya) selectBarang.value = idSebelumnya;
    } catch (error) {
        console.error('Gagal memuat data barang:', error);
    }
}

async function loadRiwayatTransaksi() {
    try {
        const response = await fetch(`${API_URL}/transaksi`);
        const data = await response.json();
        const tabelBody = document.getElementById('tabelRiwayat');
        tabelBody.innerHTML = '';
        
        if (data.length === 0) {
            tabelBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Belum ada riwayat transaksi.</td></tr>`;
            return;
        }

        data.forEach(t => {
            const statusBadge = t.jenis_transaksi === 'masuk' 
                ? `<span class="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Masuk</span>`
                : `<span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Keluar</span>`;
            
            const jumlahWarna = t.jenis_transaksi === 'masuk' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
            const tandaJumlah = t.jenis_transaksi === 'masuk' ? `+${t.jumlah}` : `-${t.jumlah}`;

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition';
            row.innerHTML = `
                <td class="p-3 border-b text-xs">${t.tanggal}</td>
                <td class="p-3 border-b font-medium text-gray-800">${t.nama_barang} <span class="text-xs text-gray-400 block">${t.jenis_barang}</span></td>
                <td class="p-3 border-b">${statusBadge}</td>
                <td class="p-3 border-b text-right ${jumlahWarna}">${tandaJumlah}</td>
                <td class="p-3 border-b text-center">
                    <button onclick="hapusTransaksi(${t.id})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition">Hapus</button>
                </td>
            `;
            tabelBody.appendChild(row);
        });
    } catch (error) {
        console.error('Gagal memuat riwayat transaksi:', error);
    }
}

function setupInventarisEvents() {
    document.getElementById('formBarang').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama_barang = document.getElementById('namaBarang').value;
        const jenis_barang = document.getElementById('jenisBarang').value;

        try {
            const response = await fetch(`${API_URL}/barang`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama_barang, jenis_barang })
            });
            if (response.ok) {
                alert('Barang baru berhasil ditambahkan!');
                document.getElementById('formBarang').reset();
                loadSemuaData();
            }
        } catch (error) {
            alert('Gagal menambah barang');
        }
    });

    document.getElementById('formTransaksi').addEventListener('submit', async (e) => {
        e.preventDefault();
        const barang_id = document.getElementById('pilihBarang').value;
        const jenis_transaksi = document.getElementById('jenisTransaksi').value;
        const jumlah = document.getElementById('jumlahTransaksi').value;
        const tanggal = document.getElementById('tanggalTransaksi').value;

        try {
            const response = await fetch(`${API_URL}/transaksi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barang_id, jenis_transaksi, jumlah, tanggal })
            });
            const result = await response.json();

            if (response.ok) {
                alert('Transaksi berhasil dicatat!');
                document.getElementById('jumlahTransaksi').value = '';
                document.getElementById('infoStokDropdown').textContent = '';
                document.getElementById('pilihBarang').value = '';
                loadSemuaData();
            } else {
                alert(`⚠️ Peringatan: ${result.error}`);
            }
        } catch (error) {
            alert('Gagal mencatat transaksi');
        }
    });
}

async function hapusTransaksi(id) {
    if (confirm('Apakah kamu yakin ingin menghapus catatan transaksi ini?')) {
        try {
            const response = await fetch(`${API_URL}/transaksi/${id}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Catatan transaksi berhasil dihapus!');
                loadSemuaData();
            }
        } catch (error) {
            alert('Gagal menghapus transaksi');
        }
    }
}