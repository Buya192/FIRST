"""
PLN Marketplace Scraper Configuration
Simple configuration without pydantic to avoid conflicts
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file in the scraper directory
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

class Settings:
    """Simple settings class using environment variables"""
    
    def __init__(self):
        # PLN Marketplace Credentials
        self.PLN_USERNAME = os.getenv('PLN_USERNAME', '')
        self.PLN_PASSWORD = os.getenv('PLN_PASSWORD', '')
        self.PLN_MARKETPLACE_URL = os.getenv('PLN_MARKETPLACE_URL', 'https://marketplace.pln.co.id')
        
        # Firebase Configuration
        self.FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH', 'config/firebase-credentials.json')
        self.FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID', '')
        
        # Scraping Configuration
        self.SCRAPING_INTERVAL_MINUTES = int(os.getenv('SCRAPING_INTERVAL_MINUTES', '30'))
        self.MAX_RETRY_ATTEMPTS = int(os.getenv('MAX_RETRY_ATTEMPTS', '3'))
        self.REQUEST_TIMEOUT_SECONDS = int(os.getenv('REQUEST_TIMEOUT_SECONDS', '30'))
        self.PAGE_LOAD_TIMEOUT_SECONDS = int(os.getenv('PAGE_LOAD_TIMEOUT_SECONDS', '120'))
        
        # Browser Configuration
        self.HEADLESS_BROWSER = os.getenv('HEADLESS_BROWSER', 'false').lower() == 'true'
        self.BROWSER_WINDOW_WIDTH = int(os.getenv('BROWSER_WINDOW_WIDTH', '1920'))
        self.BROWSER_WINDOW_HEIGHT = int(os.getenv('BROWSER_WINDOW_HEIGHT', '1080'))
        self.USER_AGENT = os.getenv('USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        # Logging Configuration
        self.LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
        self.LOG_FILE_PATH = os.getenv('LOG_FILE_PATH', 'logs/scraper.log')
        self.LOG_ROTATION = os.getenv('LOG_ROTATION', '1 day')
        self.LOG_RETENTION = os.getenv('LOG_RETENTION', '30 days')
        
        # Sync Configuration
        self.ENABLE_BIDIRECTIONAL_SYNC = os.getenv('ENABLE_BIDIRECTIONAL_SYNC', 'true').lower() == 'true'
        self.SYNC_BATCH_SIZE = int(os.getenv('SYNC_BATCH_SIZE', '100'))
        self.CONFLICT_RESOLUTION_STRATEGY = os.getenv('CONFLICT_RESOLUTION_STRATEGY', 'marketplace_wins')
        
        # Rate Limiting
        self.REQUESTS_PER_MINUTE = int(os.getenv('REQUESTS_PER_MINUTE', '60'))
        self.CONCURRENT_REQUESTS = int(os.getenv('CONCURRENT_REQUESTS', '5'))
        
        # Monitoring & Alerts
        self.ENABLE_SENTRY = os.getenv('ENABLE_SENTRY', 'false').lower() == 'true'
        self.SENTRY_DSN = os.getenv('SENTRY_DSN', None)
        self.SLACK_WEBHOOK_URL = os.getenv('SLACK_WEBHOOK_URL', None)
        self.EMAIL_ALERTS_ENABLED = os.getenv('EMAIL_ALERTS_ENABLED', 'false').lower() == 'true'
        
        # Development Settings
        self.DEBUG_MODE = os.getenv('DEBUG_MODE', 'false').lower() == 'true'
        self.SAVE_SCREENSHOTS = os.getenv('SAVE_SCREENSHOTS', 'true').lower() == 'true'
        self.SCREENSHOT_PATH = os.getenv('SCREENSHOT_PATH', 'screenshots')

# Global settings instance
settings = Settings()

# Collection names mapping
COLLECTIONS = {
    "material_tracking": "materialTracking",
    "marketplace_sync": "marketplaceSync", 
    "delivery_notifications": "deliveryNotifications",
    "sync_logs": "syncLogs",
    "scraping_metrics": "scrapingMetrics"
}

# Status mappings between marketplace and our app
STATUS_MAPPING = {
    "marketplace_to_app": {
        "PROCCESSED": "processing",
        "PENDING": "pending", 
        "DELIVERED": "delivered",
        "SHIPPED": "in_transit",
        "CANCELLED": "cancelled"
    },
    "app_to_marketplace": {
        "received": "DELIVERED",
        "processing": "PROCCESSED", 
        "pending": "PENDING",
        "in_transit": "SHIPPED",
        "cancelled": "CANCELLED"
    }
}

# Priority levels for different data types
SYNC_PRIORITIES = {
    "status_updates": 1,  # Highest priority
    "eta_changes": 2,
    "new_shipments": 3,
    "supplier_updates": 4,
    "general_data": 5     # Lowest priority
}

# Retry configuration for different operations
RETRY_CONFIG = {
    "authentication": {
        "max_attempts": 5,
        "backoff_factor": 2,
        "max_delay": 300  # 5 minutes
    },
    "data_extraction": {
        "max_attempts": 3,
        "backoff_factor": 1.5,
        "max_delay": 60   # 1 minute
    },
    "api_calls": {
        "max_attempts": 3,
        "backoff_factor": 2,
        "max_delay": 120  # 2 minutes
    }
}
