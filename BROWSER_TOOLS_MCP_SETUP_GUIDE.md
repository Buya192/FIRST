# Panduan Setup Browser Tools MCP Server

## Status Instalasi
✅ **SELESAI**: MCP server browser-tools-mcp telah dikonfigurasi
✅ **SELESAI**: Browser-tools-server berjalan di port 3025
✅ **SELESAI**: Konfigurasi ditambahkan ke cline_mcp_settings.json

## Langkah-langkah yang Telah Dilakukan

### 1. Instalasi MCP Server
- MCP server dikonfigurasi dengan nama: `github.com/AgentDeskAI/browser-tools-mcp`
- Command: `npx @agentdeskai/browser-tools-mcp@latest`
- Status: Disabled = false, AutoApprove = []

### 2. Browser Tools Server
- Server middleware berjalan di: `http://localhost:3025`
- Status: ✅ Aktif dan berjalan

### 3. Konfigurasi File
File `cline_mcp_settings.json` telah diperbarui dengan konfigurasi:
```json
{
  "mcpServers": {
    "github.com/AgentDeskAI/browser-tools-mcp": {
      "command": "npx",
      "args": ["@agentdeskai/browser-tools-mcp@latest"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Langkah Selanjutnya yang Diperlukan

### 1. Restart VSCode/Cline
Untuk mengaktifkan MCP server yang baru dikonfigurasi:
- Tutup VSCode sepenuhnya
- Buka kembali VSCode
- MCP server akan otomatis terhubung

### 2. Install Chrome Extension (Opsional tapi Direkomendasikan)
Untuk fungsionalitas penuh:
1. Download: [BrowserTools Chrome Extension v1.2.0](https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip)
2. Extract file zip
3. Buka Chrome → Settings → Extensions → Developer mode ON
4. Click "Load unpacked" → pilih folder extension yang sudah di-extract
5. Buka Chrome DevTools (F12) → cari tab "BrowserToolsMCP"

### 3. Verifikasi Koneksi
Setelah restart, MCP server akan menyediakan tools berikut:
- `captureScreenshot` - Mengambil screenshot halaman
- `getConsoleLogs` - Mendapatkan console logs
- `getCurrentElement` - Mendapatkan elemen yang dipilih
- `runAccessibilityAudit` - Audit aksesibilitas
- `runPerformanceAudit` - Audit performa
- `runSEOAudit` - Audit SEO
- `runBestPracticesAudit` - Audit best practices
- `runAuditMode` - Menjalankan semua audit
- `runDebuggerMode` - Mode debugging lengkap

## Troubleshooting

### Jika MCP Server Tidak Terhubung:
1. Pastikan browser-tools-server masih berjalan di port 3025
2. Restart VSCode/Cline
3. Periksa apakah ada error di terminal

### Jika Tools Tidak Berfungsi:
1. Pastikan Chrome extension terinstall
2. Buka Chrome DevTools dan aktifkan panel BrowserToolsMCP
3. Pastikan ada tab aktif di browser

## Cara Menggunakan

Setelah setup selesai, Anda dapat menggunakan perintah seperti:
- "Ambil screenshot halaman ini"
- "Jalankan audit SEO pada halaman ini"
- "Periksa performa halaman ini"
- "Ambil console logs dari browser"

## Arsitektur Sistem

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│    Cline    │ ──► │  MCP Server  │ ──► │  Node Server  │ ──► │   Chrome    │
│   (VSCode)  │ ◄── │ (browser-    │ ◄── │ (port 3025)   │ ◄── │  Extension  │
│             │     │  tools-mcp)  │     │               │     │             │
└─────────────┘     └──────────────┘     └───────────────┘     └─────────────┘
```

## Status Saat Ini
- ✅ MCP Server: Dikonfigurasi
- ✅ Node Server: Berjalan (port 3025)
- ⏳ Koneksi MCP: Perlu restart VSCode
- ⏳ Chrome Extension: Belum terinstall (opsional)

**Langkah berikutnya: Restart VSCode untuk mengaktifkan MCP server**
