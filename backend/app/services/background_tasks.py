import asyncio
import logging
from ..core.db import SessionLocal
from ..dependencies import get_sejm_client
from ..models import Proceeding
from .sejm_services import import_proceeding_votings

logger = logging.getLogger(__name__)

async def background_sync_proceedings():
    """
    Background task that periodically checks for new proceedings in the Sejm API
    and automatically imports missing votings to the local database.
    Runs every 24 hours.
    """
    await asyncio.sleep(60) # Wait 60 seconds after startup before the first run
    
    while True:
        logger.info("Starting background sync for proceedings...")
        db = SessionLocal()
        try:
            client = await get_sejm_client()
            term = 10 # Default term
            
            # Fetch all proceedings from API
            proceedings_api = await client.get_proceedings(term=term)
            
            # Fetch existing proceedings from DB
            existing_proceedings = db.query(Proceeding).filter_by(term=term).all()
            existing_ids = {p.proceeding_id for p in existing_proceedings}
            
            for p_api in proceedings_api:
                p_id = str(p_api.get("number"))
                if not p_id:
                    continue
                    
                if p_id not in existing_ids:
                    logger.info(f"Background Sync: Found missing proceeding {p_id}. Attempting to import...")
                    try:
                        result = await import_proceeding_votings(db, client, term, p_id)
                        if result.get("success"):
                            logger.info(f"Background Sync: Successfully imported proceeding {p_id}.")
                        else:
                            logger.warning(f"Background Sync: Failed to import proceeding {p_id}.")
                    except Exception as e:
                        logger.error(f"Background Sync: Error during import of {p_id}: {e}")
                        db.rollback()
                        
        except Exception as e:
            logger.error(f"Background Sync encountered an error: {e}")
        finally:
            db.close()
            
        logger.info("Background sync finished. Sleeping for 24 hours.")
        # Sleep for 24 hours (86400 seconds)
        await asyncio.sleep(86400)
