#!/usr/bin/env python3
"""
PLN Marketplace Exploration Runner
Quick setup and execution script for marketplace exploration
"""
import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.scraper.explorer import PLNMarketplaceExplorer
from src.config.settings import settings


def setup_directories():
    """Create necessary directories"""
    directories = [
        "logs",
        "screenshots", 
        "config",
        "results"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")


def check_dependencies():
    """Check if all required dependencies are available"""
    try:
        import selenium
        from bs4 import BeautifulSoup
        import requests
        from loguru import logger
        print("✅ All dependencies are available")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False


def get_credentials():
    """Get PLN Marketplace credentials"""
    print("\n" + "="*50)
    print("PLN MARKETPLACE CREDENTIALS")
    print("="*50)
    
    # Check if credentials are in environment
    username = os.getenv('PLN_USERNAME')
    password = os.getenv('PLN_PASSWORD')
    
    if username and password:
        print(f"✅ Found credentials in environment for user: {username}")
        return username, password
    
    # Get credentials from user input
    print("Please provide your PLN Marketplace credentials:")
    username = input("Username: ").strip()
    password = input("Password: ").strip()
    
    if not username or not password:
        print("❌ Username and password are required")
        return None, None
    
    return username, password


def run_exploration(username, password):
    """Run the complete marketplace exploration"""
    print("\n" + "="*50)
    print("STARTING PLN MARKETPLACE EXPLORATION")
    print("="*50)
    
    try:
        # Initialize explorer
        explorer = PLNMarketplaceExplorer(username, password)
        
        print("🔍 Initializing exploration...")
        print(f"📍 Target URL: {settings.PLN_MARKETPLACE_URL}")
        print(f"👤 Username: {username}")
        print(f"🖥️  Headless mode: {settings.HEADLESS_BROWSER}")
        print(f"📸 Screenshots: {settings.SAVE_SCREENSHOTS}")
        
        # Run exploration
        print("\n🚀 Starting exploration process...")
        results = explorer.run_complete_exploration()
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"results/exploration_results_{timestamp}.json"
        
        explorer.save_results_to_file(results_file)
        
        # Print summary
        print("\n" + "="*50)
        print("EXPLORATION COMPLETED!")
        print("="*50)
        
        print(f"🔐 Authentication: {'✅ SUCCESS' if results.authentication_success else '❌ FAILED'}")
        print(f"👤 User Role: {results.user_role or 'Unknown'}")
        print(f"📋 Accessible Menus: {len(results.accessible_menus)}")
        print(f"🔌 API Endpoints Found: {len(results.discovered_apis)}")
        print(f"📸 Screenshots Taken: {len(results.screenshots)}")
        print(f"📊 Data Samples: {len(results.data_samples)}")
        
        print(f"\n📁 Results saved to: {results_file}")
        
        # Print recommendations
        if results.recommendations:
            print("\n🎯 KEY RECOMMENDATIONS:")
            for i, rec in enumerate(results.recommendations, 1):
                print(f"  {i}. {rec}")
        
        # Print accessible menus
        if results.accessible_menus:
            print("\n📋 ACCESSIBLE MENUS:")
            for menu in results.accessible_menus:
                status = "✅" if menu.accessible else "❌"
                data_icon = "📊" if menu.data_available else "📄"
                print(f"  {status} {data_icon} {menu.name} - {menu.url}")
        
        # Print discovered APIs
        if results.discovered_apis:
            print("\n🔌 DISCOVERED API ENDPOINTS:")
            for api in results.discovered_apis[:5]:  # Show first 5
                print(f"  • {api}")
            if len(results.discovered_apis) > 5:
                print(f"  ... and {len(results.discovered_apis) - 5} more")
        
        # Update markdown report
        update_markdown_report(results, results_file)
        
        return results
        
    except Exception as e:
        print(f"\n❌ Exploration failed: {str(e)}")
        print("\nTroubleshooting tips:")
        print("1. Check your internet connection")
        print("2. Verify PLN Marketplace credentials")
        print("3. Ensure Chrome browser is installed")
        print("4. Check if marketplace website is accessible")
        return None


def update_markdown_report(results, results_file):
    """Update the markdown exploration report with findings"""
    try:
        report_file = Path("../PLN_MARKETPLACE_EXPLORATION_REPORT.md")
        
        if not report_file.exists():
            print("⚠️ Markdown report not found, skipping update")
            return
        
        # Read current report
        with open(report_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update status
        content = content.replace(
            "**Status**: 🔄 In Progress",
            f"**Status**: {'✅ Completed' if results.authentication_success else '❌ Failed'}"
        )
        
        # Update last updated
        content = content.replace(
            "**Last Updated**: June 11, 2025",
            f"**Last Updated**: {datetime.now().strftime('%B %d, %Y')}"
        )
        
        # Add exploration results section
        results_section = f"""

---

## 🔍 Latest Exploration Results

**Exploration Date**: {results.timestamp}  
**Results File**: `{results_file}`

### Authentication
- **Status**: {'✅ SUCCESS' if results.authentication_success else '❌ FAILED'}
- **User Role**: {results.user_role or 'Unknown'}

### Discovered Structure
- **Accessible Menus**: {len(results.accessible_menus)}
- **Data Tables Found**: {len([m for m in results.accessible_menus if m.data_available])}
- **API Endpoints**: {len(results.discovered_apis)}
- **Screenshots Captured**: {len(results.screenshots)}

### Key Findings
"""
        
        for rec in results.recommendations:
            results_section += f"- {rec}\n"
        
        # Insert before the appendices section
        if "## 📎 Appendices" in content:
            content = content.replace("## 📎 Appendices", results_section + "\n## 📎 Appendices")
        else:
            content += results_section
        
        # Write updated content
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"📝 Updated markdown report: {report_file}")
        
    except Exception as e:
        print(f"⚠️ Could not update markdown report: {str(e)}")


def main():
    """Main execution function"""
    print("🚀 PLN Marketplace Explorer")
    print("=" * 50)
    
    # Setup
    setup_directories()
    
    if not check_dependencies():
        return 1
    
    # Get credentials
    username, password = get_credentials()
    if not username or not password:
        return 1
    
    # Run exploration
    results = run_exploration(username, password)
    
    if results and results.authentication_success:
        print("\n🎉 Exploration completed successfully!")
        print("\nNext steps:")
        print("1. Review the generated results file")
        print("2. Check screenshots for visual confirmation")
        print("3. Analyze discovered API endpoints")
        print("4. Plan bidirectional sync implementation")
        return 0
    else:
        print("\n💥 Exploration failed. Please check credentials and try again.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
