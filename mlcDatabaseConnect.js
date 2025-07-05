// MLC Database Connect - JavaScript Application
class MLCDatabaseConnect {
    constructor() {
        this.baseURL = 'https://public-api.themlc.com';
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        
        this.initializeElements();
        this.bindEvents();
        this.checkStoredAuth();
    }

    // Initialize DOM elements
    initializeElements() {
        // Authentication elements
        this.authForm = document.getElementById('authForm');
        this.authSection = document.getElementById('authSection');
        this.operationsSection = document.getElementById('operationsSection');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusIndicator = this.connectionStatus.querySelector('.status-indicator');
        this.statusText = this.connectionStatus.querySelector('.status-text');

        // Form elements
        this.songSearchForm = document.getElementById('songSearchForm');
        this.recordingSearchForm = document.getElementById('recordingSearchForm');
        this.workDetailsForm = document.getElementById('workDetailsForm');
        this.multipleWorksForm = document.getElementById('multipleWorksForm');

        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsContent = document.getElementById('resultsContent');
        this.clearResultsBtn = document.getElementById('clearResults');

        // UI elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeErrorModal = document.getElementById('closeErrorModal');
    }

    // Bind event listeners
    bindEvents() {
        // Authentication
        this.authForm.addEventListener('submit', (e) => this.handleAuthentication(e));

        // API operations
        this.songSearchForm.addEventListener('submit', (e) => this.handleSongSearch(e));
        this.recordingSearchForm.addEventListener('submit', (e) => this.handleRecordingSearch(e));
        this.workDetailsForm.addEventListener('submit', (e) => this.handleWorkDetails(e));
        this.multipleWorksForm.addEventListener('submit', (e) => this.handleMultipleWorks(e));

        // UI interactions
        this.clearResultsBtn.addEventListener('click', () => this.clearResults());
        this.closeErrorModal.addEventListener('click', () => this.hideErrorModal());
        
        // Close modal on outside click
        this.errorModal.addEventListener('click', (e) => {
            if (e.target === this.errorModal) {
                this.hideErrorModal();
            }
        });
    }

    // Check for stored authentication
    checkStoredAuth() {
        const storedToken = localStorage.getItem('mlc_access_token');
        const storedExpiry = localStorage.getItem('mlc_token_expiry');
        
        if (storedToken && storedExpiry && new Date() < new Date(storedExpiry)) {
            this.accessToken = storedToken;
            this.tokenExpiry = new Date(storedExpiry);
            this.updateConnectionStatus(true);
            this.showOperations();
        }
    }

