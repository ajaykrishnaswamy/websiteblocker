// Website Blocker Extension - Background Script (Service Worker)

class BackgroundBlocker {
    constructor() {
        this.init();
    }

    init() {
        // Initialize when extension starts
        chrome.runtime.onStartup.addListener(() => {
            console.log('Extension startup - updating blocking rules');
            this.clearAllRulesAndReload();
        });

        // Initialize when extension is installed
        chrome.runtime.onInstalled.addListener((details) => {
            console.log('Extension installed/updated:', details.reason);
            this.setupDefaultSettings();
            this.clearAllRulesAndReload();
        });

        // Listen for storage changes to update rules
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && (changes.blockedSites || changes.isEnabled)) {
                console.log('Storage changed, updating rules');
                this.updateBlockingRules();
            }
        });

        // Listen for navigation events to track blocked attempts
        chrome.webNavigation.onBeforeNavigate.addListener((details) => {
            if (details.frameId === 0) { // Main frame only
                this.checkAndLogBlockedAttempt(details.url);
            }
        });
    }

    async clearAllRulesAndReload() {
        try {
            // Get all existing dynamic rules
            const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
            const ruleIds = existingRules.map(rule => rule.id);
            
            if (ruleIds.length > 0) {
                console.log('Clearing all existing dynamic rules:', ruleIds);
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: ruleIds
                });
            }
            
            // Wait a moment then update with current rules
            setTimeout(() => {
                this.updateBlockingRules();
            }, 100);
        } catch (error) {
            console.error('Error clearing rules:', error);
            // Still try to update rules
            this.updateBlockingRules();
        }
    }

    async setupDefaultSettings() {
        try {
            const result = await chrome.storage.sync.get(['blockedSites', 'isEnabled', 'todayBlocks', 'lastResetDate']);
            
            const defaults = {
                blockedSites: result.blockedSites || [],
                isEnabled: result.isEnabled !== false, // Default to true
                todayBlocks: result.todayBlocks || 0,
                lastResetDate: result.lastResetDate || new Date().toDateString()
            };

            await chrome.storage.sync.set(defaults);
        } catch (error) {
            console.error('Error setting up default settings:', error);
        }
    }

    async updateBlockingRules() {
        try {
            const result = await chrome.storage.sync.get(['blockedSites', 'isEnabled']);
            const blockedSites = result.blockedSites || [];
            const isEnabled = result.isEnabled !== false;

            // Remove all existing dynamic rules
            const existingDynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
            const dynamicRuleIds = existingDynamicRules.map(rule => rule.id);
            
            // Also get static rules to avoid conflicts
            const existingStaticRules = await chrome.declarativeNetRequest.getEnabledRulesets();
            console.log('Existing static rulesets:', existingStaticRules);
            
            if (dynamicRuleIds.length > 0) {
                console.log('Removing existing dynamic rules:', dynamicRuleIds);
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: dynamicRuleIds
                });
            }

            // Add new rules if blocking is enabled
            if (isEnabled && blockedSites.length > 0) {
                const rules = [];
                let ruleId = 100000; // Start from a very high number to avoid conflicts
                
                blockedSites.forEach((site, index) => {
                    // Block main site with www subdomain
                    rules.push({
                        id: ruleId++,
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
                    });

                    // Also block exact domain
                    rules.push({
                        id: ruleId++,
                        priority: 1,
                        action: {
                            type: 'redirect',
                            redirect: {
                                url: chrome.runtime.getURL('blocked.html')
                            }
                        },
                        condition: {
                            urlFilter: `*://${site}/*`,
                            resourceTypes: ['main_frame']
                        }
                    });
                });

                console.log('Adding new rules:', rules.map(r => `ID: ${r.id}, Filter: ${r.condition.urlFilter}`));
                
                await chrome.declarativeNetRequest.updateDynamicRules({
                    addRules: rules
                });

                console.log(`Successfully updated blocking rules for ${blockedSites.length} sites`);
            } else {
                console.log('Blocking disabled or no sites to block');
            }
        } catch (error) {
            console.error('Error updating blocking rules:', error);
        }
    }

    async checkAndLogBlockedAttempt(url) {
        try {
            const result = await chrome.storage.sync.get(['blockedSites', 'isEnabled']);
            const blockedSites = result.blockedSites || [];
            const isEnabled = result.isEnabled !== false;

            if (!isEnabled) return;

            // Extract domain from URL
            const domain = this.extractDomain(url);
            
            // Check if this domain is blocked
            const isBlocked = blockedSites.some(site => 
                domain === site || domain.endsWith('.' + site)
            );

            if (isBlocked) {
                await this.incrementBlockCount();
                
                // Send message to popup if it's open
                try {
                    await chrome.runtime.sendMessage({
                        action: 'siteBlocked',
                        domain: domain,
                        url: url
                    });
                } catch (e) {
                    // Popup might not be open, that's okay
                }
            }
        } catch (error) {
            console.error('Error checking blocked attempt:', error);
        }
    }

    async incrementBlockCount() {
        try {
            const result = await chrome.storage.sync.get(['todayBlocks', 'lastResetDate']);
            const today = new Date().toDateString();
            
            let todayBlocks = result.todayBlocks || 0;
            
            // Reset count if it's a new day
            if (result.lastResetDate !== today) {
                todayBlocks = 0;
            }
            
            todayBlocks++;
            
            await chrome.storage.sync.set({
                todayBlocks: todayBlocks,
                lastResetDate: today
            });
        } catch (error) {
            console.error('Error incrementing block count:', error);
        }
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname;
            
            // Remove www. prefix
            if (domain.startsWith('www.')) {
                domain = domain.substring(4);
            }
            
            return domain;
        } catch (error) {
            return '';
        }
    }

    // Handle extension icon badge
    async updateBadge() {
        try {
            const result = await chrome.storage.sync.get(['blockedSites', 'isEnabled']);
            const count = result.blockedSites ? result.blockedSites.length : 0;
            const isEnabled = result.isEnabled !== false;

            if (isEnabled && count > 0) {
                await chrome.action.setBadgeText({ text: count.toString() });
                await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
            } else {
                await chrome.action.setBadgeText({ text: '' });
            }
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }
}

// Initialize the background blocker
const backgroundBlocker = new BackgroundBlocker();

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateRules') {
        backgroundBlocker.updateBlockingRules();
        sendResponse({ success: true });
    } else if (message.action === 'getBadgeInfo') {
        backgroundBlocker.updateBadge();
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        backgroundBlocker.updateBadge();
    }
});
