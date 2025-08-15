// Website Blocker Extension - Background Script (No Host Permissions)

class BackgroundBlockerNoHost {
    constructor() {
        this.init();
    }

    init() {
        // Initialize when extension starts
        chrome.runtime.onStartup.addListener(() => {
            console.log('Extension startup - updating blocking rules');
            this.updateBlockingRules();
        });

        // Initialize when extension is installed
        chrome.runtime.onInstalled.addListener((details) => {
            console.log('Extension installed/updated:', details.reason);
            this.setupDefaultSettings();
            this.updateBlockingRules();
        });

        // Listen for storage changes to update rules
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && (changes.blockedSites || changes.isEnabled)) {
                console.log('Storage changed, updating rules');
                this.updateBlockingRules();
            }
        });

        // Listen for tab activation to inject content scripts if needed
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.checkAndInjectBlockingScript(activeInfo.tabId);
        });

        // Listen for navigation events
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'loading' && tab.url) {
                this.checkAndInjectBlockingScript(tabId, tab.url);
            }
        });
    }

    async setupDefaultSettings() {
        try {
            const result = await chrome.storage.sync.get(['blockedSites', 'isEnabled', 'todayBlocks', 'lastResetDate']);
            
            const defaults = {
                blockedSites: result.blockedSites || [],
                isEnabled: result.isEnabled !== false,
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

            // Clear existing dynamic rules
            const existingDynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
            const dynamicRuleIds = existingDynamicRules.map(rule => rule.id);
            
            if (dynamicRuleIds.length > 0) {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: dynamicRuleIds
                });
            }

            // Add new blocking rules (pure blocking, no redirects)
            if (isEnabled && blockedSites.length > 0) {
                const rules = [];
                
                blockedSites.forEach((site, index) => {
                    // Block main site (PURE BLOCKING - no redirect)
                    rules.push({
                        id: index * 2 + 1,
                        priority: 1,
                        action: {
                            type: 'block'  // Pure blocking instead of redirect
                        },
                        condition: {
                            urlFilter: `*://*.${site}/*`,
                            resourceTypes: ['main_frame']
                        }
                    });

                    // Also block exact domain
                    rules.push({
                        id: index * 2 + 2,
                        priority: 1,
                        action: {
                            type: 'block'  // Pure blocking instead of redirect
                        },
                        condition: {
                            urlFilter: `*://${site}/*`,
                            resourceTypes: ['main_frame']
                        }
                    });
                });

                console.log('Adding new blocking rules (pure block):', rules.map(r => `ID: ${r.id}, Filter: ${r.condition.urlFilter}`));
                
                await chrome.declarativeNetRequest.updateDynamicRules({
                    addRules: rules
                });

                console.log(`Successfully updated blocking rules for ${blockedSites.length} sites (pure blocking)`);
            }
        } catch (error) {
            console.error('Error updating blocking rules:', error);
        }
    }

    async checkAndInjectBlockingScript(tabId, url = null) {
        try {
            const result = await chrome.storage.sync.get(['blockedSites', 'isEnabled']);
            const blockedSites = result.blockedSites || [];
            const isEnabled = result.isEnabled !== false;

            if (!isEnabled || blockedSites.length === 0) return;

            // Get tab URL if not provided
            if (!url) {
                const tab = await chrome.tabs.get(tabId);
                url = tab.url;
            }

            if (!url) return;

            // Extract domain from URL
            const domain = this.extractDomain(url);
            
            // Check if this domain is blocked
            const isBlocked = blockedSites.some(site => 
                domain === site || domain.endsWith('.' + site)
            );

            if (isBlocked) {
                // Inject content script to show blocking message
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content-blocker.js']
                    });
                    
                    await this.incrementBlockCount();
                } catch (e) {
                    console.log('Could not inject content script:', e.message);
                    // This is expected for chrome:// pages and other restricted URLs
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
            
            if (domain.startsWith('www.')) {
                domain = domain.substring(4);
            }
            
            return domain;
        } catch (error) {
            return '';
        }
    }

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
const backgroundBlocker = new BackgroundBlockerNoHost();

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateRules') {
        backgroundBlocker.updateBlockingRules();
        sendResponse({ success: true });
    } else if (message.action === 'getBadgeInfo') {
        backgroundBlocker.updateBadge();
        sendResponse({ success: true });
    }
    return true;
});

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        backgroundBlocker.updateBadge();
    }
});
