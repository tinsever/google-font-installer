document.addEventListener('DOMContentLoaded', () => {
    // Install Tab Switching
    const installTabs = document.querySelectorAll('.install-tabs:not(.demo-tabs) .tab-btn');
    const cmdContainers = document.querySelectorAll('.cmd-container');
    const feedback = document.querySelector('.copy-feedback');

    installTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all install tabs
            installTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all cmd containers
            cmdContainers.forEach(c => c.classList.remove('active'));
            
            // Show target container
            const targetId = `cmd-${tab.dataset.target}`;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Demo Tab Switching
    const demoTabs = document.querySelectorAll('.term-tab');
    const demoBodies = document.querySelectorAll('.terminal-body');

    demoTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all demo tabs
            demoTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all demo bodies
            demoBodies.forEach(b => b.classList.remove('active'));
            
            // Show target body
            const targetId = `demo-${tab.dataset.demoTarget}`;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Copy Functionality
    cmdContainers.forEach(container => {
        container.addEventListener('click', async () => {
            const textToCopy = container.dataset.copy;
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                
                // Show feedback
                feedback.classList.add('visible');
                
                // Hide feedback after 2 seconds
                setTimeout(() => {
                    feedback.classList.remove('visible');
                }, 2000);
                
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        });
    });

    // Optional: Add simple scroll reveal animation
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Select elements to animate
    const animatedElements = document.querySelectorAll('.feature-card, .terminal-window, .detail-block');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
});