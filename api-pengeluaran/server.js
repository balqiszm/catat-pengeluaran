import express from 'express';
import { pool } from './db.js';

const app = express();
const PORT = 3000;

app.use(express.json());


// ======================================================
// TEST SERVER
// ======================================================

app.get('/', (req, res) => {
  res.json({
    pesan: 'Backend Catat Pengeluaran aktif',
  });
});


// ======================================================
// GET SEMUA PENGELUARAN
// ======================================================

app.get('/pengeluaran', async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.judul,
        p.nominal,
        p.tanggal,
        k.nama AS kategori
      FROM pengeluaran p
      LEFT JOIN kategori k
        ON p.id_kategori = k.id
      ORDER BY p.id DESC
    `);

    res.json(rows);

  } catch (e) {

    console.error(e);

    res.status(500).json({
      pesan: 'Gagal mengambil data pengeluaran',
    });

  }
});


// ======================================================
// GET KATEGORI
// ======================================================

app.get('/kategori', async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT id, nama
      FROM kategori
      ORDER BY nama
    `);

    res.json(rows);

  } catch (e) {

    console.error(e);

    res.status(500).json({
      pesan: 'Gagal mengambil kategori',
    });

  }
});


// ======================================================
// GET DETAIL PENGELUARAN
// ======================================================

app.get('/pengeluaran/:id', async (req, res) => {
  try {

    const [rows] = await pool.query(
      `
      SELECT
        id,
        judul,
        nominal,
        tanggal,
        catatan,
        id_kategori
      FROM pengeluaran
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {

      return res.status(404).json({
        pesan: 'Data tidak ditemukan',
      });

    }

    res.json(rows[0]);

  } catch (e) {

    console.error(e);

    res.status(500).json({
      pesan: 'Gagal mengambil detail pengeluaran',
    });

  }
});


// ======================================================
// POST - TAMBAH PENGELUARAN
// ======================================================

app.post('/pengeluaran', async (req, res) => {
  try {

    const {
      judul,
      nominal,
      id_kategori,
    } = req.body;


    // Validasi
    if (
      !judul ||
      nominal === undefined ||
      nominal === null
    ) {

      return res.status(400).json({
        pesan: 'Judul dan nominal wajib diisi',
      });

    }


    const [result] = await pool.query(
      `
      INSERT INTO pengeluaran
        (judul, nominal, tanggal, id_kategori)
      VALUES
        (?, ?, CURDATE(), ?)
      `,
      [
        judul,
        nominal,
        id_kategori ?? null,
      ]
    );


    res.status(201).json({
      id: result.insertId,
      judul,
      nominal,
    });

  } catch (e) {

    console.error(e);

    res.status(500).json({
      pesan: 'Gagal menambahkan pengeluaran',
    });

  }
});


// ======================================================
// PUT - UBAH PENGELUARAN
// ======================================================

app.put('/pengeluaran/:id', async (req, res) => {
  try {

    const {
      judul,
      nominal,
    } = req.body;


    // Validasi
    if (
      !judul ||
      nominal === undefined ||
      nominal === null
    ) {

      return res.status(400).json({
        pesan: 'Judul dan nominal wajib diisi',
      });

    }


    const [result] = await pool.query(
      `
      UPDATE pengeluaran
      SET
        judul = ?,
        nominal = ?
      WHERE id = ?
      `,
      [
        judul,
        nominal,
        req.params.id,
      ]
    );


    if (result.affectedRows === 0) {

      return res.status(404).json({
        pesan: 'Data tidak ditemukan',
      });

    }


    const [rows] = await pool.query(
      `
      SELECT
        id,
        judul,
        nominal,
        tanggal,
        catatan,
        id_kategori
      FROM pengeluaran
      WHERE id = ?
      `,
      [req.params.id]
    );


    res.json(rows[0]);

  } catch (e) {

    console.error(e);

    res.status(500).json({
      pesan: 'Gagal mengubah pengeluaran',
    });

  }
});


// ======================================================
// DELETE - HAPUS PENGELUARAN
// ======================================================

app.delete('/pengeluaran/:id', async (req, res) => {
  try {

    const [result] = await pool.query(
      `
      DELETE FROM pengeluaran
      WHERE id = ?
      `,
      [req.params.id]
    );


    if (result.affectedRows === 0) {

      return res.status(404).json({
        pesan: 'Data tidak ditemukan',
      });

    }


    // Modul 2C meminta DELETE berhasil
    // mengembalikan HTTP 204 tanpa body.
    res.status(204).send();

  } catch (e) {

    console.error(e);

    res.status(500).json({
      pesan: 'Gagal menghapus pengeluaran',
    });

  }
});


// ======================================================
// JALANKAN SERVER
// ======================================================

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Server berjalan di http://localhost:${PORT}`
    );
  }
);