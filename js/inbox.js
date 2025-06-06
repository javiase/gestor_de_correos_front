class EmailInbox {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 22;
        this.emailsPerPage = 20;
        this.allEmails = [];
        this.filteredEmails = [];
        this.searchTerm = '';
        
        this.init();
    }
    
    init() {
        this.generateSampleEmails();
        this.bindEvents();
        this.renderEmails();
        this.updatePagination();
    }
    
    generateSampleEmails() {
        const senders = [
            'Rafal Szlendak', 'Alice Johnson', 'Emma Smith', 'Sophia Williams',
            'Rafal, Fryderyk Wiatrowski', 'Vadym Petrychenko', 'J K, Fryderyk Wiatrowski',
            'Team Lunch Tomorrow', 'Google Support', 'Conference Team', 'Project Manager',
            'Marketing Team', 'HR Department', 'IT Support', 'Sales Team'
        ];
        
        const subjects = [
            'Team Lunch Tomorrow',
            'CRUCIAL: Invitation to Discuss Project Timeline',
            'CRUCIAL: Clarification on Innovation Initiative',
            'CRUCIAL: Compliance Update Inquiry - 8856',
            'Re: Google Cloud Support 56746929: Webhook',
            'Re: Conference invite',
            'What\'s your typical hourly cost for client projects?',
            'Re: Test',
            'Test',
            'Re: Tidemark\'s Blueprint for Vertical SaaS Growth',
            'Re: Assistance requested',
            'Re: Fryderyk',
            'Possible artificial intelligence opportunity',
            'Weekly Team Meeting',
            'Project Status Update',
            'Budget Review Meeting',
            'New Feature Release',
            'Client Feedback Summary',
            'Security Update Required',
            'Performance Review Schedule'
        ];
        
        const previews = [
            'Team lunch tomorrow • 12:30 PM • With Georg Mc...',
            'Discuss project timeline • New procedures • Timeline...',
            'Innovation Initiative 2024 • Clarification provided • I...',
            'Compliance update progress • Urgent call required...',
            'Webhook delay issue • No payload, Jan 21 • Meet...',
            'Austin AI Conference • Fryderyk interested • Talk o...',
            'Inquiry on hourly cost • Services: content, web, PR...',
            'Test email exchange • January 21, 2025 • Informal...',
            'Subject: Test • Sender: Vadym Petrychenko • Rece...',
            'Partnership interest for 2025 • New investments, Co...',
            'Need assistance with project setup and configuration...',
            'Felix Capital: $1.2bn AUM • Interested in Zeta Labs...',
            'Potential candidate for Zeta Labs • Experience in AI...',
            'Weekly sync meeting scheduled for tomorrow at 2 PM...',
            'Current project status and next milestones review...',
            'Q4 budget review and planning for next quarter...',
            'New feature rollout scheduled for next week...',
            'Summary of client feedback from last month...',
            'Critical security update needs to be applied...',
            'Annual performance review schedule released...'
        ];
        
        const times = ['2:05 PM', '11:43 AM', '11:43 AM', '11:31 AM', 'Yesterday', 'Monday'];
        const dates = ['today', 'today', 'today', 'today', 'yesterday', 'yesterday', 'yesterday', 'yesterday', 'yesterday', 'yesterday', 'january2025', 'january2025'];
        
        // Generate 440 emails (22 pages * 20 emails per page)
        for (let i = 0; i < 440; i++) {
            const dateCategory = dates[i % dates.length];
            const email = {
                id: i + 1,
                sender: senders[i % senders.length],
                subject: subjects[i % subjects.length],
                preview: previews[i % previews.length],
                time: times[i % times.length],
                date: dateCategory,
                isDraft: Math.random() > 0.7, // 30% chance of being a draft
                hasAttachment: Math.random() > 0.8, // 20% chance of having attachment
                isUnread: Math.random() > 0.6, // 40% chance of being unread
                hasAvatar: Math.random() > 0.7 // 30% chance of having avatar placeholder
            };
            this.allEmails.push(email);
        }
        
        this.filteredEmails = [...this.allEmails];
    }
    
    bindEvents() {
        const searchInput = document.getElementById('searchInput');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        // Search functionality
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterEmails();
        });
        
        // Pagination
        prevBtn.addEventListener('click', () => this.previousPage());
        nextBtn.addEventListener('click', () => this.nextPage());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.blur();
            }
            if (e.key === 'ArrowLeft' && e.ctrlKey) {
                this.previousPage();
            }
            if (e.key === 'ArrowRight' && e.ctrlKey) {
                this.nextPage();
            }
        });
    }
    
    filterEmails() {
        if (!this.searchTerm) {
            this.filteredEmails = [...this.allEmails];
        } else {
            this.filteredEmails = this.allEmails.filter(email => 
                email.sender.toLowerCase().includes(this.searchTerm) ||
                email.subject.toLowerCase().includes(this.searchTerm) ||
                email.preview.toLowerCase().includes(this.searchTerm)
            );
        }
        
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredEmails.length / this.emailsPerPage);
        this.renderEmails();
        this.updatePagination();
    }
    
    getCurrentPageEmails() {
        const startIndex = (this.currentPage - 1) * this.emailsPerPage;
        const endIndex = startIndex + this.emailsPerPage;
        return this.filteredEmails.slice(startIndex, endIndex);
    }
    
    renderEmails() {
        const emailGroups = {
            today: document.querySelector('[data-date="today"]'),
            yesterday: document.querySelector('[data-date="yesterday"]'),
            january2025: document.querySelector('[data-date="january2025"]')
        };
        
        // Clear all groups
        Object.values(emailGroups).forEach(group => {
            group.innerHTML = '';
        });
        
        const currentEmails = this.getCurrentPageEmails();
        
        // Group emails by date
        const groupedEmails = {
            today: currentEmails.filter(email => email.date === 'today'),
            yesterday: currentEmails.filter(email => email.date === 'yesterday'),
            january2025: currentEmails.filter(email => email.date === 'january2025')
        };
        
        // Render each group
        Object.entries(groupedEmails).forEach(([dateKey, emails]) => {
            const group = emailGroups[dateKey];
            if (emails.length === 0) {
                group.parentElement.style.display = 'none';
                return;
            }
            
            group.parentElement.style.display = 'block';
            emails.forEach(email => {
                group.appendChild(this.createEmailElement(email));
            });
        });
        
        // Show empty state if no emails
        if (currentEmails.length === 0) {
            this.showEmptyState();
        }
    }
    
    createEmailElement(email) {
        const emailItem = document.createElement('div');
        emailItem.className = `email-item ${email.isUnread ? 'unread' : ''} ${email.hasAvatar ? 'has-avatar' : ''}`;
        emailItem.setAttribute('tabindex', '0');
        
        let avatarHtml = '';
        if (email.hasAvatar) {
            const avatarClass = Math.random() > 0.5 ? 'large' : 'small';
            avatarHtml = `<div class="email-avatar ${avatarClass}"></div>`;
        }
        
        const attachmentIcon = email.hasAttachment ? '<i class="fas fa-paperclip attachment-icon"></i>' : '';
        const unreadIndicator = email.isUnread ? '<div class="unread-indicator"></div>' : '';
        const draftBadge = email.isDraft ? '<span class="draft-badge">Draft</span>' : '';
        
        emailItem.innerHTML = `
            ${avatarHtml}
            <div class="email-sender">${email.sender}</div>
            <div class="email-content">
                <div class="email-subject">${email.subject}</div>
                <div class="email-preview">${email.preview}</div>
            </div>
            <div class="email-meta">
                <div class="email-status">
                    ${attachmentIcon}
                    ${unreadIndicator}
                    ${draftBadge}
                </div>
            </div>
            <div class="email-time">${email.time}</div>
        `;
        
        // Add click event
        emailItem.addEventListener('click', () => this.openEmail(email));
        
        return emailItem;
    }
    
    showEmptyState() {
        const emailList = document.getElementById('emailList');
        emailList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No emails found</h3>
                <p>Try adjusting your search terms</p>
            </div>
        `;
    }
    
    openEmail(email) {
        console.log('Opening email:', email);
        // Implement email opening logic here
        // This could navigate to a detailed view or open a modal
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderEmails();
            this.updatePagination();
            this.scrollToTop();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.renderEmails();
            this.updatePagination();
            this.scrollToTop();
        }
    }
    
    updatePagination() {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        pageInfo.textContent = `${this.currentPage} of ${this.totalPages}`;
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.totalPages;
    }
    
    scrollToTop() {
        const emailList = document.getElementById('emailList');
        emailList.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize the inbox when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const inbox = new EmailInbox();
    
    // Make inbox globally accessible for debugging
    window.emailInbox = inbox;
    
    console.log('Email Inbox initialized with', inbox.allEmails.length, 'emails');
});

// Add some performance optimizations
if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
        // Preload next page emails for better performance
        console.log('Preloading next page data...');
    });
}
