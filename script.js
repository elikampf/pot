/**
 * PRISM OF TORAH - MASTER JAVASCRIPT
 * Handles all interactive functionality for the website
 */

(function() {
    'use strict';

    // ===================================
    // UTILITY FUNCTIONS
    // ===================================

    const utils = {
        // DOM element selector with error handling
        $(selector, context = document) {
            return context.querySelector(selector);
        },

        // Multiple DOM elements selector
        $$(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        },

        // Debounce function for performance
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function for scroll events
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Animate element with CSS classes
        animate(element, animationClass, duration = 300) {
            return new Promise(resolve => {
                element.classList.add(animationClass);
                setTimeout(() => {
                    element.classList.remove(animationClass);
                    resolve();
                }, duration);
            });
        },

        // Screen reader announcements
        announce(message) {
            const announcer = utils.$('#announcements');
            if (announcer) {
                announcer.textContent = message;
                setTimeout(() => {
                    announcer.textContent = '';
                }, 1000);
            }
        },

        // Email validation
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // Format time for audio player
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    };

    // ===================================
    // NAVIGATION FUNCTIONALITY
    // ===================================

    const Navigation = {
        init() {
            this.setupMobileMenu();
            this.setupDropdowns();
            this.setupActiveStates();
            this.setupSmoothScrolling();
        },

        setupMobileMenu() {
            const toggle = utils.$('.nav__toggle');
            const menu = utils.$('.nav__menu');
            
            if (!toggle || !menu) return;

            toggle.addEventListener('click', () => {
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                
                toggle.setAttribute('aria-expanded', !isExpanded);
                menu.setAttribute('aria-expanded', !isExpanded);
                
                // Toggle hamburger animation
                toggle.classList.toggle('nav__toggle--active');
                
                // Prevent body scroll when menu is open
                document.body.style.overflow = isExpanded ? '' : 'hidden';
                
                utils.announce(isExpanded ? 'Menu closed' : 'Menu opened');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!toggle.contains(e.target) && !menu.contains(e.target)) {
                    toggle.setAttribute('aria-expanded', 'false');
                    menu.setAttribute('aria-expanded', 'false');
                    toggle.classList.remove('nav__toggle--active');
                    document.body.style.overflow = '';
                }
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                    toggle.setAttribute('aria-expanded', 'false');
                    menu.setAttribute('aria-expanded', 'false');
                    toggle.classList.remove('nav__toggle--active');
                    document.body.style.overflow = '';
                    toggle.focus();
                }
            });
        },

        setupDropdowns() {
            const dropdownItems = utils.$$('.nav__item--dropdown');
            
            dropdownItems.forEach(item => {
                const link = utils.$('.nav__link', item);
                const dropdown = utils.$('.nav__dropdown', item);
                
                if (!link || !dropdown) return;

                // Handle hover for desktop
                item.addEventListener('mouseenter', () => {
                    link.setAttribute('aria-expanded', 'true');
                    dropdown.style.display = 'block';
                });

                item.addEventListener('mouseleave', () => {
                    link.setAttribute('aria-expanded', 'false');
                    setTimeout(() => {
                        if (link.getAttribute('aria-expanded') === 'false') {
                            dropdown.style.display = 'none';
                        }
                    }, 150);
                });

                // Handle keyboard navigation
                link.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const isExpanded = link.getAttribute('aria-expanded') === 'true';
                        link.setAttribute('aria-expanded', !isExpanded);
                        dropdown.style.display = isExpanded ? 'none' : 'block';
                    }
                });
            });
        },

        setupActiveStates() {
            const currentPath = window.location.pathname;
            const navLinks = utils.$$('.nav__link');
            
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPath || (currentPath === '/' && href === '/')) {
                    link.classList.add('nav__link--active');
                }
            });
        },

        setupSmoothScrolling() {
            const scrollLinks = utils.$$('a[href^="#"]');
            
            scrollLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = utils.$(`#${targetId}`);
                    
                    if (targetElement) {
                        e.preventDefault();
                        const headerHeight = utils.$('.header').offsetHeight || 0;
                        const targetPosition = targetElement.offsetTop - headerHeight - 20;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                        
                        // Focus management for accessibility
                        setTimeout(() => {
                            targetElement.focus();
                            targetElement.scrollIntoView({ block: 'nearest' });
                        }, 500);
                    }
                });
            });
        }
    };

    // ===================================
    // AUDIO PLAYER FUNCTIONALITY
    // ===================================

    const AudioPlayer = {
        init() {
            this.setupPlayers();
        },

        setupPlayers() {
            const players = utils.$$('.episode-player, .player');
            
            players.forEach(player => {
                this.initializePlayer(player);
            });
        },

        initializePlayer(playerElement) {
            const playBtn = utils.$('.player__btn--play, .episode-card__play', playerElement);
            const progressBar = utils.$('.player__progress-fill', playerElement);
            const currentTime = utils.$('.player__current', playerElement);
            const totalTime = utils.$('.player__total', playerElement);
            const volumeBtn = utils.$('.player__btn--volume', playerElement);
            
            if (!playBtn) return;

            let isPlaying = false;
            let currentAudio = null;
            let progress = 0;
            const duration = this.parseDuration(totalTime?.textContent || '0:00');

            playBtn.addEventListener('click', () => {
                isPlaying = !isPlaying;
                
                if (isPlaying) {
                    this.playAudio(playerElement);
                    playBtn.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                        </svg>
                    `;
                    playBtn.setAttribute('aria-label', 'Pause episode');
                    utils.animate(playBtn, 'scale-110');
                } else {
                    this.pauseAudio(playerElement);
                    playBtn.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M8 5v14l11-7z" fill="currentColor"/>
                        </svg>
                    `;
                    playBtn.setAttribute('aria-label', 'Play episode');
                }
                
                utils.announce(isPlaying ? 'Playing episode' : 'Episode paused');
            });

            // Simulate progress for demo
            if (progressBar && currentTime) {
                const updateProgress = () => {
                    if (isPlaying && progress < duration) {
                        progress += 1;
                        const percentage = (progress / duration) * 100;
                        progressBar.style.width = `${percentage}%`;
                        currentTime.textContent = utils.formatTime(progress);
                    }
                };

                setInterval(updateProgress, 1000);
            }

            // Volume control
            if (volumeBtn) {
                volumeBtn.addEventListener('click', () => {
                    volumeBtn.classList.toggle('muted');
                    const isMuted = volumeBtn.classList.contains('muted');
                    volumeBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
                    utils.announce(isMuted ? 'Audio muted' : 'Audio unmuted');
                });
            }
        },

        playAudio(playerElement) {
            // Stop all other players
            utils.$$('.player__btn--play, .episode-card__play').forEach(btn => {
                if (!playerElement.contains(btn)) {
                    btn.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M8 5v14l11-7z" fill="currentColor"/>
                        </svg>
                    `;
                    btn.setAttribute('aria-label', 'Play episode');
                }
            });
            
            // In a real implementation, you would load and play the actual audio file
            console.log('Playing audio for:', playerElement);
        },

        pauseAudio(playerElement) {
            // In a real implementation, you would pause the actual audio
            console.log('Pausing audio for:', playerElement);
        },

        parseDuration(timeString) {
            const parts = timeString.split(':');
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
    };

    // ===================================
    // MODAL FUNCTIONALITY
    // ===================================

    const Modal = {
        init() {
            this.setupEmailCapture();
            this.setupModalTriggers();
        },

        setupEmailCapture() {
            const triggers = utils.$$('[data-action="email-capture"]');
            const modal = utils.$('#email-capture-modal');
            
            if (!modal) return;

            triggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal(modal);
                });
            });

            this.setupModalClose(modal);
            this.setupEmailForm(modal);
        },

        setupModalTriggers() {
            // Handle other modal triggers
            const modalTriggers = utils.$$('[data-modal]');
            
            modalTriggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modalId = trigger.getAttribute('data-modal');
                    const modal = utils.$(`#${modalId}`);
                    if (modal) {
                        this.openModal(modal);
                    }
                });
            });
        },

        openModal(modal) {
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Focus the first focusable element
            const firstFocusable = utils.$('input, button, select, textarea, [tabindex]:not([tabindex="-1"])', modal);
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }
            
            utils.announce('Dialog opened');
        },

        closeModal(modal) {
            modal.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 250);
            document.body.style.overflow = '';
            utils.announce('Dialog closed');
        },

        setupModalClose(modal) {
            const closeButtons = utils.$$('[data-action="close-modal"]', modal);
            const overlay = utils.$('.modal__overlay', modal);
            
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => this.closeModal(modal));
            });

            if (overlay) {
                overlay.addEventListener('click', () => this.closeModal(modal));
            }

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
                    this.closeModal(modal);
                }
            });
        },

        setupEmailForm(modal) {
            const form = utils.$('form', modal);
            if (!form) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEmailSubmission(form, modal);
            });
        },

        async handleEmailSubmission(form, modal) {
            const email = utils.$('input[type="email"]', form).value;
            const submitBtn = utils.$('button[type="submit"]', form);
            const errorDiv = utils.$('.form__error', form);
            
            // Clear previous errors
            if (errorDiv) errorDiv.textContent = '';
            
            // Validate email
            if (!utils.isValidEmail(email)) {
                if (errorDiv) errorDiv.textContent = 'Please enter a valid email address';
                utils.announce('Please enter a valid email address');
                return;
            }
            
            // Disable submit button and show loading
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subscribing...';
            
            try {
                // Simulate API call - replace with actual endpoint
                await this.submitEmail(email);
                
                // Success feedback
                submitBtn.textContent = 'Subscribed!';
                submitBtn.style.background = 'var(--color-success)';
                utils.announce('Successfully subscribed to newsletter');
                
                setTimeout(() => {
                    this.closeModal(modal);
                    form.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = '';
                }, 2000);
                
            } catch (error) {
                // Error feedback
                if (errorDiv) errorDiv.textContent = 'Something went wrong. Please try again.';
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                utils.announce('Subscription failed. Please try again.');
            }
        },

        async submitEmail(email) {
            // Simulate API call - replace with actual newsletter service
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Simulate success (90% of the time)
                    if (Math.random() > 0.1) {
                        console.log('Email submitted:', email);
                        resolve();
                    } else {
                        reject(new Error('Network error'));
                    }
                }, 1500);
            });
        }
    };

    // ===================================
    // FORM FUNCTIONALITY
    // ===================================

    const Forms = {
        init() {
            this.setupValidation();
            this.setupNewsletterForms();
            this.setupContactForms();
        },

        setupValidation() {
            const forms = utils.$$('form');
            
            forms.forEach(form => {
                const inputs = utils.$$('input, textarea, select', form);
                
                inputs.forEach(input => {
                    input.addEventListener('blur', () => this.validateField(input));
                    input.addEventListener('input', utils.debounce(() => this.validateField(input), 300));
                });
            });
        },

        validateField(field) {
            const errorDiv = utils.$(`#${field.name}-error`);
            let isValid = true;
            let message = '';

            // Required field validation
            if (field.hasAttribute('required') && !field.value.trim()) {
                isValid = false;
                message = 'This field is required';
            }

            // Email validation
            if (field.type === 'email' && field.value && !utils.isValidEmail(field.value)) {
                isValid = false;
                message = 'Please enter a valid email address';
            }

            // Update UI
            if (errorDiv) {
                errorDiv.textContent = message;
            }
            
            field.setAttribute('aria-invalid', !isValid);
            field.classList.toggle('field-error', !isValid);
            
            return isValid;
        },

        setupNewsletterForms() {
            const newsletterForms = utils.$$('.newsletter__form, .newsletter-form');
            
            newsletterForms.forEach(form => {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleNewsletterSubmission(form);
                });
            });
        },

        setupContactForms() {
            const contactForms = utils.$$('.contact-form, .inquiry-form');
            
            contactForms.forEach(form => {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleContactSubmission(form);
                });
            });
        },

        async handleNewsletterSubmission(form) {
            const emailField = utils.$('input[type="email"]', form);
            const submitBtn = utils.$('button[type="submit"]', form);
            
            if (!this.validateField(emailField)) return;
            
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subscribing...';
            
            try {
                await Modal.submitEmail(emailField.value);
                submitBtn.textContent = 'Subscribed!';
                submitBtn.style.background = 'var(--color-success)';
                utils.announce('Successfully subscribed to newsletter');
                
                setTimeout(() => {
                    form.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = '';
                }, 3000);
                
            } catch (error) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Try Again';
                utils.announce('Subscription failed. Please try again.');
                
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                }, 3000);
            }
        },

        async handleContactSubmission(form) {
            const submitBtn = utils.$('button[type="submit"]', form);
            const inputs = utils.$$('input[required], textarea[required]', form);
            
            // Validate all required fields
            let allValid = true;
            inputs.forEach(input => {
                if (!this.validateField(input)) {
                    allValid = false;
                }
            });
            
            if (!allValid) {
                utils.announce('Please correct the errors in the form');
                return;
            }
            
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            try {
                await this.submitContactForm(new FormData(form));
                submitBtn.textContent = 'Message Sent!';
                submitBtn.style.background = 'var(--color-success)';
                utils.announce('Message sent successfully. We will respond within 48 hours.');
                
                setTimeout(() => {
                    form.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = '';
                }, 3000);
                
            } catch (error) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Try Again';
                utils.announce('Message failed to send. Please try again.');
                
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                }, 3000);
            }
        },

        async submitContactForm(formData) {
            // Simulate API call - replace with actual contact form endpoint
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    console.log('Contact form submitted:', Object.fromEntries(formData));
                    resolve();
                }, 2000);
            });
        }
    };

    // ===================================
    // FAQ ACCORDION FUNCTIONALITY
    // ===================================

    const FAQ = {
        init() {
            this.setupAccordions();
        },

        setupAccordions() {
            const faqItems = utils.$$('.faq-item');
            
            faqItems.forEach(item => {
                const question = utils.$('.faq-item__question', item);
                const answer = utils.$('.faq-item__answer', item);
                
                if (!question || !answer) return;

                question.addEventListener('click', () => {
                    const isExpanded = question.getAttribute('aria-expanded') === 'true';
                    
                    // Close all other FAQ items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            const otherQuestion = utils.$('.faq-item__question', otherItem);
                            const otherAnswer = utils.$('.faq-item__answer', otherItem);
                            otherQuestion.setAttribute('aria-expanded', 'false');
                            otherAnswer.setAttribute('aria-hidden', 'true');
                        }
                    });
                    
                    // Toggle current item
                    question.setAttribute('aria-expanded', !isExpanded);
                    answer.setAttribute('aria-hidden', isExpanded);
                    
                    utils.announce(isExpanded ? 'Section collapsed' : 'Section expanded');
                });

                // Keyboard navigation
                question.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        question.click();
                    }
                });
            });
        }
    };

    // ===================================
    // SEARCH & FILTER FUNCTIONALITY
    // ===================================

    const Search = {
        init() {
            this.setupSearch();
            this.setupFilters();
        },

        setupSearch() {
            const searchForm = utils.$('.search-form');
            const searchInput = utils.$('.search-form__input');
            
            if (!searchForm || !searchInput) return;

            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch(searchInput.value);
            });

            // Live search with debouncing
            searchInput.addEventListener('input', utils.debounce((e) => {
                if (e.target.value.length > 2) {
                    this.performSearch(e.target.value);
                }
            }, 500));
        },

        setupFilters() {
            const filterSelects = utils.$$('.filter-select');
            const clearBtn = utils.$('.filters-clear');
            
            filterSelects.forEach(select => {
                select.addEventListener('change', () => {
                    this.applyFilters();
                });
            });

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    filterSelects.forEach(select => select.value = '');
                    this.applyFilters();
                    utils.announce('Filters cleared');
                });
            }
        },

        performSearch(query) {
            console.log('Searching for:', query);
            // In a real implementation, this would filter episodes or send API request
            utils.announce(`Searching for "${query}"`);
        },

        applyFilters() {
            const filters = {};
            utils.$$('.filter-select').forEach(select => {
                if (select.value) {
                    filters[select.name] = select.value;
                }
            });
            
            console.log('Applying filters:', filters);
            // In a real implementation, this would filter the episode list
            utils.announce('Filters applied');
        }
    };

    // ===================================
    // SCROLL EFFECTS
    // ===================================

    const ScrollEffects = {
        init() {
            this.setupIntersectionObserver();
            this.setupScrollToTop();
            this.setupHeaderScroll();
        },

        setupIntersectionObserver() {
            const options = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, options);

            // Observe elements for animation
            const animateElements = utils.$$('.episode-card, .testimonial-card, .sefer-card, .dimension');
            animateElements.forEach(el => {
                observer.observe(el);
            });
        },

        setupScrollToTop() {
            const scrollToTop = utils.$('.scroll-to-top');
            if (!scrollToTop) return;

            const toggleVisibility = utils.throttle(() => {
                if (window.pageYOffset > 300) {
                    scrollToTop.classList.add('visible');
                } else {
                    scrollToTop.classList.remove('visible');
                }
            }, 100);

            window.addEventListener('scroll', toggleVisibility);

            scrollToTop.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        },

        setupHeaderScroll() {
            const header = utils.$('.header');
            if (!header) return;

            let lastScroll = 0;
            const handleScroll = utils.throttle(() => {
                const currentScroll = window.pageYOffset;
                
                if (currentScroll > 100) {
                    header.classList.add('header--scrolled');
                } else {
                    header.classList.remove('header--scrolled');
                }

                // Hide header on scroll down, show on scroll up
                if (currentScroll > lastScroll && currentScroll > 200) {
                    header.classList.add('header--hidden');
                } else {
                    header.classList.remove('header--hidden');
                }

                lastScroll = currentScroll;
            }, 10);

            window.addEventListener('scroll', handleScroll);
        }
    };

    // ===================================
    // ANIMATION UTILITIES
    // ===================================

    const Animations = {
        init() {
            this.setupHoverEffects();
            this.setupLoadingAnimations();
        },

        setupHoverEffects() {
            // Card hover effects
            const cards = utils.$$('.episode-card, .testimonial-card, .sefer-card');
            
            cards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    utils.animate(card, 'hover-lift');
                });
            });

            // Button hover effects
            const buttons = utils.$$('.btn');
            
            buttons.forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    utils.animate(btn, 'hover-glow');
                });
            });
        },

        setupLoadingAnimations() {
            // Add loading states to dynamic content
            const dynamicElements = utils.$$('[data-loading]');
            
            dynamicElements.forEach(element => {
                element.classList.add('loading');
                
                // Simulate content loading
                setTimeout(() => {
                    element.classList.remove('loading');
                    element.classList.add('loaded');
                }, Math.random() * 1000 + 500);
            });
        }
    };

    // ===================================
    // THEME & PREFERENCES
    // ===================================

    const Theme = {
        init() {
            this.checkSystemPreferences();
            this.setupReducedMotion();
        },

        checkSystemPreferences() {
            // Check for reduced motion preference
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                document.documentElement.classList.add('reduce-motion');
            }

            // Check for high contrast preference
            if (window.matchMedia('(prefers-contrast: high)').matches) {
                document.documentElement.classList.add('high-contrast');
            }
        },

        setupReducedMotion() {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            
            mediaQuery.addEventListener('change', (e) => {
                if (e.matches) {
                    document.documentElement.classList.add('reduce-motion');
                } else {
                    document.documentElement.classList.remove('reduce-motion');
                }
            });
        }
    };

    // ===================================
    // ERROR HANDLING
    // ===================================

    const ErrorHandler = {
        init() {
            this.setupGlobalErrorHandling();
        },

        setupGlobalErrorHandling() {
            window.addEventListener('error', (e) => {
                console.error('JavaScript error:', e.error);
                // In production, you might want to send this to an error tracking service
            });

            window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled promise rejection:', e.reason);
                // In production, you might want to send this to an error tracking service
            });
        }
    };

    // ===================================
    // PERFORMANCE MONITORING
    // ===================================

    const Performance = {
        init() {
            this.monitorLoadTime();
            this.setupLazyLoading();
        },

        monitorLoadTime() {
            window.addEventListener('load', () => {
                const loadTime = performance.now();
                console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
                
                // In production, you might want to send this to analytics
            });
        },

        setupLazyLoading() {
            const images = utils.$$('img[data-src]');
            
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        }
    };

    // ===================================
    // INITIALIZATION
    // ===================================

    const PrismOfTorah = {
        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                this.initializeComponents();
            }
        },

        initializeComponents() {
            try {
                Navigation.init();
                AudioPlayer.init();
                Modal.init();
                Forms.init();
                FAQ.init();
                Search.init();
                ScrollEffects.init();
                Animations.init();
                Theme.init();
                ErrorHandler.init();
                Performance.init();
                
                console.log('Prism of Torah website initialized successfully');
                utils.announce('Page loaded');
                
            } catch (error) {
                console.error('Error initializing website:', error);
            }
        }
    };

    // Start the application
    PrismOfTorah.init();

    // Expose utilities for debugging (remove in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.PrismDebug = { utils, Navigation, AudioPlayer, Modal, Forms, FAQ, Search };
    }

})();