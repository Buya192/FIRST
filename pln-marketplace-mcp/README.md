# PLN Marketplace MCP Server

Custom MCP Server untuk integrasi PLN Marketplace API dengan tools monitoring dan debugging yang komprehensif.

## 🚀 Features

### Core Tools
- **pln_authenticate** - Autentikasi dengan PLN Marketplace API
- **pln_fetch_orders** - Ambil delivery orders dari marketplace
- **pln_health_check** - Cek kesehatan API dan konektivitas
- **pln_get_order_details** - Detail informasi order tertentu

### Monitoring Tools
- **pln_monitor_start** - Mulai monitoring kontinyu API
- **pln_monitor_stop** - Stop monitoring
- **pln_get_metrics** - Dapatkan metrics performa API

### Testing Tools
- **pln_test_endpoint** - Test endpoint API dengan parameter custom

## 📦 Installation

```bash
cd pln-marketplace-mcp
npm install
npm run build
```

## 🔧 Configuration

Server akan menggunakan konfigurasi default:
- **Base URL**: https://apimarketplace.pln.co.id
- **Username**: adrianus.hito
- **Password**: @Dhi062025
- **Timeout**: 30 seconds

## 🎯 Usage Examples

### 1. Authenticate
```json
{
  "tool": "pln_authenticate",
  "arguments": {
    "username": "adrianus.hito",
    "password": "@Dhi062025"
  }
}
```

### 2. Fetch Orders
```json
{
  "tool": "pln_fetch_orders",
  "arguments": {
    "limit": 10,
    "status": "PROCCESSED"
  }
}
```

### 3. Health Check
```json
{
  "tool": "pln_health_check",
  "arguments": {}
}
```

### 4. Start Monitoring
```json
{
  "tool": "pln_monitor_start",
  "arguments": {
    "interval": "*/5 * * * *"
  }
}
```

### 5. Get Metrics
```json
{
  "tool": "pln_get_metrics",
  "arguments": {}
}
```

## 📊 Response Format

Semua tools mengembalikan response dalam format:
```json
{
  "success": true/false,
  "data": {...},
  "responseTime": "123ms",
  "timestamp": "2025-06-12T15:30:00.000Z"
}
```

## 🔍 Error Handling

- Automatic retry dengan exponential backoff
- Detailed error logging
- Health status tracking
- Performance metrics collection

## 🛠️ Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Production
npm start
```

## 📈 Monitoring

Server menyediakan real-time monitoring:
- API response times
- Success/error rates
- Memory usage
- Uptime statistics

## 🔐 Security

- Secure credential handling
- Token-based authentication
- Request timeout protection
- Error sanitization
