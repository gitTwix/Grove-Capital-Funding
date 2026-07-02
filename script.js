document.addEventListener('DOMContentLoaded', () => {

// =================================================================
// SCROLL PROGRESS BAR
// =================================================================
function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    const progressBar = document.getElementById('scrollProgressBar');
    if (progressBar) {
        progressBar.style.width = scrollPercent + '%';
    }
}

window.addEventListener('scroll', updateScrollProgress);

// =================================================================
// MOBILE SIDEBAR TOGGLE
// =================================================================
const menuToggle = document.getElementById('menuToggle');
const mobileSidebar = document.getElementById('mobileSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarLinks = document.querySelectorAll('.sidebar-links a');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        mobileSidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });
}

if (sidebarClose) {
    sidebarClose.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mobileSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mobileSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}

sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mobileSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
});

// =================================================================
// LOGO CLICK - SCROLL TO TOP
// =================================================================
const logo = document.querySelector('.logo a');
if (logo) {
    logo.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        if (menuToggle && mobileSidebar) {
            menuToggle.classList.remove('active');
            mobileSidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
}

// =================================================================
// SMOOTH SCROLLING FOR ANCHOR LINKS
// =================================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        
        if (targetId === '#') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// =================================================================
// ANIMATED COUNTER FOR STATS
// =================================================================
function animateCounter(element, target, duration = 2000) {
    let current = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.dataset.target);
                animateCounter(stat, target);
            });
            entry.target.dataset.animated = 'true';
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    counterObserver.observe(heroStats);
}

// =================================================================
// FUNDING CALCULATOR
// =================================================================
const fundingAmount = document.getElementById('fundingAmount');
const fundingAmountDisplay = document.getElementById('fundingAmountDisplay');
const termTypeButtons = document.querySelectorAll('.term-type-btn');
const fundingTerm = document.getElementById('fundingTerm');
const fundingTermDisplay = document.getElementById('fundingTermDisplay');
const fundingTermLabel = document.getElementById('fundingTermLabel');
const termRangeLabels = document.getElementById('termRangeLabels');
const businessType = document.getElementById('businessType');
const paymentResult = document.getElementById('monthlyPayment');
const paymentLabel = document.getElementById('paymentLabel');
const totalCost = document.getElementById('totalCost');
const estimatedRate = document.getElementById('estimatedRate');
const factorRate = document.getElementById('factorRate');
const factorRateDisplay = document.getElementById('factorRateDisplay');

let currentTermType = 'daily';

const dailyConfig = {
    min: 30,
    max: 180,
    step: 30,
    label: 'Funding Term (Days)',
};

const weeklyConfig = {
    min: 10,
    max: 52,
    step: 2,
    label: 'Funding Term (Weeks)',
};

function updateTermOptions() {
    const config = currentTermType === 'daily' ? dailyConfig : weeklyConfig;

    fundingTermLabel.textContent = config.label;

    fundingTerm.min = config.min;
    fundingTerm.max = config.max;
    fundingTerm.step = config.step;

    fundingTermDisplay.min = config.min;
    fundingTermDisplay.max = config.max;
    fundingTermDisplay.step = config.step;

    const midpoint = Math.round((config.min + config.max) / 2 / config.step) * config.step;
    fundingTerm.value = midpoint;
    fundingTermDisplay.value = midpoint;

    termRangeLabels.innerHTML = `<span>${config.min}</span><span>${config.max}</span>`;

    if (paymentLabel) {
        paymentLabel.textContent = currentTermType === 'daily' ? 'Daily Payment' : 'Weekly Payment';
    }

    calculateFunding();
}

function calculateFunding() {
    if (!fundingAmount || !fundingTerm || !businessType || !factorRate) return;

    const amount = parseFloat(fundingAmount.value) || 0;
    const termValue = parseInt(fundingTerm.value) || 30;
    const factor = parseFloat(factorRate.value);

    // Step 1: Total Cost = Amount x Factor Rate
    const totalCostAmount = amount * factor;

    // Step 2: Payment = Total Cost / Term (days or weeks as selected)
    const paymentAmount = totalCostAmount / termValue;

    if (paymentResult) {
        paymentResult.textContent = '$' + paymentAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    if (totalCost) {
        totalCost.textContent = '$' + totalCostAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    if (estimatedRate) {
        estimatedRate.textContent = factor.toFixed(2);
    }
}

if (fundingAmount && fundingTerm && businessType && factorRate) {

    fundingAmount.addEventListener('input', () => {
        if (fundingAmountDisplay) fundingAmountDisplay.value = fundingAmount.value;
        calculateFunding();
    });

    if (fundingAmountDisplay) {
        fundingAmountDisplay.addEventListener('input', () => {
            fundingAmount.value = fundingAmountDisplay.value;
            calculateFunding();
        });
    }

    fundingTerm.addEventListener('input', () => {
        if (fundingTermDisplay) fundingTermDisplay.value = fundingTerm.value;
        calculateFunding();
    });

    if (fundingTermDisplay) {
        fundingTermDisplay.addEventListener('input', () => {
            fundingTerm.value = fundingTermDisplay.value;
            calculateFunding();
        });
    }

    termTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            termTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTermType = btn.dataset.type;
            updateTermOptions();
        });
    });

    businessType.addEventListener('change', calculateFunding);

    factorRate.addEventListener('input', () => {
        if (factorRateDisplay) factorRateDisplay.textContent = parseFloat(factorRate.value).toFixed(2);
        calculateFunding();
    });

    // Initialize
    updateTermOptions();
    calculateFunding();
}
    
    
// =================================================================
// SCROLL REVEAL ANIMATIONS
// =================================================================
const revealElements = document.querySelectorAll('.service-card, .testimonial-card, .contact-card, .timeline-step');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// =================================================================
// ACTIVE NAVIGATION STATE
// =================================================================
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sidebarNavLinks = document.querySelectorAll('.sidebar-links a');

    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.clientHeight;

        if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });

    sidebarNavLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
});

// =================================================================
// IMAGE LIGHTBOX - ABOUT SECTION
// =================================================================
const aboutImage = document.querySelector('.about-image img');

if (aboutImage) {
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <img src="${aboutImage.src}" alt="${aboutImage.alt}">
        </div>
    `;
    document.body.appendChild(modal);

    aboutImage.style.cursor = 'pointer';
    aboutImage.addEventListener('click', () => {
        modal.classList.add('active');
    });

    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.remove('active');
        }
    });
}

// =================================================================
// FORM VALIDATION & SUBMISSION
// =================================================================
const form = document.getElementById('yourFormId');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
    });
}

}); // END DOMContentLoaded

// =================================================================
// PAGE LOAD ANIMATIONS
// =================================================================
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});