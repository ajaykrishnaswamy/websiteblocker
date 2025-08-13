// Load and display statistics
async function loadStats() {
    try {
        // Try to get stats from extension storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.sync.get(['blockedSites', 'todayBlocks']);
            
            document.getElementById('totalBlocked').textContent = 
                result.blockedSites ? result.blockedSites.length : 0;
            document.getElementById('blockedToday').textContent = 
                result.todayBlocks || 0;
        } else {
            // Fallback if extension context not available
            document.getElementById('totalBlocked').textContent = '?';
            document.getElementById('blockedToday').textContent = '?';
        }
    } catch (error) {
        console.log('Could not load extension stats');
        document.getElementById('totalBlocked').textContent = '?';
        document.getElementById('blockedToday').textContent = '?';
    }
}

function openExtension() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Try to open extension popup
        chrome.runtime.sendMessage({action: 'openPopup'});
    } else {
        alert('Please click on the Website Blocker extension icon in your browser toolbar to manage blocked sites.');
    }
}

// Add some motivational quotes that rotate
const motivationalQuotes = [
    '"The key is not to prioritize what\'s on your schedule, but to schedule your priorities." - Stephen Covey',
    '"Focus on what matters most. Let go of what doesn\'t add value to your goals."',
    '"Productivity is not about doing more things. It\'s about doing the right things."',
    '"Your focus determines your reality. Choose wisely where you direct your attention."',
    '"Time is your most valuable asset. Protect it fiercely."',
    '"Success is the result of preparation, hard work, and learning from failure."'
];

function rotateQuote() {
    const motivationEl = document.querySelector('.motivation');
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    motivationEl.textContent = randomQuote;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    rotateQuote();
    
    // Add event listeners for buttons
    document.getElementById('goBackBtn').addEventListener('click', () => {
        history.back();
    });
    
    document.getElementById('manageBtn').addEventListener('click', () => {
        openExtension();
    });
    
    // Rotate quote every 10 seconds
    setInterval(rotateQuote, 10000);
});

// Add some keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Backspace') {
        history.back();
    }
});

