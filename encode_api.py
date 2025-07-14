from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import pickle
import face_recognition
from tqdm import tqdm
from supabase import create_client
import shutil

app = FastAPI()

SUPABASE_URL = os.getenv("SUPABASE_URL", "ENV_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "ENV_SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Lokasi penyimpanan sementara & hasil encoding
TEMP_FOLDER = "temp_images"
ENCODING_FOLDER = "encodings" # Ini masih berguna untuk menyimpan secara lokal sebelum upload
os.makedirs(ENCODING_FOLDER, exist_ok=True)

# Request body schema
class MahasiswaRequest(BaseModel):
    nim: str

class MergeEncodingsRequest(BaseModel):
    kodeKelas: str
    nim_list: list[str]

# Fungsi untuk download semua foto mahasiswa dari Supabase (tidak berubah)
def download_foto_mahasiswa(nim: str) -> str:
    bucket = "mira"
    supabase_path = f"mahasiswa/{nim}"
    local_folder = os.path.join("temp_images", nim)
    os.makedirs(local_folder, exist_ok=True)

    try:
        file_list = supabase.storage.from_(bucket).list(supabase_path, {
            "limit": 1000,
            "offset": 0,
            "sortBy": {"column": "name", "order": "asc"}
        })
    except Exception as e:
        raise Exception(f"Gagal ambil daftar file dari Supabase: {str(e)}")

    if not file_list:
        raise Exception(f"Tidak ada file ditemukan di {supabase_path}")

    for item in file_list:
        filename = item["name"]
        if filename.lower().endswith((".jpg", ".jpeg", ".png")):
            remote_file_path = f"{supabase_path}/{filename}"
            try:
                content = supabase.storage.from_(bucket).download(remote_file_path)
                with open(os.path.join(local_folder, filename), "wb") as f:
                    f.write(content)
            except Exception as e:
                print(f"❌ Gagal download {remote_file_path}: {str(e)}")

    return local_folder


# Endpoint encode mahasiswa berdasarkan NIM
@app.post("/encode")
def encode_mahasiswa_api(request: MahasiswaRequest):
    nim = request.nim
    bucket_name = "mira" # Pastikan nama bucket Anda

    try:
        # Langkah 1: Download gambar
        local_dir = download_foto_mahasiswa(nim)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Gagal download gambar: {str(e)}")

    # Langkah 2: Proses encoding
    encodings = []
    names = []
    image_files = [f for f in os.listdir(local_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    if not image_files:
        # Hapus folder temp jika tidak ada gambar yang valid ditemukan
        shutil.rmtree(local_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Tidak ada gambar yang valid ditemukan.")

    for img_file in tqdm(image_files, desc=f"Encoding {nim}", unit="gambar"):
        image_path = os.path.join(local_dir, img_file)
        try:
            image = face_recognition.load_image_file(image_path)
            face_encs = face_recognition.face_encodings(image)
            if face_encs:
                encodings.append(face_encs[0])
                names.append(nim)
            else:
                print(f"⚠️ Wajah tidak terdeteksi di {img_file}")
        except Exception as e:
            print(f"❌ Error pada {img_file}: {str(e)}")

    if not encodings:
        # Hapus folder temp jika tidak ada wajah berhasil di-encode
        shutil.rmtree(local_dir, ignore_errors=True)
        raise HTTPException(status_code=422, detail="Tidak ada wajah berhasil di-encode.")

    # Langkah 3: Simpan ke file .pkl secara lokal
    output_filename = f"{nim}_encoding.pkl" # Ganti nama file agar lebih jelas
    local_output_path = os.path.join(ENCODING_FOLDER, output_filename)
    with open(local_output_path, "wb") as f:
        pickle.dump({'encodings': encodings, 'names': names}, f)

    # --- Langkah Baru: Upload file .pkl ke Supabase ---
    supabase_encoding_path = f"mahasiswa/{nim}/{output_filename}" # Path di Supabase
    try:
        with open(local_output_path, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                file=f,
                path=supabase_encoding_path,
                file_options={"x-upsert": "true"}
            )
        print(f"✅ Encoding file '{output_filename}' berhasil diunggah ke Supabase di: {supabase_encoding_path}")
        uploaded_to_supabase = True
    except Exception as e:
        print(f"❌ Gagal mengunggah encoding file ke Supabase: {str(e)}")
        uploaded_to_supabase = False


    # Langkah 4: Hapus folder temp dan file encoding lokal
    shutil.rmtree(local_dir, ignore_errors=True)
    if os.path.exists(local_output_path):
        os.remove(local_output_path) # Hapus juga file .pkl lokal setelah diupload

    return {
        "message": f"✅ Encoding selesai untuk NIM {nim}",
        "encoded_faces": len(encodings),
        "local_output_file": local_output_path, # Informasi opsional
        "supabase_output_path": supabase_encoding_path if uploaded_to_supabase else "Gagal diupload",
        "uploaded_to_supabase": uploaded_to_supabase
    }

@app.post("/merge-encodings")
def merge_encodings_api(request: MergeEncodingsRequest):
    kode_kelas = request.kodeKelas
    nim_list = request.nim_list
    bucket_name = "mira"
    
    combined_encodings = []
    combined_names = []
    processed_nims = []
    failed_nims = []

    print(f"\n--- Memulai penggabungan encoding untuk Kode Kelas: {kode_kelas} ---")
    print(f"NIM yang akan digabungkan: {nim_list}")

    for nim in tqdm(nim_list, desc="Menggabungkan encoding", unit="NIM"):
        encoding_filename = f"{nim}_encoding.pkl"
        supabase_source_path = f"mahasiswa/{nim}/{encoding_filename}"
        local_temp_encoding_path = os.path.join(TEMP_FOLDER, encoding_filename)

        try:
            print(f"⬇️ Mengunduh {encoding_filename} dari {supabase_source_path}")
            content = supabase.storage.from_(bucket_name).download(supabase_source_path)
            
            with open(local_temp_encoding_path, "wb") as f:
                f.write(content)
            
            with open(local_temp_encoding_path, "rb") as f:
                data = pickle.load(f)
                combined_encodings.extend(data['encodings'])
                combined_names.extend(data['names'])
            
            processed_nims.append(nim)
            print(f"✅ Berhasil memuat encoding untuk NIM: {nim}")

        except Exception as e:
            failed_nims.append(nim)
            print(f"❌ Gagal memuat encoding untuk NIM {nim} dari {supabase_source_path}: {str(e)}")
        finally:
            if os.path.exists(local_temp_encoding_path):
                os.remove(local_temp_encoding_path)

    if not combined_encodings:
        raise HTTPException(status_code=400, detail="Tidak ada encoding yang berhasil digabungkan dari NIM yang diberikan.")

    combined_output_filename = f"{kode_kelas}"
    local_combined_output_path = os.path.join(ENCODING_FOLDER, combined_output_filename)
    with open(local_combined_output_path, "wb") as f:
        pickle.dump({'encodings': combined_encodings, 'names': combined_names}, f)
    


    # --- Upload Kedua: ke mahasiswa/model/ ---
    supabase_destination_path_model = f"mahasiswa/model/{combined_output_filename}"
    uploaded_to_model = False
    try:
        print(f"⬆️ Mengunggah encoding gabungan ke folder model: {supabase_destination_path_model}")
        with open(local_combined_output_path, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                file=f,
                path=supabase_destination_path_model,
                file_options={"x-upsert": "true"}
            )
        uploaded_to_model = True
        print(f"✅ Encoding gabungan berhasil diunggah ke folder model.")
    except Exception as e:
        print(f"❌ Gagal mengunggah encoding gabungan ke folder model: {str(e)}")
        uploaded_to_model = False
    finally:
        # Hapus file encoding gabungan lokal setelah diunggah (pastikan kedua upload selesai)
        if os.path.exists(local_combined_output_path):
            os.remove(local_combined_output_path)

    return {
        "message": f"✅ Penggabungan encoding selesai untuk Kode Kelas {kode_kelas}.",
        "total_encoded_faces": len(combined_encodings),
        "nims_processed": processed_nims,
        "nims_failed": failed_nims,
        "supabase_combined_file_path_model": supabase_destination_path_model if uploaded_to_model else "Gagal diupload ke folder model",
        "uploaded_to_supabase_model": uploaded_to_model
    }
