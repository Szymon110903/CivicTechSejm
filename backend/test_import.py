#!/usr/bin/env python3
"""Test script to validate sejm_client refactoring"""

import sys
import asyncio
import os

# Ensure we're running from backend directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

try:
    print("1. Testing base imports...")
    from app.sejm_client.base import BaseClient, JSONDict, JSONList, JSONResponse
    print("   ✓ BaseClient imports OK")
    
    print("2. Testing mixin imports...")
    from app.sejm_client.mps import MPsMixin
    from app.sejm_client.organs import OrgansMixin
    from app.sejm_client.votings import VotingsMixin
    from app.sejm_client.legislative import LegislativeMixin
    print("   ✓ All mixins import OK")
    
    print("3. Testing main SejmAPIClient import...")
    from app.sejm_client import SejmAPIClient
    print("   ✓ SejmAPIClient imports OK")
    
    print("4. Testing SejmAPIClient methods...")
    client = SejmAPIClient()
    methods_to_check = [
        'get_mps', 'get_mp',
        'get_clubs', 'get_club', 'get_committees', 'get_committee',
        'get_votings',
        'get_terms', 'get_bills', 'get_proceedings', 'get_processes',
        'get_interpellations', 'get_written_questions',
        'close'
    ]
    
    for method in methods_to_check:
        if hasattr(client, method):
            print(f"   ✓ {method}")
        else:
            print(f"   ✗ MISSING: {method}")
            sys.exit(1)
    
    print("\n✅ All tests passed!")
    asyncio.run(client.close())
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
