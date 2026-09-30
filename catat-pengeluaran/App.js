import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { api } from './src/api';

import {
  rupiah,
  tanggalLokal,
  validate,
} from './src/helpers';


// ======================================================
// TOMBOL
// ======================================================

function Tombol({
  title,
  onPress,
  disabled = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        disabled && s.disabled,
      ]}
    >
      <Text style={s.buttonText}>
        {title}
      </Text>
    </Pressable>
  );
}


// ======================================================
// APP
// ======================================================

export default function App() {
  return (
    <SafeAreaProvider>
      <Utama />
    </SafeAreaProvider>
  );
}


// ======================================================
// KOMPONEN UTAMA
// ======================================================

function Utama() {

  // ----------------------------------------------------
  // STATE
  // ----------------------------------------------------

  const [screen, setScreen] = useState('list');

  const [items, setItems] = useState([]);

  const [categories, setCategories] = useState([]);

  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');

  const [judul, setJudul] = useState('');

  const [nominal, setNominal] = useState('');

  const [categoryId, setCategoryId] = useState(null);

  const lock = useRef(false);


  // ====================================================
  // LOAD DAFTAR PENGELUARAN
  // ====================================================

  async function load() {

    if (lock.current) return;

    lock.current = true;

    setLoading(true);
    setError('');

    try {

      const rows = await api.list();

      if (!Array.isArray(rows)) {
        throw new Error(
          'Daftar pengeluaran harus berupa array'
        );
      }

      setItems(rows);

    } catch (e) {

      setError(
        e.message || 'Gagal memuat data'
      );

    } finally {

      lock.current = false;
      setLoading(false);

    }
  }


  // ====================================================
  // LOAD PERTAMA KALI
  // ====================================================

  useEffect(() => {
    load();
  }, []);


  // ====================================================
  // KEMBALI KE DAFTAR
  // ====================================================

  function back() {

    setScreen('list');

    setSelected(null);

    setError('');

    setJudul('');

    setNominal('');

    setCategoryId(null);
  }


  // ====================================================
  // TOMBOL BACK ANDROID
  // ====================================================

  useEffect(() => {

    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {

        if (screen === 'list') {
          return false;
        }

        back();

        return true;
      }
    );

    return () => sub.remove();

  }, [screen]);


  // ====================================================
  // BUKA DETAIL
  // ====================================================

  async function openDetail(id) {

    setLoading(true);

    setError('');

    try {

      const row = await api.detail(id);

      if (!row) {
        throw new Error('Data tidak ditemukan');
      }

      setSelected(row);

      setScreen('detail');

    } catch (e) {

      // Jika data sudah tidak ada
      if (e.status === 404) {

        setSelected(null);

        setError('Data tidak ditemukan');

        setScreen('detail');

      } else {

        setError(
          e.message || 'Gagal mengambil detail data'
        );

      }

    } finally {

      setLoading(false);

    }
  }


  // ====================================================
  // BUKA FORM TAMBAH
  // ====================================================

  async function openCreate() {

    setLoading(true);

    setError('');

    try {

      // Ambil kategori dari backend
      const rows = await api.categories();

      if (!Array.isArray(rows)) {
        throw new Error(
          'Daftar kategori harus berupa array'
        );
      }

      setCategories(rows);

      // Reset form
      setJudul('');

      setNominal('');

      setCategoryId(null);

      setSelected(null);

      setScreen('create');

    } catch (e) {

      setError(
        e.message || 'Gagal mengambil kategori'
      );

    } finally {

      setLoading(false);

    }
  }


  // ====================================================
  // BUKA FORM EDIT
  // ====================================================

  function openEdit() {

    if (!selected) return;

    setJudul(
      selected.judul ?? ''
    );

    setNominal(
      String(selected.nominal ?? '')
    );

    setCategoryId(
      selected.id_kategori ?? null
    );

    setError('');

    setScreen('edit');
  }


  // ====================================================
  // SIMPAN DATA
  // ====================================================

  async function save() {

    // -----------------------------------------------
    // VALIDASI
    // -----------------------------------------------

    const message = validate(
      judul,
      nominal
    );

    if (message) {

      setError(message);

      return;
    }


    // -----------------------------------------------
    // CEGAH DOUBLE CLICK
    // -----------------------------------------------

    if (busy) return;

    setBusy(true);

    setError('');


    try {

      // =================================================
      // TAMBAH
      // =================================================

      if (screen === 'create') {

        await api.create({

          judul: judul.trim(),

          nominal: Number(nominal),

          ...(categoryId !== null && {
            id_kategori: categoryId,
          }),

        });

      }


      // =================================================
      // EDIT
      // =================================================

      else if (
        screen === 'edit' &&
        selected
      ) {

        await api.update(
          selected.id,
          {
            judul: judul.trim(),
            nominal: Number(nominal),
          }
        );

      }


      // -----------------------------------------------
      // RESET FORM
      // -----------------------------------------------

      setJudul('');

      setNominal('');

      setCategoryId(null);

      setSelected(null);

      setScreen('list');


      // -----------------------------------------------
      // AMBIL DATA TERBARU
      // -----------------------------------------------

      try {

        await load();

      } catch {

        setError(
          'Data tersimpan, tetapi daftar gagal dimuat.'
        );

      }

    } catch (e) {

      setError(
        e.message || 'Gagal menyimpan data'
      );

    } finally {

      setBusy(false);

    }
  }


  // ====================================================
  // HAPUS DATA
  // ====================================================

  async function remove() {

    if (!selected || busy) {
      return;
    }

    setBusy(true);

    setError('');

    try {

      // DELETE
      // Backend mengembalikan HTTP 204
      await api.remove(selected.id);

      setSelected(null);

      setScreen('list');


      // -----------------------------------------------
      // LOAD ULANG
      // -----------------------------------------------

      try {

        await load();

      } catch {

        setError(
          'Data berhasil dihapus, tetapi daftar gagal dimuat.'
        );

      }

    } catch (e) {

      setError(
        e.message || 'Gagal menghapus data'
      );

    } finally {

      setBusy(false);

    }
  }


  // ====================================================
  // KONFIRMASI HAPUS
  // ====================================================

  function confirmDelete() {

    Alert.alert(

      'Hapus pengeluaran?',

      'Data yang sudah dihapus tidak dapat dikembalikan.',

      [

        {
          text: 'Batal',
          style: 'cancel',
        },

        {
          text: 'Hapus',
          style: 'destructive',
          onPress: remove,
        },

      ]
    );
  }


  // ====================================================
  // SHELL
  // ====================================================

  function Shell({ children }) {

    return (

      <SafeAreaView style={s.safe}>

        <View style={s.container}>

          {children}

        </View>

      </SafeAreaView>

    );
  }


  // ====================================================
  // LOADING
  // ====================================================

  function Loading() {

    return (

      <Shell>

        <View style={s.center}>

          <ActivityIndicator size="large" />

          <Text style={s.muted}>
            Memuat...
          </Text>

        </View>

      </Shell>

    );
  }


  // ====================================================
  // ERROR STATE
  // ====================================================

  function ErrorState() {

    return (

      <Shell>

        <View style={s.center}>

          <Text style={s.error}>
            {error}
          </Text>

          <Tombol
            title="Coba Lagi"
            onPress={() => {

              setError('');

              load();

            }}
          />

        </View>

      </Shell>

    );
  }


  // ====================================================
  // LIST SCREEN
  // ====================================================

  function ListScreen() {

  return (
    <Shell>

      <View style={s.listScreen}>

        {/* HEADER */}
        <View style={s.header}>

          <View>
            <Text style={s.title}>
              Pengeluaran
            </Text>

            <Text style={s.subtitle}>
              Kelola pengeluaranmu dengan mudah
            </Text>
          </View>

          <Pressable
            onPress={openCreate}
            style={s.addButton}
          >
            <Text style={s.addButtonText}>
              + Tambah
            </Text>
          </Pressable>

        </View>


        {/* ISI */}
        {items.length === 0 ? (

          <View style={s.emptyContainer}>

            <View style={s.emptyIcon}>
              <Ionicons
                name="file-tray-outline"
                size={38}
                color="#19A9E5"
              />
            </View>

            <Text style={s.emptyTitle}>
              Belum ada pengeluaran
            </Text>

            <Text style={s.emptyDescription}>
              Mulai dengan menambah pengeluaran
              {'\n'}
              pertama kamu
            </Text>

            <Pressable
              onPress={openCreate}
              style={s.emptyButton}
            >
              <Text style={s.emptyButtonText}>
                + Tambah
              </Text>
            </Pressable>

          </View>

        ) : (

          <FlatList
            data={items}
            keyExtractor={(item) =>
              String(item.id)
            }
            contentContainerStyle={s.list}
            renderItem={({ item }) => (

              <Pressable
                onPress={() =>
                  openDetail(item.id)
                }
                style={s.card}
              >

                <Text style={s.cardTitle}>
                  {item.judul}
                </Text>

                <Text style={s.cardNominal}>
                  {rupiah(item.nominal)}
                </Text>

                <Text style={s.muted}>
                  {tanggalLokal(item.tanggal)}
                </Text>

                <Text style={s.muted}>
                  {item.kategori ??
                    'Tanpa kategori'}
                </Text>

              </Pressable>

            )}
          />

        )}

      </View>


      {/* BOTTOM NAVIGATION */}
      <View style={s.bottomNav}>

        <View style={s.navItemActive}>
          <Ionicons
            name="home-outline"
            size={25}
            color="#08C6B8"
          />

          <Text style={s.navTextActive}>
            Beranda
          </Text>
        </View>


        <View style={s.navItem}>
          <Ionicons
            name="grid-outline"
            size={24}
            color="#222222"
          />

          <Text style={s.navText}>
            Kategori
          </Text>
        </View>


        <View style={s.navItem}>
          <Ionicons
            name="list-outline"
            size={25}
            color="#222222"
          />

          <Text style={s.navText}>
            Riwayat
          </Text>
        </View>


        <View style={s.navItem}>
          <Ionicons
            name="person-outline"
            size={24}
            color="#222222"
          />

          <Text style={s.navText}>
            Profil
          </Text>
        </View>

      </View>

    </Shell>
  );
}

  // ====================================================
  // DETAIL SCREEN
  // ====================================================

  function DetailScreen() {

    // -----------------------------------------------
    // DATA TIDAK DITEMUKAN
    // -----------------------------------------------

    if (!selected) {

      return (

        <Shell>

          <View style={s.center}>

            <Text style={s.error}>
              Data tidak ditemukan.
            </Text>

            <Tombol
              title="Kembali"
              onPress={back}
            />

          </View>

        </Shell>

      );
    }


    // -----------------------------------------------
    // DETAIL
    // -----------------------------------------------

    return (

      <Shell>

        <ScrollView>

          <Pressable onPress={back}>

            <Text style={s.back}>
              ‹ Kembali
            </Text>

          </Pressable>


          <Text style={s.title}>
            Detail Pengeluaran
          </Text>


          <View style={s.detailCard}>

            {/* JUDUL */}

            <Text style={s.label}>
              Judul
            </Text>

            <Text style={s.detailValue}>
              {selected.judul}
            </Text>


            {/* NOMINAL */}

            <Text style={s.label}>
              Nominal
            </Text>

            <Text style={s.detailValue}>
              {rupiah(selected.nominal)}
            </Text>


            {/* TANGGAL */}

            <Text style={s.label}>
              Tanggal
            </Text>

            <Text style={s.detailValue}>
              {tanggalLokal(
                selected.tanggal
              )}
            </Text>


            {/* KATEGORI */}

            <Text style={s.label}>
              Kategori
            </Text>

            <Text style={s.detailValue}>
              {selected.id_kategori ??
                'Tanpa kategori'}
            </Text>


            {/* CATATAN */}

            <Text style={s.label}>
              Catatan
            </Text>

            <Text style={s.detailValue}>
              {selected.catatan ?? '-'}
            </Text>

          </View>


          {/* UBAH */}

          <Tombol
            title="Ubah"
            onPress={openEdit}
            disabled={busy}
          />


          {/* HAPUS */}

          <Tombol
            title="Hapus"
            onPress={confirmDelete}
            disabled={busy}
          />

        </ScrollView>

      </Shell>

    );
  }


  // ====================================================
  // FORM SCREEN
  // ====================================================

  function FormScreen({ mode }) {

  const isCreate = mode === 'create';

  return (

    <Shell>

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={s.flex}
      >

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.formContainer}
        >

          {/* HEADER */}
          <View style={s.formHeader}>

            <Pressable onPress={back}>
              <Ionicons
                name="chevron-back"
                size={28}
                color="#222222"
              />
            </Pressable>

            <Text style={s.formTitle}>
              {isCreate
                ? 'Tambah Pengeluaran'
                : 'Ubah Pengeluaran'}
            </Text>

            <View style={{ width: 28 }} />

          </View>


          {/* JUDUL */}
          <Text style={s.formLabel}>
            Judul
          </Text>

          <TextInput
            value={judul}
            onChangeText={setJudul}
            placeholder="Masukkan judul pengeluaran"
            placeholderTextColor="#999999"
            style={s.formInput}
            maxLength={100}
          />


          {/* NOMINAL */}
          <Text style={s.formLabel}>
            Nominal
          </Text>

          <TextInput
            value={nominal}
            onChangeText={setNominal}
            placeholder="Masukkan nominal"
            placeholderTextColor="#999999"
            keyboardType="numeric"
            style={s.formInput}
          />


          {/* KATEGORI */}
          {isCreate && (

            <>
              <Text style={s.formLabel}>
                Kategori
              </Text>

              <Pressable
                style={s.categoryDropdown}
                onPress={() => {

                  if (categories.length === 0) {
                    Alert.alert(
                      'Kategori',
                      'Belum ada kategori.'
                    );
                    return;
                  }

                  Alert.alert(
                    'Pilih Kategori',
                    '',
                    [
                      {
                        text: 'Tanpa kategori',
                        onPress: () =>
                          setCategoryId(null),
                      },

                      ...categories.map(
                        (category) => ({
                          text: category.nama,
                          onPress: () =>
                            setCategoryId(
                              category.id
                            ),
                        })
                      ),

                      {
                        text: 'Batal',
                        style: 'cancel',
                      },
                    ]
                  );

                }}
              >

                <Text
                  style={
                    categoryId === null
                      ? s.placeholderText
                      : s.selectedCategoryText
                  }
                >
                  {categoryId === null
                    ? 'Pilih kategori'
                    : categories.find(
                        (item) =>
                          item.id === categoryId
                      )?.nama}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={20}
                  color="#222222"
                />

              </Pressable>


              {/* INFO TANGGAL */}
              <View style={s.infoRow}>

                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#999999"
                />

                <Text style={s.infoText}>
                  Tanggal diisi otomatis oleh server
                </Text>

              </View>

            </>
          )}


          {/* ERROR */}
          {error && (
            <Text style={s.error}>
              {error}
            </Text>
          )}


          {/* SIMPAN */}
          <Pressable
            onPress={save}
            disabled={busy}
            style={[
              s.saveButton,
              busy && s.disabled,
            ]}
          >

            <Text style={s.saveButtonText}>
              {busy
                ? 'Menyimpan...'
                : 'Simpan'}
            </Text>

          </Pressable>

        </ScrollView>

      </KeyboardAvoidingView>

    </Shell>
  );
}

  // ====================================================
  // ROUTING SCREEN
  // ====================================================

  if (loading) {
    return <Loading />;
  }


  // Error khusus daftar
  if (
    error &&
    screen === 'list'
  ) {

    return <ErrorState />;

  }


  if (screen === 'list') {

    return <ListScreen />;

  }


  if (screen === 'detail') {

    return <DetailScreen />;

  }


  if (screen === 'create') {

    return (
      <FormScreen mode="create" />
    );

  }


  if (screen === 'edit') {

    return (
      <FormScreen mode="edit" />
    );

  }


  return <ListScreen />;
}


