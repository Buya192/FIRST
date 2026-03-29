# 🚀 Quick Start Guide - PLN Marketplace Explorer

**Ready to explore PLN Marketplace in 5 minutes!**

## ⚡ Super Quick Setup (Windows)

### 1. **One-Click Setup**
```bash
# Double-click this file to setup everything automatically
setup.bat
```

### 2. **Add Your Credentials**
Edit `.env` file:
```env
PLN_USERNAME=your_marketplace_username
PLN_PASSWORD=your_marketplace_password
```

### 3. **Run Exploration**
```bash
# Activate environment
venv\Scripts\activate.bat

# Run exploration
python run_exploration.py
```

**That's it! 🎉**

---

## 📋 Manual Setup (if needed)

### Prerequisites
- ✅ Python 3.9+ installed
- ✅ Chrome browser installed
- ✅ Internet connection
- ✅ PLN Marketplace credentials

### Step-by-Step

#### 1. **Setup Environment**
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

#### 2. **Configure Credentials**
```bash
# Copy template
copy .env.example .env

# Edit .env file with your credentials
notepad .env
```

#### 3. **Run Exploration**
```bash
python run_exploration.py
```

---

## 🎯 What Happens During Exploration

### **Phase 1: Authentication** (30 seconds)
- ✅ Opens PLN Marketplace
- ✅ Logs in with your credentials
- ✅ Verifies access

### **Phase 2: Discovery** (2-3 minutes)
- 🔍 Maps all accessible menus
- 📊 Analyzes data tables
- 🔌 Discovers API endpoints
- 📸 Captures screenshots

### **Phase 3: Analysis** (30 seconds)
- 📝 Generates comprehensive report
- 🎯 Provides integration recommendations
- 💾 Saves all findings

---

## 📊 Expected Output

### **Files Generated:**
```
results/
├── exploration_results_20250611_165500.json  # Complete findings
├── screenshots/                              # Visual documentation
│   ├── 20250611_165501_login_page.png
│   ├── 20250611_165502_after_login.png
│   └── 20250611_165503_menu_penerimaan.png
└── logs/
    └── scraper.log                          # Detailed execution log
```

### **Console Output:**
```
🚀 PLN Marketplace Explorer
==================================================

✅ Created directory: logs
✅ Created directory: screenshots
✅ Created directory: config
✅ Created directory: results
✅ All dependencies are available

==================================================
PLN MARKETPLACE CREDENTIALS
==================================================
✅ Found credentials in environment for user: your_username

==================================================
STARTING PLN MARKETPLACE EXPLORATION
==================================================
🔍 Initializing exploration...
📍 Target URL: https://marketplace.pln.co.id
👤 Username: your_username
🖥️  Headless mode: True
📸 Screenshots: True

🚀 Starting exploration process...
[Detailed progress logs...]

==================================================
EXPLORATION COMPLETED!
==================================================
🔐 Authentication: ✅ SUCCESS
👤 User Role: Admin User
📋 Accessible Menus: 8
🔌 API Endpoints Found: 12
📸 Screenshots Taken: 15
📊 Data Samples: 3

📁 Results saved to: results/exploration_results_20250611_165500.json

🎯 KEY RECOMMENDATIONS:
  1. ✅ Authentication successful - credentials are valid
  2. ✅ Found 8 accessible menu items
  3. 🎯 HIGH PRIORITY: Penerimaan Barang menu found - ideal for material tracking
  4. 📋 MEDIUM PRIORITY: Purchase Order menu found - useful for PO tracking
  5. 🔌 Found 12 potential API endpoints
  6. 💡 RECOMMENDATION: Investigate API endpoints for direct data access
  7. 🔄 Forms found - bidirectional sync may be possible

📋 ACCESSIBLE MENUS:
  ✅ 📊 Pembelian - https://marketplace.pln.co.id/pembelian
  ✅ 📊 Penerimaan Barang - https://marketplace.pln.co.id/penerimaan
  ✅ 📊 Purchase Order - https://marketplace.pln.co.id/po
  ✅ 📄 Dashboard - https://marketplace.pln.co.id/dashboard
  ✅ 📄 Monitoring - https://marketplace.pln.co.id/monitoring

🔌 DISCOVERED API ENDPOINTS:
  • https://marketplace.pln.co.id/api/penerimaan/list
  • https://marketplace.pln.co.id/api/po/status
  • https://marketplace.pln.co.id/api/supplier/data
  • https://marketplace.pln.co.id/api/tracking/update
  • https://marketplace.pln.co.id/api/download/aktivitas
  ... and 7 more

📝 Updated markdown report: ../PLN_MARKETPLACE_EXPLORATION_REPORT.md

🎉 Exploration completed successfully!

Next steps:
1. Review the generated results file
2. Check screenshots for visual confirmation
3. Analyze discovered API endpoints
4. Plan bidirectional sync implementation
```

---

## 🔧 Troubleshooting

### **Common Issues & Solutions**

#### ❌ "Authentication Failed"
```bash
# Check credentials in .env file
notepad .env

# Verify marketplace access manually
# Open https://marketplace.pln.co.id in browser
```

#### ❌ "Chrome not found"
```bash
# Install Chrome browser
# Or update Chrome to latest version
```

#### ❌ "Dependencies missing"
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

#### ❌ "Permission denied"
```bash
# Run as administrator
# Or check antivirus settings
```

### **Debug Mode**
```bash
# Enable detailed logging
set DEBUG_MODE=true
set LOG_LEVEL=DEBUG
set SAVE_SCREENSHOTS=true

python run_exploration.py
```

---

## 🎯 Next Steps After Exploration

### **1. Review Results** (5 minutes)
- Open `results/exploration_results_*.json`
- Check `screenshots/` folder
- Review `PLN_MARKETPLACE_EXPLORATION_REPORT.md`

### **2. Plan Integration** (15 minutes)
- Identify priority menus for sync
- Review discovered API endpoints
- Plan bidirectional sync strategy

### **3. Implement Sync** (Next phase)
- Build data extraction service
- Implement Firebase integration
- Create React component enhancements

---

## 📞 Support

### **If you encounter issues:**

1. **Check logs**: `logs/scraper.log`
2. **Review screenshots**: `screenshots/` folder
3. **Verify credentials**: `.env` file
4. **Test manually**: Open marketplace in browser

### **Contact Information:**
- 📧 Technical issues: Check error logs
- 📋 Integration questions: Review generated report
- 🔧 Setup problems: Run `setup.bat` again

---

## 🏆 Success Criteria

### **Exploration is successful when you see:**
- ✅ Authentication: SUCCESS
- ✅ Accessible Menus: > 5
- ✅ Screenshots Taken: > 10
- ✅ API Endpoints Found: > 5
- ✅ Penerimaan Barang menu discovered

### **Ready for next phase when you have:**
- 📊 Complete data structure mapping
- 🔌 API endpoint documentation
- 📸 Visual confirmation screenshots
- 🎯 Integration recommendations
- 📝 Updated exploration report

---

**🚀 Ready to start? Run `setup.bat` and let's explore PLN Marketplace!**
