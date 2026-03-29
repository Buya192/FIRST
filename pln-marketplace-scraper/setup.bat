@echo off
echo ========================================
echo PLN Marketplace Scraper Setup (Windows)
echo ========================================

echo.
echo 1. Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    echo Please ensure Python 3.9+ is installed
    pause
    exit /b 1
)

echo.
echo 2. Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo 3. Upgrading pip...
python -m pip install --upgrade pip

echo.
echo 4. Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 5. Creating directories...
mkdir logs 2>nul
mkdir screenshots 2>nul
mkdir config 2>nul
mkdir results 2>nul

echo.
echo 6. Setting up environment file...
if not exist .env (
    copy .env.example .env
    echo Created .env file from template
    echo Please edit .env file with your credentials
) else (
    echo .env file already exists
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file with your PLN Marketplace credentials
echo 2. Run: python run_exploration.py
echo.
echo To activate environment later: venv\Scripts\activate.bat
echo.
pause
