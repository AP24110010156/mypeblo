import os
import shutil
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
from app.core.config import settings

class BaseStorageBackend(ABC):
    @abstractmethod
    def save_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """Saves file content to storage under key and returns public URL."""
        pass

    @abstractmethod
    def save_file_atomically(self, key: str, content: bytes, content_type: str = "application/json") -> str:
        """Atomically writes content to key so readers never see partial writes."""
        pass

    @abstractmethod
    def get_file(self, key: str) -> Optional[bytes]:
        """Retrieves raw content for key."""
        pass

    @abstractmethod
    def delete_file(self, key: str) -> bool:
        """Deletes file at key."""
        pass

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Returns full URL for key."""
        pass


class LocalStorageBackend(BaseStorageBackend):
    def __init__(self, base_dir: str = settings.STORAGE_BASE_DIR, public_base_url: str = settings.PUBLIC_BASE_URL):
        self.base_dir = Path(base_dir).resolve()
        self.public_base_url = public_base_url.rstrip('/')
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_full_path(self, key: str) -> Path:
        # Prevent directory traversal attacks
        clean_key = os.path.normpath(key).lstrip("/\\")
        full_path = (self.base_dir / clean_key).resolve()
        if not str(full_path).startswith(str(self.base_dir)):
            raise ValueError(f"Invalid storage key path: {key}")
        return full_path

    def save_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        target_path = self._get_full_path(key)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(content)
        return self.get_url(key)

    def save_file_atomically(self, key: str, content: bytes, content_type: str = "application/json") -> str:
        target_path = self._get_full_path(key)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write to temporary file in the same directory first, then atomic rename/replace
        temp_fd, temp_path = tempfile.mkstemp(dir=target_path.parent, prefix="pub_", suffix=".tmp")
        try:
            with os.fdopen(temp_fd, "wb") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())  # Ensure bytes are flushed to disk hardware
            
            # Atomic replace (on Windows & POSIX os.replace is atomic)
            os.replace(temp_path, target_path)
        except Exception:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise

        return self.get_url(key)

    def get_file(self, key: str) -> Optional[bytes]:
        target_path = self._get_full_path(key)
        if not target_path.exists():
            return None
        with open(target_path, "rb") as f:
            return f.read()

    def delete_file(self, key: str) -> bool:
        target_path = self._get_full_path(key)
        if target_path.exists():
            target_path.unlink()
            return True
        return False

    def get_url(self, key: str) -> str:
        clean_key = key.replace("\\", "/").lstrip("/")
        return f"{self.public_base_url}/storage/{clean_key}"


class CloudflareR2StorageBackend(BaseStorageBackend):
    """
    Cloudflare R2 Storage Backend (S3-compatible API).
    To switch to Cloudflare R2 in production, set STORAGE_TYPE=r2 in environment.
    """
    def __init__(self):
        # Requires boto3
        try:
            import boto3
        except ImportError:
            raise RuntimeError("boto3 package required for CloudflareR2StorageBackend")
        
        endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        self.s3_client = boto3.client(
            service_name="s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto"
        )
        self.bucket = settings.R2_BUCKET_NAME

    def save_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type
        )
        return self.get_url(key)

    def save_file_atomically(self, key: str, content: bytes, content_type: str = "application/json") -> str:
        # In S3/R2, put_object is inherently atomic! Single key uploads are committed atomically by object storage.
        return self.save_file(key, content, content_type)

    def get_file(self, key: str) -> Optional[bytes]:
        try:
            response = self.s3_client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except Exception:
            return None

    def delete_file(self, key: str) -> bool:
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False

    def get_url(self, key: str) -> str:
        return f"https://cdn.peblo.tv/{key}"


def get_storage_backend() -> BaseStorageBackend:
    if settings.STORAGE_TYPE.lower() == "r2":
        return CloudflareR2StorageBackend()
    return LocalStorageBackend()

storage_backend = get_storage_backend()
