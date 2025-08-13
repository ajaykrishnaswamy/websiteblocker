// Website Blocker Extension - Popup Script

class WebsiteBlocker {
    constructor() {
        this.blockedSites = [];
        this.isEnabled = true;
        this.todayBlocks = 0;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.updateStats();
    }

    async loadData() {
        try {
            const result = await chrome.storage.sync.get([
                'blockedSites', 
                'isEnabled', 
                'todayBlocks', 
                'lastResetDate'
            ]);
            
            this.blockedSites = result.blockedSites || [];
            this.isEnabled = result.isEnabled !== false; // Default to true
            this.todayBlocks = result.todayBlocks || 0;
            
            // Reset daily count if it's a new day
            const today = new Date().toDateString();
            const lastReset = result.lastResetDate;
            if (lastReset !== today) {
                this.todayBlocks = 0;
                await chrome.storage.sync.set({
                    todayBlocks: 0,
                    lastResetDate: today
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async saveData() {
        try {
            await chrome.storage.sync.set({
                blockedSites: this.blockedSites,
                isEnabled: this.isEnabled,
                todayBlocks: this.todayBlocks
            });
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    setupEventListeners() {
        const addButton = document.getElementById('addButton');
        const websiteInput = document.getElementById('websiteInput');
        const enableToggle = document.getElementById('enableToggle');

        // Add website button
        addButton.addEventListener('click', () => this.addWebsite());

        // Enter key to add website
        websiteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addWebsite();
            }
        });

        // Toggle blocking
        enableToggle.addEventListener('click', () => this.toggleBlocking());
    }

    async addWebsite() {
        const input = document.getElementById('websiteInput');
        const url = input.value.trim().toLowerCase();

        if (!url) {
            this.showNotification('Please enter a website URL', 'error');
            return;
        }

        // Clean and validate URL
        const cleanUrl = this.cleanUrl(url);
        
        if (!this.isValidUrl(cleanUrl)) {
            this.showNotification('Please enter a valid website URL (e.g., facebook.com)', 'error');
            return;
        }

        if (this.blockedSites.includes(cleanUrl)) {
            this.showNotification('Website is already blocked', 'warning');
            return;
        }

        // Add to blocked sites
        this.blockedSites.push(cleanUrl);
        await this.saveData();
        await this.updateBlockingRules();
        
        // Update UI
        input.value = '';
        this.updateUI();
        this.updateStats();
        this.showNotification(`${cleanUrl} has been blocked`, 'success');
    }

    async removeWebsite(url) {
        const index = this.blockedSites.indexOf(url);
        if (index > -1) {
            this.blockedSites.splice(index, 1);
            await this.saveData();
            await this.updateBlockingRules();
            this.updateUI();
            this.updateStats();
            this.showNotification(`${url} has been unblocked`, 'success');
        }
    }

    async toggleBlocking() {
        this.isEnabled = !this.isEnabled;
        await this.saveData();
        await this.updateBlockingRules();
        this.updateToggleUI();
        
        const status = this.isEnabled ? 'enabled' : 'disabled';
        this.showNotification(`Website blocking ${status}`, 'info');
    }

    cleanUrl(url) {
        // Remove protocol if present
        url = url.replace(/^https?:\/\//, '');
        // Remove www. if present
        url = url.replace(/^www\./, '');
        // Remove trailing slash and path
        url = url.split('/')[0];
        // Remove port numbers
        url = url.split(':')[0];
        return url;
    }

    isValidUrl(url) {
        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(url) && url.includes('.');
    }

    async updateBlockingRules() {
        if (!chrome.declarativeNetRequest) {
            console.error('declarativeNetRequest API not available');
            return;
        }

        try {
            // Remove all existing rules
            const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
            const ruleIds = existingRules.map(rule => rule.id);
            
            if (ruleIds.length > 0) {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: ruleIds
                });
            }

            // Add new rules if blocking is enabled
            if (this.isEnabled && this.blockedSites.length > 0) {
                const rules = this.blockedSites.map((site, index) => ({
                    id: index + 1,
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: {
                            url: chrome.runtime.getURL('blocked.html')
                        }
                    },
                    condition: {
                        urlFilter: `*://*.${site}/*`,
                        resourceTypes: ['main_frame']
                    }
                }));

                await chrome.declarativeNetRequest.updateDynamicRules({
                    addRules: rules
                });
            }
        } catch (error) {
            console.error('Error updating blocking rules:', error);
        }
    }

    updateUI() {
        const sitesList = document.getElementById('sitesList');
        
        if (this.blockedSites.length === 0) {
            sitesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <p>No websites blocked yet.<br>Add some to get started!</p>
                </div>
            `;
        } else {
            sitesList.innerHTML = this.blockedSites.map(site => `
                <div class="site-item">
                    <span class="site-url">${site}</span>
                    <button class="remove-btn" data-url="${site}">Remove</button>
                </div>
            `).join('');

            // Add event listeners to remove buttons
            sitesList.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const url = e.target.getAttribute('data-url');
                    this.removeWebsite(url);
                });
            });
        }

        this.updateToggleUI();
    }

    updateToggleUI() {
        const enableToggle = document.getElementById('enableToggle');
        if (this.isEnabled) {
            enableToggle.classList.add('active');
        } else {
            enableToggle.classList.remove('active');
        }
    }

    updateStats() {
        document.getElementById('blockedCount').textContent = this.blockedSites.length;
        document.getElementById('todayBlocks').textContent = this.todayBlocks;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;

        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }

    // Increment today's block count (called from background script)
    async incrementBlockCount() {
        this.todayBlocks++;
        await chrome.storage.sync.set({ todayBlocks: this.todayBlocks });
        this.updateStats();
    }
}

// Initialize the website blocker when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new WebsiteBlocker();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'siteBlocked') {
        // Update block count when a site is blocked
        chrome.storage.sync.get(['todayBlocks'], (result) => {
            const newCount = (result.todayBlocks || 0) + 1;
            chrome.storage.sync.set({ todayBlocks: newCount });
        });
    }
});
