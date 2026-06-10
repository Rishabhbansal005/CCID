import hashlib
import httpx
from typing import Dict, Any

async def compute_hashes_from_url(url: str) -> Dict[str, str]:
    """
    Downloads a file from a URL in chunks and computes MD5, SHA1, and SHA256 hashes concurrently.
    This avoids loading the entire file into memory.
    """
    md5_hash = hashlib.md5()
    sha1_hash = hashlib.sha1()
    sha256_hash = hashlib.sha256()

    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes(chunk_size=8192):
                md5_hash.update(chunk)
                sha1_hash.update(chunk)
                sha256_hash.update(chunk)

    return {
        "md5": md5_hash.hexdigest(),
        "sha1": sha1_hash.hexdigest(),
        "sha256": sha256_hash.hexdigest(),
    }
