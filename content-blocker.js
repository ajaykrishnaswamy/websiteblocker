// Content script for blocking websites without host permissions
// This runs when a blocked site is detected

(function() {
    'use strict';
    
    // Check if we've already injected our blocker
    if (document.getElementById('website-blocker-overlay')) {
        return;
    }

    // Create overlay to block the page
    const overlay = document.createElement('div');
    overlay.id = 'website-blocker-overlay';
    overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        z-index: 999999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: white !important;
    `;

    // Create content container
    const container = document.createElement('div');
    container.style.cssText = `
        text-align: center !important;
        max-width: 600px !important;
        padding: 40px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 20px !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
    `;

    // Get current domain
    const domain = window.location.hostname.replace(/^www\./, '');

    container.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">🚫</div>
        <h1 style="font-size: 32px; margin: 0 0 20px 0; font-weight: 600;">Website Blocked</h1>
        <p style="font-size: 18px; margin: 0 0 30px 0; opacity: 0.9;">
            Access to <strong>${domain}</strong> has been blocked to help you stay focused.
        </p>
        <div style="margin: 30px 0;">
            <button id="blocker-go-back" style="
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 15px 30px;
                font-size: 16px;
                border-radius: 30px;
                cursor: pointer;
                margin: 0 10px;
                transition: all 0.3s ease;
                font-weight: 500;
            ">Go Back</button>
            <button id="blocker-close-tab" style="
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 15px 30px;
                font-size: 16px;
                border-radius: 30px;
                cursor: pointer;
                margin: 0 10px;
                transition: all 0.3s ease;
                font-weight: 500;
            ">Close Tab</button>
        </div>
        <p style="font-size: 14px; opacity: 0.7; margin-top: 30px;">
            "The key is not to prioritize what's on your schedule, but to schedule your priorities." - Stephen Covey
        </p>
        <p style="font-size: 12px; opacity: 0.5; margin-top: 20px;">
            Website Blocker Extension • Focus Mode Active
        </p>
    `;

    overlay.appendChild(container);

    // Add button event listeners
    overlay.addEventListener('click', (e) => {
        if (e.target.id === 'blocker-go-back') {
            e.preventDefault();
            e.stopPropagation();
            history.back();
        } else if (e.target.id === 'blocker-close-tab') {
            e.preventDefault();
            e.stopPropagation();
            window.close();
        }
    });

    // Add hover effects
    overlay.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'BUTTON') {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(-2px)';
        }
    });

    overlay.addEventListener('mouseout', (e) => {
        if (e.target.tagName === 'BUTTON') {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(0)';
        }
    });

    // Add keyboard shortcut support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
            e.preventDefault();
            history.back();
        }
    });

    // Insert overlay into page
    document.documentElement.appendChild(overlay);

    // Hide page content
    if (document.body) {
        document.body.style.overflow = 'hidden';
    }

    console.log('Website blocked by Website Blocker extension');
})();
