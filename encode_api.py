import os
import pickle
from pathlib import Path # Import Path for cleaner path handling
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from tqdm import tqdm
import shutil # For removing directories

# --- Supabase Client Initialization ---
# Your provided Supabase URL and Key are used here.
# Ensure 'Client' is imported along with 'create_client'
from supabase import create_client, Client # Added Client import
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://okopcegndkcirrzgtmhz.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rb3BjZWduZGtjaXJyemd0bWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzQ4ODIsImV4cCI6MjA2Mjg1MDg4Mn0.TBw4dEKR38pJdC7UsAv1yCYxqdp1maoR6tNFPPjFbzw")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Supabase client initialized with provided credentials.")


# Using Path objects for more robust and OS-agnostic path handling.
TEMP_FOLDER = Path("./temp_images")
ENCODING_FOLDER = Path("./encodings") # This folder is for local storage before upload

# Create folders if they don't exist
TEMP_FOLDER.mkdir(parents=True, exist_ok=True)
ENCODING_FOLDER.mkdir(parents=True, exist_ok=True)

# --- FastAPI App Initialization ---
app = FastAPI()

# --- Pydantic Request Models ---
class MahasiswaRequest(BaseModel):
    nim: str

class MergeEncodingsRequest(BaseModel):
    kodeKelas: str
    nim_list: List[str] # Expecting a list of strings for NIMs

# Fungsi untuk download semua foto mahasiswa dari Supabase (retained from your code)
def download_foto_mahasiswa(nim: str) -> Path: # Changed return type to Path
    bucket = "mira"
    supabase_path = f"mahasiswa/{nim}"
    local_folder = TEMP_FOLDER / nim # Using Path object
    local_folder.mkdir(parents=True, exist_ok=True)

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
                with open(local_folder / filename, "wb") as f: # Using Path object
                    f.write(content)
            except Exception as e:
                print(f"❌ Gagal download {remote_file_path}: {str(e)}")

    return local_folder


# Endpoint encode mahasiswa berdasarkan NIM (retained from your code, with minor Path adjustments)
@app.post("/encode")
def encode_mahasiswa_api(request: MahasiswaRequest):
    nim = request.nim
    bucket_name = "mira"

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

    try:
        import face_recognition
    except ImportError:
        raise HTTPException(status_code=500, detail="Library 'face_recognition' tidak ditemukan. Pastikan sudah terinstal.")


    for img_file in tqdm(image_files, desc=f"Encoding {nim}", unit="gambar"):
        image_path = local_dir / img_file # Using Path object
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

    # Langkah 3: Simpan ke file .dat secara lokal
    output_filename = f"ZZZ_{nim}_encoding.dat" # Changed extension to .dat
    local_output_path = ENCODING_FOLDER / output_filename # Using Path object
    with open(local_output_path, "wb") as f:
        pickle.dump({'encodings': encodings, 'names': names}, f)

    # --- Langkah Baru: Upload file .dat ke Supabase ---
    supabase_encoding_path = f"mahasiswa/{nim}/{output_filename}" # Path di Supabase
    uploaded_to_supabase = False
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
        raise HTTPException(status_code=500, detail=f"Gagal mengunggah encoding file ke Supabase: {str(e)}")


    # Langkah 4: Hapus folder temp dan file encoding lokal
    shutil.rmtree(local_dir, ignore_errors=True)
    if local_output_path.exists(): # Using Path object method
        os.remove(local_output_path) # Hapus juga file .dat lokal setelah diupload
        print(f"🗑️ File lokal {local_output_path} telah dihapus.")


    return {
        "message": f"✅ Encoding selesai untuk NIM {nim}",
        "encoded_faces": len(encodings),
        "local_output_file": str(local_output_path), # Convert Path to string for response
        "supabase_output_path": supabase_encoding_path if uploaded_to_supabase else "Gagal diupload",
        "uploaded_to_supabase": uploaded_to_supabase
    }

