"""
PLN Marketplace Explorer
Comprehensive exploration tool for discovering marketplace structure and capabilities
"""
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import requests
from loguru import logger

from ..config.settings import settings


@dataclass
class MenuInfo:
    """Information about a marketplace menu item"""
    name: str
    url: str
    accessible: bool
    data_available: bool
    table_structure: Optional[Dict] = None
    form_elements: Optional[List[Dict]] = None
    api_endpoints: Optional[List[str]] = None


@dataclass
class ExplorationResult:
    """Complete exploration results"""
    timestamp: str
    authentication_success: bool
    user_role: Optional[str]
    accessible_menus: List[MenuInfo]
    discovered_apis: List[str]
    data_samples: Dict[str, Any]
    screenshots: List[str]
    network_logs: List[Dict]
    recommendations: List[str]


class PLNMarketplaceExplorer:
    """
    Comprehensive explorer for PLN Marketplace
    Discovers structure, capabilities, and integration opportunities
    """
    
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.driver: Optional[webdriver.Chrome] = None
        self.session = requests.Session()
        self.exploration_results = ExplorationResult(
            timestamp=datetime.now().isoformat(),
            authentication_success=False,
            user_role=None,
            accessible_menus=[],
            discovered_apis=[],
            data_samples={},
            screenshots=[],
            network_logs=[],
            recommendations=[]
        )
        
        # Setup logging
        logger.add(
            settings.LOG_FILE_PATH,
            rotation=settings.LOG_ROTATION,
            retention=settings.LOG_RETENTION,
            level=settings.LOG_LEVEL
        )
    
    def setup_driver(self) -> webdriver.Chrome:
        """Setup Chrome WebDriver with enhanced anti-detection configuration"""
        chrome_options = Options()
        
        if settings.HEADLESS_BROWSER:
            chrome_options.add_argument("--headless")
        
        chrome_options.add_argument(f"--window-size={settings.BROWSER_WINDOW_WIDTH},{settings.BROWSER_WINDOW_HEIGHT}")
        chrome_options.add_argument(f"--user-agent={settings.USER_AGENT}")
        
        # Enhanced anti-detection measures
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # Network and security enhancements
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--allow-running-insecure-content")
        chrome_options.add_argument("--ignore-certificate-errors")
        chrome_options.add_argument("--ignore-ssl-errors")
        chrome_options.add_argument("--ignore-certificate-errors-spki-list")
        chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        
        # Performance and stability
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-images")  # Faster loading
        
        # Enhanced logging
        chrome_options.add_argument("--enable-logging")
        chrome_options.add_argument("--log-level=0")
        chrome_options.add_argument("--v=1")
        
        # Create driver with webdriver-manager
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Enhanced timeouts
        driver.set_page_load_timeout(120)  # 2 minutes
        driver.implicitly_wait(30)  # 30 seconds
        
        # Execute script to remove webdriver property
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return driver
    
    def authenticate(self) -> bool:
        """
        Authenticate with PLN Marketplace
        Returns True if successful, False otherwise
        """
        try:
            logger.info("Starting authentication process...")
            
            self.driver = self.setup_driver()
            
            # First try to access the main page to check connectivity
            logger.info(f"Accessing main page: {settings.PLN_MARKETPLACE_URL}")
            self.driver.get(settings.PLN_MARKETPLACE_URL)
            
            # Wait for JavaScript to load (SPA application)
            logger.info("Waiting for JavaScript application to load...")
            time.sleep(10)  # Give time for SPA to initialize
            
            # Take screenshot of main page
            if settings.SAVE_SCREENSHOTS:
                self.save_screenshot("00_main_page")
            
            # Now try to navigate to login
            login_url = f"{settings.PLN_MARKETPLACE_URL}/login"
            logger.info(f"Navigating to login page: {login_url}")
            self.driver.get(login_url)
            
            # Wait for JavaScript to load (SPA application)
            logger.info("Waiting for JavaScript application to load...")
            time.sleep(10)  # Give time for SPA to initialize
            
            # Take screenshot of login page
            if settings.SAVE_SCREENSHOTS:
                self.save_screenshot("01_login_page")
            
            # Wait for login form to load with longer timeout
            wait = WebDriverWait(self.driver, 30)
            
            # Find username field (try multiple possible selectors)
            username_selectors = [
                "input[name='username']",
                "input[name='email']", 
                "input[type='email']",
                "input[id='username']",
                "input[id='email']",
                "#username",
                "#email"
            ]
            
            username_field = None
            for selector in username_selectors:
                try:
                    username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                    logger.info(f"Found username field with selector: {selector}")
                    break
                except TimeoutException:
                    continue
            
            if not username_field:
                logger.error("Could not find username field")
                return False
            
            # Find password field
            password_selectors = [
                "input[name='password']",
                "input[type='password']",
                "input[id='password']",
                "#password"
            ]
            
            password_field = None
            for selector in password_selectors:
                try:
                    password_field = self.driver.find_element(By.CSS_SELECTOR, selector)
                    logger.info(f"Found password field with selector: {selector}")
                    break
                except NoSuchElementException:
                    continue
            
            if not password_field:
                logger.error("Could not find password field")
                return False
            
            # Fill credentials
            logger.info("Filling login credentials...")
            username_field.clear()
            username_field.send_keys(self.username)
            
            password_field.clear()
            password_field.send_keys(self.password)
            
            # Find and click submit button
            submit_selectors = [
                "button[type='submit']",
                "input[type='submit']",
                "button:contains('Login')",
                "button:contains('Masuk')",
                ".btn-login",
                "#login-btn"
            ]
            
            submit_button = None
            for selector in submit_selectors:
                try:
                    submit_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    logger.info(f"Found submit button with selector: {selector}")
                    break
                except NoSuchElementException:
                    continue
            
            if not submit_button:
                logger.error("Could not find submit button")
                return False
            
            # Take screenshot before submit
            if settings.SAVE_SCREENSHOTS:
                self.save_screenshot("02_before_submit")
            
            # Submit login form
            logger.info("Submitting login form...")
            submit_button.click()
            
            # Wait for redirect or dashboard
            time.sleep(3)
            
            # Check if login was successful
            current_url = self.driver.current_url
            logger.info(f"Current URL after login: {current_url}")
            
            # Take screenshot after login
            if settings.SAVE_SCREENSHOTS:
                self.save_screenshot("03_after_login")
            
            # Check for login success indicators
            success_indicators = [
                "dashboard",
                "home",
                "main",
                "pembelian",
                "logout"
            ]
            
            login_success = any(indicator in current_url.lower() for indicator in success_indicators)
            
            if not login_success:
                # Check for dashboard elements
                dashboard_selectors = [
                    ".dashboard",
                    "#dashboard", 
                    ".main-content",
                    ".sidebar",
                    "nav",
                    ".navigation"
                ]
                
                for selector in dashboard_selectors:
                    try:
                        self.driver.find_element(By.CSS_SELECTOR, selector)
                        login_success = True
                        logger.info(f"Found dashboard element: {selector}")
                        break
                    except NoSuchElementException:
                        continue
            
            if login_success:
                logger.info("Authentication successful!")
                self.exploration_results.authentication_success = True
                
                # Try to extract user role/info
                self.extract_user_info()
                
                return True
            else:
                logger.error("Authentication failed - no success indicators found")
                return False
                
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return False
    
    def extract_user_info(self):
        """Extract user role and information from the interface"""
        try:
            # Look for user info in common locations
            user_selectors = [
                ".user-info",
                ".profile",
                ".username",
                ".user-name",
                "#user-info",
                ".navbar .user"
            ]
            
            for selector in user_selectors:
                try:
                    user_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    user_text = user_element.text.strip()
                    if user_text:
                        self.exploration_results.user_role = user_text
                        logger.info(f"Found user info: {user_text}")
                        break
                except NoSuchElementException:
                    continue
                    
        except Exception as e:
            logger.warning(f"Could not extract user info: {str(e)}")
    
    def explore_menu_structure(self) -> List[MenuInfo]:
        """
        Explore and document the complete menu structure
        """
        logger.info("Starting menu structure exploration...")
        
        try:
            # Find sidebar or navigation menu
            nav_selectors = [
                ".sidebar",
                ".navigation", 
                ".nav",
                ".menu",
                "#sidebar",
                "#navigation"
            ]
            
            nav_element = None
            for selector in nav_selectors:
                try:
                    nav_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    logger.info(f"Found navigation with selector: {selector}")
                    break
                except NoSuchElementException:
                    continue
            
            if not nav_element:
                logger.warning("Could not find navigation menu")
                return []
            
            # Extract menu items
            menu_selectors = [
                "a",
                ".menu-item",
                ".nav-item", 
                "li a",
                ".sidebar-item"
            ]
            
            menu_items = []
            for selector in menu_selectors:
                try:
                    items = nav_element.find_elements(By.CSS_SELECTOR, selector)
                    if items:
                        menu_items = items
                        logger.info(f"Found {len(items)} menu items with selector: {selector}")
                        break
                except NoSuchElementException:
                    continue
            
            accessible_menus = []
            
            for item in menu_items:
                try:
                    menu_text = item.text.strip()
                    menu_href = item.get_attribute("href")
                    
                    if not menu_text or not menu_href:
                        continue
                    
                    logger.info(f"Exploring menu: {menu_text} -> {menu_href}")
                    
                    # Click menu item and explore
                    menu_info = self.explore_menu_item(menu_text, menu_href, item)
                    if menu_info:
                        accessible_menus.append(menu_info)
                        
                except Exception as e:
                    logger.warning(f"Error exploring menu item: {str(e)}")
                    continue
            
            self.exploration_results.accessible_menus = accessible_menus
            return accessible_menus
            
        except Exception as e:
            logger.error(f"Error exploring menu structure: {str(e)}")
            return []
    
    def explore_menu_item(self, name: str, url: str, element) -> Optional[MenuInfo]:
        """
        Explore a specific menu item in detail
        """
        try:
            # Click the menu item
            element.click()
            time.sleep(2)
            
            current_url = self.driver.current_url
            logger.info(f"Navigated to: {current_url}")
            
            # Take screenshot
            if settings.SAVE_SCREENSHOTS:
                safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                self.save_screenshot(f"menu_{safe_name}")
            
            # Analyze page content
            page_source = self.driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')
            
            # Check for data tables
            tables = soup.find_all('table')
            table_structure = None
            
            if tables:
                # Analyze first table structure
                table = tables[0]
                headers = []
                
                # Extract headers
                header_row = table.find('thead') or table.find('tr')
                if header_row:
                    header_cells = header_row.find_all(['th', 'td'])
                    headers = [cell.get_text().strip() for cell in header_cells]
                
                table_structure = {
                    "headers": headers,
                    "row_count": len(table.find_all('tr')) - 1,  # Exclude header
                    "has_pagination": bool(soup.find_all(['pagination', '.pagination'])),
                    "has_filters": bool(soup.find_all(['filter', '.filter', 'search', '.search']))
                }
                
                logger.info(f"Found table with headers: {headers}")
            
            # Check for forms
            forms = soup.find_all('form')
            form_elements = []
            
            for form in forms:
                inputs = form.find_all(['input', 'select', 'textarea'])
                form_data = {
                    "action": form.get('action', ''),
                    "method": form.get('method', 'GET'),
                    "fields": [
                        {
                            "name": inp.get('name', ''),
                            "type": inp.get('type', inp.name),
                            "required": inp.has_attr('required')
                        }
                        for inp in inputs if inp.get('name')
                    ]
                }
                form_elements.append(form_data)
            
            # Extract sample data if available
            if name.lower() in ['penerimaan', 'penerimaan barang']:
                self.extract_penerimaan_data(soup)
            
            menu_info = MenuInfo(
                name=name,
                url=current_url,
                accessible=True,
                data_available=bool(tables or forms),
                table_structure=table_structure,
                form_elements=form_elements if form_elements else None
            )
            
            return menu_info
            
        except Exception as e:
            logger.error(f"Error exploring menu {name}: {str(e)}")
            return MenuInfo(
                name=name,
                url=url,
                accessible=False,
                data_available=False
            )
    
    def extract_penerimaan_data(self, soup: BeautifulSoup):
        """
        Extract sample data from Penerimaan Barang page
        """
        try:
            logger.info("Extracting Penerimaan Barang data...")
            
            # Find data table
            table = soup.find('table')
            if not table:
                logger.warning("No table found in Penerimaan page")
                return
            
            # Extract headers
            headers = []
            header_row = table.find('thead') or table.find('tr')
            if header_row:
                header_cells = header_row.find_all(['th', 'td'])
                headers = [cell.get_text().strip() for cell in header_cells]
            
            # Extract sample rows
            rows = table.find_all('tr')[1:]  # Skip header
            sample_data = []
            
            for row in rows[:5]:  # Take first 5 rows as sample
                cells = row.find_all(['td', 'th'])
                row_data = {}
                
                for i, cell in enumerate(cells):
                    if i < len(headers):
                        row_data[headers[i]] = cell.get_text().strip()
                
                if row_data:
                    sample_data.append(row_data)
            
            self.exploration_results.data_samples['penerimaan_barang'] = {
                "headers": headers,
                "sample_rows": sample_data,
                "total_rows": len(rows)
            }
            
            logger.info(f"Extracted {len(sample_data)} sample rows from Penerimaan Barang")
            
        except Exception as e:
            logger.error(f"Error extracting Penerimaan data: {str(e)}")
    
    def monitor_network_traffic(self):
        """
        Monitor and log network traffic to discover API endpoints
        """
        try:
            # Get browser logs
            logs = self.driver.get_log('performance')
            
            api_endpoints = []
            for log in logs:
                message = json.loads(log['message'])
                
                if message['message']['method'] == 'Network.responseReceived':
                    url = message['message']['params']['response']['url']
                    
                    # Filter for API-like URLs
                    if any(keyword in url.lower() for keyword in ['api', 'ajax', 'json', 'data']):
                        api_endpoints.append(url)
                        
                        self.exploration_results.network_logs.append({
                            "timestamp": log['timestamp'],
                            "url": url,
                            "method": message['message']['params']['response'].get('method', 'GET'),
                            "status": message['message']['params']['response'].get('status', 0)
                        })
            
            self.exploration_results.discovered_apis.extend(api_endpoints)
            logger.info(f"Discovered {len(api_endpoints)} potential API endpoints")
            
        except Exception as e:
            logger.warning(f"Could not monitor network traffic: {str(e)}")
    
    def save_screenshot(self, name: str):
        """Save screenshot with timestamp"""
        try:
            if not settings.SAVE_SCREENSHOTS:
                return
                
            screenshot_dir = Path(settings.SCREENSHOT_PATH)
            screenshot_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{name}.png"
            filepath = screenshot_dir / filename
            
            self.driver.save_screenshot(str(filepath))
            self.exploration_results.screenshots.append(str(filepath))
            
            logger.info(f"Screenshot saved: {filepath}")
            
        except Exception as e:
            logger.warning(f"Could not save screenshot: {str(e)}")
    
    def generate_recommendations(self):
        """
        Generate recommendations based on exploration findings
        """
        recommendations = []
        
        # Check authentication
        if self.exploration_results.authentication_success:
            recommendations.append("✅ Authentication successful - credentials are valid")
        else:
            recommendations.append("❌ Authentication failed - check credentials")
            return recommendations
        
        # Check accessible menus
        accessible_count = len(self.exploration_results.accessible_menus)
        if accessible_count > 0:
            recommendations.append(f"✅ Found {accessible_count} accessible menu items")
            
            # Check for priority menus
            menu_names = [menu.name.lower() for menu in self.exploration_results.accessible_menus]
            
            if any('penerimaan' in name for name in menu_names):
                recommendations.append("🎯 HIGH PRIORITY: Penerimaan Barang menu found - ideal for material tracking")
            
            if any('purchase' in name or 'po' in name for name in menu_names):
                recommendations.append("📋 MEDIUM PRIORITY: Purchase Order menu found - useful for PO tracking")
                
            if any('monitoring' in name for name in menu_names):
                recommendations.append("📊 MEDIUM PRIORITY: Monitoring menu found - potential real-time data")
        
        # Check data availability
        data_menus = [menu for menu in self.exploration_results.accessible_menus if menu.data_available]
        if data_menus:
            recommendations.append(f"📊 {len(data_menus)} menus contain data tables - good for scraping")
        
        # Check API endpoints
        if self.exploration_results.discovered_apis:
            recommendations.append(f"🔌 Found {len(self.exploration_results.discovered_apis)} potential API endpoints")
            recommendations.append("💡 RECOMMENDATION: Investigate API endpoints for direct data access")
        
        # Bidirectional sync assessment
        forms_found = any(menu.form_elements for menu in self.exploration_results.accessible_menus if menu.form_elements)
        if forms_found:
            recommendations.append("🔄 Forms found - bidirectional sync may be possible")
        else:
            recommendations.append("⚠️ No forms found - bidirectional sync may be limited to read-only")
        
        self.exploration_results.recommendations = recommendations
        return recommendations
    
    def run_complete_exploration(self) -> ExplorationResult:
        """
        Run complete exploration of PLN Marketplace
        """
        logger.info("Starting complete PLN Marketplace exploration...")
        
        try:
            # Step 1: Authentication
            if not self.authenticate():
                logger.error("Authentication failed - stopping exploration")
                return self.exploration_results
            
            # Step 2: Explore menu structure
            self.explore_menu_structure()
            
            # Step 3: Monitor network traffic
            self.monitor_network_traffic()
            
            # Step 4: Generate recommendations
            self.generate_recommendations()
            
            logger.info("Exploration completed successfully!")
            
        except Exception as e:
            logger.error(f"Exploration failed: {str(e)}")
        
        finally:
            if self.driver:
                self.driver.quit()
        
        return self.exploration_results
    
    def save_results_to_file(self, filepath: str):
        """Save exploration results to JSON file"""
        try:
            results_dict = asdict(self.exploration_results)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(results_dict, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Exploration results saved to: {filepath}")
            
        except Exception as e:
            logger.error(f"Could not save results: {str(e)}")


# CLI interface for running exploration
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python explorer.py <username> <password>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    explorer = PLNMarketplaceExplorer(username, password)
    results = explorer.run_complete_exploration()
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"exploration_results_{timestamp}.json"
    explorer.save_results_to_file(results_file)
    
    # Print summary
    print("\n" + "="*50)
    print("PLN MARKETPLACE EXPLORATION SUMMARY")
    print("="*50)
    print(f"Authentication: {'✅ SUCCESS' if results.authentication_success else '❌ FAILED'}")
    print(f"User Role: {results.user_role or 'Unknown'}")
    print(f"Accessible Menus: {len(results.accessible_menus)}")
    print(f"API Endpoints Found: {len(results.discovered_apis)}")
    print(f"Screenshots Taken: {len(results.screenshots)}")
    
    print("\nRecommendations:")
    for rec in results.recommendations:
        print(f"  {rec}")
    
    print(f"\nDetailed results saved to: {results_file}")
