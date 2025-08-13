# Website Blocker Chrome Extension

A beautiful and functional Chrome extension to block distracting websites and help you stay focused and productive.

## Features

- 🚫 **Block websites** - Add any website to your block list
- 📊 **Track blocking stats** - See how many sites you've blocked today
- 🎯 **Beautiful UI** - Modern, gradient-based interface
- ⚡ **Fast performance** - Uses Chrome's declarativeNetRequest API
- 🔄 **Easy management** - Simple toggle to enable/disable blocking
- 💡 **Motivational blocked page** - Encouraging messages when you visit blocked sites

## Installation

1. **Download the extension files**
   - Save all the files in this repository to a single folder on your computer

2. **Create icon files (optional)**
   - The extension includes an SVG icon (`icon.svg`)
   - For best results, convert this to PNG files in these sizes:
     - `icon16.png` (16x16 pixels)
     - `icon32.png` (32x32 pixels) 
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
   - You can use online SVG to PNG converters or tools like GIMP/Photoshop
   - If you add icons, update the `manifest.json` file to reference them

3. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the folder containing the extension files
   - The extension icon will appear in your Chrome toolbar

## Usage

1. **Click the extension icon** in your Chrome toolbar to open the popup
2. **Add websites to block**:
   - Type a website URL (e.g., `facebook.com`, `reddit.com`, `youtube.com`)
   - Click "Add" or press Enter
3. **View your stats** - See how many sites you've blocked and blocks prevented today
4. **Toggle blocking** - Use the switch at the bottom to enable/disable blocking
5. **Remove sites** - Click the "Remove" button next to any blocked site

## How It Works

The extension uses Chrome's modern `declarativeNetRequest` API to:
- Intercept requests to blocked websites
- Redirect blocked sites to a motivational blocked page
- Track blocking attempts and display statistics
- Store your preferences securely in Chrome's sync storage

## Files Included

- `manifest.json` - Extension configuration and permissions
- `popup.html` - Beautiful popup interface HTML
- `popup.js` - Popup functionality and blocked site management
- `background.js` - Service worker for handling blocking rules
- `blocked.html` - Motivational page shown when visiting blocked sites
- `rules.json` - Static rules file for declarativeNetRequest
- `icon.svg` - SVG icon that can be converted to PNG formats
- `README.md` - This documentation file

## Customization

### Adding Custom Motivational Quotes
Edit the `motivationalQuotes` array in `blocked.html` to add your own inspiring messages.

### Styling Changes
The extension uses CSS custom properties and gradients. You can modify colors and styling in:
- `popup.html` (popup interface styles)
- `blocked.html` (blocked page styles)

### Adding Timer Features
You can extend the extension to add temporary blocking by modifying the storage logic in `popup.js` and `background.js`.

## Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Microsoft Edge (Chromium-based)
- ✅ Other Chromium-based browsers

## Privacy

This extension:
- ✅ Stores data locally in your browser
- ✅ Uses Chrome's sync storage (encrypted)
- ✅ Does not send data to external servers
- ✅ Does not track your browsing habits
- ✅ Only monitors sites you choose to block

## Support

If you encounter any issues:
1. Check the Chrome extension developer console
2. Make sure Developer Mode is enabled
3. Try reloading the extension
4. Check that all files are in the same folder

## License

This project is open source and available under the MIT License.

---

**Stay focused, stay productive!** 🎯
