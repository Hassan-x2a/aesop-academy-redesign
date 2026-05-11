#!/usr/bin/env python3
"""
Sync scheduler config from Firebase to local cache file.
Run this before deploying or when secrets change.
"""

import json
import os
import sys
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("ERROR: firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

appdata = os.getenv('APPDATA')
if not appdata:
    print("ERROR: APPDATA environment variable not set")
    sys.exit(1)

sa_path = Path(appdata) / ".claude/polaris/firebase-keys/playagame-f733d-firebase-adminsdk-fbsvc-5f34b68387.json"

if not sa_path.exists():
    print(f"ERROR: Firebase service account not found at {sa_path}")
    sys.exit(1)

# Initialize Firebase
try:
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
    cred = credentials.Certificate(str(sa_path))
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"ERROR: Failed to connect to Firebase: {e}")
    sys.exit(1)

# Get scheduler config from Firebase
try:
    doc = db.collection('config').document('scheduler').get()
    if not doc.exists:
        print("ERROR: config/scheduler not found in Firebase")
        print("Run setup.py first to create scheduler config")
        sys.exit(1)

    config = doc.to_dict()
    print("[OK] Retrieved scheduler config from Firebase")

    # Remove non-serializable fields
    if 'updated_at' in config:
        del config['updated_at']

    # Save to cache file
    cache_path = Path(__file__).parent / ".config-cache"
    with open(cache_path, 'w') as f:
        json.dump(config, f, indent=2, default=str)
    os.chmod(cache_path, 0o600)

    print(f"[OK] Saved to {cache_path}")
    print(f"Keys in config: {', '.join(config.keys())}")

except Exception as e:
    print(f"ERROR: Failed to read Firebase config: {e}")
    sys.exit(1)