    // Handle authentication
    async handleAuthentication(e) {
        e.preventDefault();
        this.showLoading();

        const formData = new FormData(this.authForm);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const response = await this.makeRequest('/oauth/token', {
                method: 'POST',
                body: JSON.stringify(credentials),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.accessToken) {
                this.accessToken = response.accessToken;
                this.refreshToken = response.refreshToken;
                this.tokenExpiry = new Date(Date.now() + (parseInt(response.expiresIn) * 1000));
                
                // Store tokens
                localStorage.setItem('mlc_access_token', this.accessToken);
                localStorage.setItem('mlc_refresh_token', this.refreshToken);
                localStorage.setItem('mlc_token_expiry', this.tokenExpiry.toISOString());
                
                this.updateConnectionStatus(true);
                this.showOperations();
                this.showSuccess('Successfully connected to MLC API');
            } else {
                throw new Error(response.error || 'Authentication failed');
            }
        } catch (error) {
            this.showError('Authentication failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Handle song code search
    async handleSongSearch(e) {
        e.preventDefault();
        this.showLoading();

        const formData = new FormData(this.songSearchForm);
        const searchData = {
            title: formData.get('title'),
            writers: []
        };

        // Add writers if provided
        const writerFirstName = formData.get('writerFirstName');
        const writerLastName = formData.get('writerLastName');
        
        if (writerFirstName || writerLastName) {
            searchData.writers.push({
                writerFirstName: writerFirstName || '',
                writerLastName: writerLastName || ''
            });
        }

        try {
            const results = await this.makeAuthenticatedRequest('/search/songcode', {
                method: 'POST',
                body: JSON.stringify(searchData)
            });

            this.displayResults('Song Search Results', results);
        } catch (error) {
            this.showError('Song search failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Handle recording search
    async handleRecordingSearch(e) {
        e.preventDefault();
        this.showLoading();

        const formData = new FormData(this.recordingSearchForm);
        const searchData = {
            artist: formData.get('artist'),
            title: formData.get('title'),
            isrc: formData.get('isrc')
        };

        try {
            const results = await this.makeRequest('/search/recordings', {
                method: 'POST',
                body: JSON.stringify(searchData),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.displayResults('Recording Search Results', results);
        } catch (error) {
            this.showError('Recording search failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Handle work details
    async handleWorkDetails(e) {
        e.preventDefault();
        this.showLoading();

        const formData = new FormData(this.workDetailsForm);
        const workId = formData.get('id');

        try {
            const result = await this.makeAuthenticatedRequest(`/work/id/${workId}`, {
                method: 'GET'
            });

            this.displayResults('Work Details', [result]);
        } catch (error) {
            this.showError('Failed to get work details: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Handle multiple works
    async handleMultipleWorks(e) {
        e.preventDefault();
        this.showLoading();

        const formData = new FormData(this.multipleWorksForm);
        const songCodesText = formData.get('mlcSongCodes');
        const songCodes = songCodesText.split('\n')
            .map(code => code.trim())
            .filter(code => code.length > 0)
            .map(code => ({ mlcsongCode: code }));

        try {
            const results = await this.makeAuthenticatedRequest('/works', {
                method: 'POST',
                body: JSON.stringify(songCodes)
            });

            this.displayResults('Multiple Works Results', results);
        } catch (error) {
            this.showError('Failed to get multiple works: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Make authenticated request
    async makeAuthenticatedRequest(endpoint, options = {}) {
        if (!this.accessToken) {
            throw new Error('No access token available');
        }

        // Check if token is expired
        if (this.tokenExpiry && new Date() > this.tokenExpiry) {
            await this.refreshAccessToken();
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            ...options.headers
        };

        return this.makeRequest(endpoint, {
            ...options,
            headers
        });
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await this.makeRequest('/oauth/token', {
            method: 'POST',
            body: JSON.stringify({
                refreshToken: this.refreshToken
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.accessToken) {
            this.accessToken = response.accessToken;
            this.tokenExpiry = new Date(Date.now() + (parseInt(response.expiresIn) * 1000));
            
            localStorage.setItem('mlc_access_token', this.accessToken);
            localStorage.setItem('mlc_token_expiry', this.tokenExpiry.toISOString());
        } else {
            throw new Error('Failed to refresh token');
        }
    }

    // Make HTTP request
    async makeRequest(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
            } catch {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Display results
    displayResults(title, results) {
        this.resultsContent.innerHTML = '';
        
        if (!results || results.length === 0) {
            this.resultsContent.innerHTML = '<p class="no-results">No results found.</p>';
        } else {
            results.forEach((result, index) => {
                const resultElement = this.createResultElement(result, index);
                this.resultsContent.appendChild(resultElement);
            });
        }

        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Create result element
    createResultElement(result, index) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item fade-in';
        
        let content = `<h4>Result ${index + 1}</h4>`;
        
        // Format the result based on its structure
        if (result.workTitle || result.primaryTitle) {
            content += `<p><strong>Title:</strong> ${result.workTitle || result.primaryTitle}</p>`;
        }
        
        if (result.mlcSongCode) {
            content += `<p><strong>MLC Song Code:</strong> ${result.mlcSongCode}</p>`;
        }
        
        if (result.iswc) {
            content += `<p><strong>ISWC:</strong> ${result.iswc}</p>`;
        }
        
        if (result.artist) {
            content += `<p><strong>Artist:</strong> ${result.artist}</p>`;
        }
        
        if (result.title) {
            content += `<p><strong>Title:</strong> ${result.title}</p>`;
        }
        
        if (result.isrc) {
            content += `<p><strong>ISRC:</strong> ${result.isrc}</p>`;
        }
        
        if (result.labels) {
            content += `<p><strong>Labels:</strong> ${result.labels}</p>`;
        }
        
        if (result.writers && result.writers.length > 0) {
            content += '<p><strong>Writers:</strong></p><ul>';
            result.writers.forEach(writer => {
                const writerName = `${writer.writerFirstName || ''} ${writer.writerLastName || ''}`.trim();
                if (writerName) {
                    content += `<li>${writerName}${writer.writerIPI ? ` (IPI: ${writer.writerIPI})` : ''}</li>`;
                }
            });
            content += '</ul>';
        }
        
        if (result.publishers && result.publishers.length > 0) {
            content += '<p><strong>Publishers:</strong></p><ul>';
            result.publishers.forEach(publisher => {
                content += `<li>${publisher.publisherName}${publisher.publisherIpiNumber ? ` (IPI: ${publisher.publisherIpiNumber})` : ''}</li>`;
            });
            content += '</ul>';
        }
        
        if (result.akas && result.akas.length > 0) {
            content += '<p><strong>Alternative Titles:</strong></p><ul>';
            result.akas.forEach(aka => {
                content += `<li>${aka.akaTitle}</li>`;
            });
            content += '</ul>';
        }

        resultDiv.innerHTML = content;
        return resultDiv;
    }

    // Update connection status
    updateConnectionStatus(connected) {
        this.statusIndicator.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
        this.statusText.textContent = connected ? 'Connected' : 'Disconnected';
    }

    // Show operations section
    showOperations() {
        this.authSection.style.display = 'none';
        this.operationsSection.style.display = 'block';
        this.operationsSection.classList.add('slide-in');
    }

    // Show loading overlay
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    // Hide loading overlay
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    // Show error modal
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.style.display = 'flex';
    }

    // Hide error modal
    hideErrorModal() {
        this.errorModal.style.display = 'none';
    }

    // Show success message
    showSuccess(message) {
        // Create a temporary success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification fade-in';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Clear results
    clearResults() {
        this.resultsContent.innerHTML = '';
        this.resultsSection.style.display = 'none';
    }

    // Logout
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        
        localStorage.removeItem('mlc_access_token');
        localStorage.removeItem('mlc_refresh_token');
        localStorage.removeItem('mlc_token_expiry');
        
        this.updateConnectionStatus(false);
        this.operationsSection.style.display = 'none';
        this.authSection.style.display = 'block';
        this.clearResults();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mlcApp = new MLCDatabaseConnect();
});

// Add logout functionality to the header
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header-content');
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-small';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    logoutBtn.style.marginLeft = '15px';
    logoutBtn.addEventListener('click', () => {
        if (window.mlcApp) {
            window.mlcApp.logout();
        }
    });
    
    header.appendChild(logoutBtn);
}); 