// ======================================================
// STYLE
// ======================================================

const s = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  flex: {
    flex: 1,
  },


  // =========================
  // LIST
  // =========================

  listScreen: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },

  title: {
    fontSize: 23,
    fontWeight: '700',
    color: '#2B2B2B',
    marginBottom: 2,
  },

  subtitle: {
    fontSize: 12,
    color: '#555555',
  },

  addButton: {
    backgroundColor: '#08C6B8',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 8,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },


  // =========================
  // EMPTY STATE
  // =========================

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 45,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#C9F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 5,
  },

  emptyDescription: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 17,
  },

  emptyButton: {
    marginTop: 18,
    backgroundColor: '#08C6B8',
    width: 118,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },


  // =========================
  // LIST DATA
  // =========================

  list: {
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
  },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    gap: 6,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },

  cardNominal: {
    fontSize: 16,
    fontWeight: '700',
  },


  // =========================
  // BOTTOM NAV
  // =========================

  bottomNav: {
    height: 78,
    borderTopWidth: 1,
    borderTopColor: '#D5D5D5',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  navItemActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 2,
    borderTopColor: '#08C6B8',
  },

  navText: {
    fontSize: 9,
    color: '#222222',
  },

  navTextActive: {
    fontSize: 9,
    color: '#08C6B8',
    fontWeight: '600',
  },


  // =========================
  // FORM
  // =========================

  formContainer: {
    paddingHorizontal: 0,
    paddingBottom: 30,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },

  formLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    marginTop: 12,
  },

  formInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#F7F7F7',
    borderRadius: 7,
    paddingHorizontal: 14,
    fontSize: 12,
    color: '#333333',
  },


  // =========================
  // CATEGORY DROPDOWN
  // =========================

  categoryDropdown: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#F7F7F7',
    borderRadius: 7,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  placeholderText: {
    color: '#999999',
    fontSize: 12,
  },

  selectedCategoryText: {
    color: '#333333',
    fontSize: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 7,
  },

  infoText: {
    color: '#999999',
    fontSize: 11,
  },


  // =========================
  // SAVE
  // =========================

  saveButton: {
    height: 40,
    marginTop: 35,
    backgroundColor: '#08C6B8',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },


  // =========================
  // DETAIL / GENERAL
  // =========================

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  back: {
    fontSize: 16,
    marginBottom: 20,
  },

  detailCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    marginBottom: 20,
    gap: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },

  detailValue: {
    fontSize: 16,
  },

  button: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#08C6B8',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  disabled: {
    opacity: 0.5,
  },

  muted: {
    color: '#666666',
  },

  error: {
    color: '#D32F2F',
    marginVertical: 10,
    textAlign: 'center',
  },

});