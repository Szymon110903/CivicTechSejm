import asyncio
from curl_cffi.requests import AsyncSession

async def main():
    async with AsyncSession(impersonate="chrome110") as s:
        r = await s.get('https://api.sejm.gov.pl/sejm/term10/votings/26/26')
        print(f"Status: {r.status_code}")
        print(f"Content Type: {r.headers.get('content-type')}")
        print(r.text[:200])

if __name__ == "__main__":
    asyncio.run(main())
