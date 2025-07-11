# utils/encryption.py

from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken
import os
import base64

cipher_suite = None # Initialize as None, set after successful loading
ENCRYPTION_KEY_LOADED = False # Flag to indicate if key was loaded successfully

try:
    raw_key = os.getenv("ENCRYPTION_KEY")
    if not raw_key:
        print("Encryption Utility: CRITICAL ERROR - ENCRYPTION_KEY environment variable is NOT SET. Encryption/Decryption will fail.")
        # Do NOT raise here immediately, allow the app to start but functions will fail
        # This allows other parts of the app to be debugged.
    else:
        # Fernet expects base64-encoded bytes.
        ENCRYPTION_KEY_BYTES = raw_key.encode('utf-8')
        
        # Basic validation for Fernet key format (44 characters, base64)
        if len(raw_key) != 44 or not all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=' for c in raw_key):
            print(f"Encryption Utility: WARNING - ENCRYPTION_KEY '{raw_key}' does not appear to be a valid 44-character base64 Fernet key.")
            print("Encryption Utility: Please ensure it was generated using `Fernet.generate_key().decode()`.")

        cipher_suite = Fernet(ENCRYPTION_KEY_BYTES)
        ENCRYPTION_KEY_LOADED = True
        print("Encryption Utility: Fernet cipher suite initialized successfully.")
        print(f"Encryption Utility: ENCRYPTION_KEY loaded (first 10 chars): '{raw_key[:10]}...'") # Log part of the key
except Exception as e:
    print(f"Encryption Utility: CRITICAL ERROR - Failed to initialize Fernet cipher suite: {e}. Encryption/Decryption will be non-functional.")
    # Do NOT re-raise here, let the app start but mark encryption as non-functional.


def encrypt(data: str) -> str:
    """
    Encrypts a string using Fernet symmetric encryption.
    """
    if not ENCRYPTION_KEY_LOADED or cipher_suite is None:
        print("Encryption Utility: ERROR - Encryption system not initialized. ENCRYPTION_KEY might be missing or invalid.")
        raise RuntimeError("Encryption system not initialized. ENCRYPTION_KEY might be missing or invalid.")
    try:
        encrypted_data = cipher_suite.encrypt(data.encode('utf-8'))
        print(f"Encryption Utility: Data encrypted. Original length: {len(data)}, Encrypted length: {len(encrypted_data.decode())}")
        print(f"Encryption Utility: Original data (first 20 chars): '{data[:20]}...'")
        print(f"Encryption Utility: Encrypted data (first 20 chars): '{encrypted_data.decode()[:20]}...'")
        return encrypted_data.decode('utf-8')
    except Exception as e:
        print(f"Encryption Utility: ERROR - Failed to encrypt data: {e}")
        raise

def decrypt(encrypted_data: str) -> str:
    """
    Decrypts a Fernet-encrypted string.
    """
    if not ENCRYPTION_KEY_LOADED or cipher_suite is None:
        print("Encryption Utility: ERROR - Decryption system not initialized. ENCRYPTION_KEY might be missing or invalid.")
        raise RuntimeError("Decryption system not initialized. ENCRYPTION_KEY might be missing or invalid.")

    if not isinstance(encrypted_data, str) or not encrypted_data:
        print(f"Encryption Utility: ERROR - Decryption input is invalid: '{encrypted_data}' (Type: {type(encrypted_data)})")
        raise ValueError("Encrypted data must be a non-empty string for decryption.")

    try:
        print(f"Encryption Utility: Attempting to decrypt data (first 20 chars): '{encrypted_data[:20]}...'")
        decrypted_data = cipher_suite.decrypt(encrypted_data.encode('utf-8'))
        print(f"Encryption Utility: Data decrypted successfully. Decrypted length: {len(decrypted_data.decode('utf-8'))}")
        return decrypted_data.decode('utf-8')
    except InvalidToken as e:
        print(f"Encryption Utility: ERROR - InvalidToken during decryption. This often means the ENCRYPTION_KEY is incorrect or the data is corrupted. Encrypted data received: '{encrypted_data}'")
        raise ValueError(f"Decryption failed: Invalid encryption token. Check ENCRYPTION_KEY consistency. Original error: {e}")
    except Exception as e:
        print(f"Encryption Utility: ERROR - An unexpected error occurred during decryption: {e}. Encrypted data received: '{encrypted_data}'")
        raise ValueError(f"Decryption failed: An unexpected error occurred. Original error: {e}")

