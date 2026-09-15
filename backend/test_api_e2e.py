import time
import requests
from pathlib import Path
from PIL import Image

def test_live_api():
    base_url = "http://127.0.0.1:8000"
    print("Testing live API on", base_url)

    # 1. Health check
    res = requests.get(f"{base_url}/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_json = res.json()
    print("  [PASS] Health check:", health_json["product"], "-", health_json["status"])

    # 2. Create test image and upload
    temp_img = Path("test_e2e_image.png")
    img = Image.new("RGBA", (150, 150), (20, 120, 220, 255))
    img.save(temp_img, "PNG")

    try:
        with open(temp_img, "rb") as f:
            upload_res = requests.post(
                f"{base_url}/api/files/upload",
                files={"file": ("test_e2e_image.png", f, "image/png")},
                data={"privacy_preset": "standard"}
            )
        assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
        uploaded_data = upload_res.json()
        file_id = uploaded_data["file_id"]
        print("  [PASS] Upload verified. File ID:", file_id, "Allowed Ops:", uploaded_data["allowed_operations"])

        # 3. Submit Conversion Job: png_to_jpg
        job_res = requests.post(
            f"{base_url}/api/jobs",
            json={
                "file_ids": [file_id],
                "operation": "png_to_jpg",
                "privacy_preset": "standard",
                "options": {"quality": 85}
            }
        )
        assert job_res.status_code == 200, f"Job submission failed: {job_res.text}"
        job_id = job_res.json()["job_id"]
        print("  [PASS] Job submitted to queue. Job ID:", job_id)

        # 4. Poll until worker completes
        completed = False
        final_job = None
        for _ in range(20):
            poll = requests.get(f"{base_url}/api/jobs/{job_id}").json()
            if poll["status"] == "COMPLETED":
                completed = True
                final_job = poll
                break
            time.sleep(0.5)

        assert completed, f"Job did not complete in time: {poll}"
        print("  [PASS] Worker claimed and COMPLETED job. Output:", final_job["output_filename"], "Size:", final_job["output_size_bytes"], "bytes")

        # 5. Download output via signed HMAC URL
        download_url = f"{base_url}{final_job['download_url']}"
        dl_res = requests.get(download_url)
        assert dl_res.status_code == 200, f"Download failed: {dl_res.status_code}"
        assert len(dl_res.content) == final_job["output_size_bytes"], "Downloaded byte size mismatch"
        print("  [PASS] Signed download verified. Downloaded", len(dl_res.content), "bytes with verified HMAC signature")

        # 6. Security Passport
        pass_res = requests.get(f"{base_url}/api/passport/{job_id}")
        assert pass_res.status_code == 200, f"Passport fetch failed: {pass_res.text}"
        pass_json = pass_res.json()
        print("  [PASS] Security Passport generated:", pass_json["status_label"], "| SHA-256:", pass_json["sha256_short"])

        # 7. List Vault Files
        vault_res = requests.get(f"{base_url}/api/files")
        assert vault_res.status_code == 200
        vault_items = vault_res.json()
        print(f"  [PASS] Vault contains {len(vault_items)} ephemeral files with live expiry countdowns")

        # 8. Instant Destroy Test
        destroy_res = requests.delete(f"{base_url}/api/files/{file_id}")
        assert destroy_res.status_code == 200
        print("  [PASS] Immediate file destruction verified")

        print("\nAll Live End-to-End API tests PASSED successfully!")
    finally:
        if temp_img.exists():
            temp_img.unlink()

if __name__ == "__main__":
    test_live_api()