@app.post("/merge-encodings")
def merge_encodings_api(request: MergeEncodingsRequest):
    """
    Merges face encodings from individual NIMs stored in Supabase,
    then uploads the combined encoding file back to Supabase.
    """
    kode_kelas = request.kodeKelas
    nim_list = request.nim_list
    bucket_name = "mira"

    combined_encodings = []
    combined_names = []
    processed_nims = []
    failed_nims = []

    print(f"\n--- Memulai penggabungan encoding untuk Kode Kelas: {kode_kelas} ---")
    print(f"NIM yang akan digabungkan: {nim_list}")

    if not nim_list:
        raise HTTPException(status_code=400, detail="Daftar NIM tidak boleh kosong.")

    # Process each NIM to download and combine encodings
    for nim in tqdm(nim_list, desc="Menggabungkan encoding", unit="NIM"):
        encoding_filename = f"ZZZ_{nim}_encoding.dat" # Changed extension to .dat
        supabase_source_path = f"mahasiswa/{nim}/{encoding_filename}"
        local_temp_encoding_path = TEMP_FOLDER / encoding_filename # Using Path object for cleaner joins

        try:
            print(f"⬇️ Mengunduh {encoding_filename} dari {supabase_source_path}")
            content = supabase.storage.from_(bucket_name).download(supabase_source_path)

            # Check if content is empty or malformed
            if not content:
                raise ValueError(f"Konten kosong atau tidak valid diunduh untuk NIM: {nim}")

            with open(local_temp_encoding_path, "wb") as f:
                f.write(content)

            with open(local_temp_encoding_path, "rb") as f:
                data = pickle.load(f)
                # Basic validation for loaded data structure
                if 'encodings' not in data or 'names' not in data:
                    raise ValueError(f"Format file encoding tidak valid untuk NIM: {nim}")

                combined_encodings.extend(data['encodings'])
                combined_names.extend(data['names'])

            processed_nims.append(nim)
            print(f"✅ Berhasil memuat encoding untuk NIM: {nim}")

        except Exception as e:
            failed_nims.append(nim)
            print(f"❌ Gagal memuat encoding untuk NIM {nim} dari {supabase_source_path}: {str(e)}")
        finally:
            # Ensure the temporary file is removed
            if local_temp_encoding_path.exists():
                os.remove(local_temp_encoding_path)

    if not combined_encodings:
        raise HTTPException(
            status_code=400,
            detail="Tidak ada encoding yang berhasil digabungkan dari NIM yang diberikan. Pastikan NIM valid dan file encoding ada di Supabase."
        )

    # Prepare combined output file
    combined_output_filename = f"{kode_kelas}.dat" # Changed extension to .dat
    local_combined_output_path = ENCODING_FOLDER / combined_output_filename # Using Path object
    try:
        with open(local_combined_output_path, "wb") as f:
            pickle.dump({'encodings': combined_encodings, 'names': combined_names}, f)
        print(f"✅ Encoding gabungan lokal berhasil disimpan di: {local_combined_output_path}")
    except Exception as e:
        print(f"❌ Gagal menyimpan encoding gabungan lokal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan file encoding gabungan secara lokal: {str(e)}")


    # --- Upload to Supabase: mahasiswa/model/ ---
    supabase_destination_path_model = f"mahasiswa/model/{combined_output_filename}"
    uploaded_to_model = False
    try:
        with open(local_combined_output_path, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                file=f,
                path=supabase_destination_path_model,
                file_options={"x-upsert": "true"} # Overwrite if exists
            )
        uploaded_to_model = True
        print(f"✅ Encoding gabungan berhasil diunggah ke folder model.")
    except Exception as e:
        print(f"❌ Gagal mengunggah encoding gabungan ke folder model: {str(e)}")
        uploaded_to_model = False
        # Raise an HTTPException if upload fails, as it's a critical step
        raise HTTPException(status_code=500, detail=f"Gagal mengunggah encoding gabungan ke Supabase: {str(e)}")
    finally:
        # Clean up local combined file only after all operations (including upload) are attempted
        if local_combined_output_path.exists():
            os.remove(local_combined_output_path)
            print(f"🗑️ File lokal {local_combined_output_path} telah dihapus.")

    return {
        "message": f"✅ Penggabungan encoding selesai untuk Kode Kelas {kode_kelas}.",
        "total_encoded_faces": len(combined_encodings),
        "nims_processed": processed_nims,
        "nims_failed": failed_nims,
        "supabase_combined_file_path_model": supabase_destination_path_model if uploaded_to_model else "Gagal diupload ke folder model",
        "uploaded_to_supabase_model": uploaded_to_model
    }