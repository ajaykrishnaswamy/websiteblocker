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

            // Remove all existing dynamic rules first
            const existingDynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
            const dynamicRuleIds = existingDynamicRules.map(rule => rule.id);
            
            if (dynamicRuleIds.length > 0) {
                console.log('Removing existing dynamic rules:', dynamicRuleIds);
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: dynamicRuleIds
                });
                
                // Wait a bit to ensure rules are fully removed
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Add new rules if blocking is enabled
            if (isEnabled && blockedSites.length > 0) {
                const rules = [];
                
                // Generate unique rule IDs using timestamp and index to avoid conflicts
                const baseId = Date.now() % 1000000; // Use timestamp modulo to keep IDs reasonable
                let ruleIdCounter = 0;
                
                blockedSites.forEach((site, index) => {
                    const siteBaseId = baseId + (index * 100); // Space out rule IDs per site
                    
                    // Block main site with www subdomain
                    rules.push({
                        id: siteBaseId + ruleIdCounter++,
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
                        id: siteBaseId + ruleIdCounter++,
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
                    
                    ruleIdCounter = 0; // Reset counter for next site
                });

                console.log('Adding new rules:', rules.map(r => `ID: ${r.id}, Filter: ${r.condition.urlFilter}`));
                
                // Verify no duplicate IDs before adding
                const ruleIds = rules.map(r => r.id);
                const uniqueIds = new Set(ruleIds);
                if (ruleIds.length !== uniqueIds.size) {
                    throw new Error('Duplicate rule IDs detected in new rules');
                }
                
                await chrome.declarativeNetRequest.updateDynamicRules({
                    addRules: rules
                });

                console.log(`Successfully updated blocking rules for ${blockedSites.length} sites`);
            } else {
                console.log('Blocking disabled or no sites to block');
            }
        } catch (error) {
            console.error('Error updating blocking rules:', error);
            
            // If there's an error, try to clear all rules and start fresh
            try {
                const allRules = await chrome.declarativeNetRequest.getDynamicRules();
                const allRuleIds = allRules.map(rule => rule.id);
                if (allRuleIds.length > 0) {
                    console.log('Clearing all rules due to error...');
                    await chrome.declarativeNetRequest.updateDynamicRules({
                        removeRuleIds: allRuleIds
                    });
                }
            } catch (clearError) {
                console.error('Error clearing rules after failure:', clearError);
            }
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
