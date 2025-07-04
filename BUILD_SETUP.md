# Codemagic CI/CD Setup Guide

This guide will help you set up automated builds for Windows and macOS executables using Codemagic CI/CD.

## Prerequisites

1. **Codemagic Account**: Already linked to your GitHub repository
2. **Apple Developer Account**: For macOS code signing (optional but recommended)
3. **Windows Code Signing Certificate**: For Windows code signing (optional but recommended)

## Setup Steps

### 1. Install Dependencies Locally

First, install the new dependencies:

```bash
npm install
```

### 2. Test Local Build

Test that the build configuration works locally:

```bash
# Test webpack build
npm run build

# Test packaging (without signing)
npm run pack
```

### 3. Code Signing Setup

#### For macOS (Apple Developer Account Required)

1. **Export your Developer ID Certificate**:
   - Open Keychain Access
   - Find your "Developer ID Application" certificate
   - Right-click → Export
   - Choose "Personal Information Exchange (.p12)" format
   - Set a password and save

2. **Convert to Base64**:
   ```bash
   base64 -i your-certificate.p12 | pbcopy
   ```

3. **Add to Codemagic Environment Variables**:
   - Go to your Codemagic project settings
   - Add these environment variables:
     - `MAC_CERTS_BASE64`: Your base64-encoded certificate
     - `MAC_CERTS_PASSWORD`: The password you set when exporting
     - `MAC_DEVELOPER_NAME`: Your developer name (e.g., "John Doe")

#### For Windows (Code Signing Certificate Required)

1. **Export your Windows Certificate**:
   - Export your .pfx certificate file
   - Convert to Base64:
   ```bash
   base64 -i your-certificate.pfx | pbcopy
   ```

2. **Add to Codemagic Environment Variables**:
   - `WINDOWS_CERT_BASE64`: Your base64-encoded certificate
   - `WINDOWS_CERT_PASSWORD`: Certificate password

### 4. Additional Environment Variables

Add these to your Codemagic project:

- `PUBLISH_EMAIL`: Email address for build notifications
- `GITHUB_TOKEN`: GitHub personal access token for releases (optional)

### 5. GitHub Token Setup (Optional)

If you want automatic GitHub releases:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Add as `GITHUB_TOKEN` in Codemagic environment variables

### 6. App Icons

Create app icons for better branding:

- **Windows**: Create `build/icon.ico` (256x256 pixels)
- **macOS**: Create `build/icon.icns` (1024x1024 pixels)

### 7. Trigger Build

1. Push your changes to GitHub
2. Go to Codemagic dashboard
3. Select your repository
4. Click "Start new build"
5. Choose the workflow: "electron-build"

## Build Outputs

The build will create:

- **macOS**: `release/mac/Gig Money Tracker.dmg`
- **Windows**: `release/Gig Money Tracker Setup.exe`

## Troubleshooting

### Common Issues

1. **SQLite Native Module**: The build includes `better-sqlite3` native modules for both platforms
2. **Code Signing Errors**: Ensure certificates are properly exported and passwords are correct
3. **Build Failures**: Check the build logs in Codemagic dashboard

### Local Testing

Test builds locally before pushing:

```bash
# Test macOS build
npm run dist:mac

# Test Windows build
npm run dist:win
```

### Manual Code Signing (if needed)

If automatic signing fails, you can manually sign:

**macOS**:
```bash
codesign --force --deep --sign "Developer ID Application: Your Name" --entitlements build/entitlements.mac.plist "release/mac/Gig Money Tracker.app"
```

**Windows**:
```bash
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com /v "release/win-unpacked/Gig Money Tracker.exe"
```

## Security Notes

- Never commit certificates or passwords to your repository
- Use Codemagic's encrypted environment variables
- Regularly rotate your certificates and tokens
- Keep your Apple Developer account and Windows certificates up to date

## Next Steps

1. Set up your first build in Codemagic
2. Configure automatic builds on git push
3. Set up release notifications
4. Consider setting up beta testing channels 