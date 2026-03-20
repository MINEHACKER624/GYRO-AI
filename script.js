class GyroAI {
    constructor() {
        this.apiKey = 'AIzaSyAWALbTAFBMR43ZK4llmw0dpLTBMFExqiM';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.themeSwitcher = document.getElementById('themeSwitcher');
        this.themeIcon = document.getElementById('themeIcon');
        this.themeText = document.getElementById('themeText');
        
        this.initEventListeners();
        this.initTheme();
        this.conversationHistory = [];
        this.testAPIConnection();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('gyroAI_theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        const body = document.body;
        const themeIcon = this.themeIcon;
        const themeText = this.themeText;
        
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fas fa-sun';
            themeText.textContent = 'Cyber';
        } else if (theme === 'cyberpunk') {
            body.setAttribute('data-theme', 'cyberpunk');
            themeIcon.className = 'fas fa-robot';
            themeText.textContent = 'Light';
        } else {
            body.removeAttribute('data-theme');
            themeIcon.className = 'fas fa-moon';
            themeText.textContent = 'Dark';
        }
        
        localStorage.setItem('gyroAI_theme', theme);
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        let newTheme;
        
        if (currentTheme === 'dark') {
            newTheme = 'cyberpunk';
        } else if (currentTheme === 'cyberpunk') {
            newTheme = 'light';
        } else {
            newTheme = 'dark';
        }
        
        this.setTheme(newTheme);
    }

    async testAPIConnection() {
        try {
            const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Hello, this is a test."
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 10,
                    }
                })
            });

            if (!testResponse.ok) {
                const errorData = await testResponse.json().catch(() => ({}));
                console.error('API Test Failed:', errorData);
                this.addMessage('API connection test failed. Please check your API key.', 'bot');
            } else {
                console.log('API Test Successful');
            }
        } catch (error) {
            console.error('API Test Error:', error);
            this.addMessage('Unable to connect to AI service. Using fallback responses.', 'bot');
        }
    }

    initEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.messageInput.addEventListener('input', () => {
            this.sendButton.disabled = !this.messageInput.value.trim();
        });

        this.themeSwitcher.addEventListener('click', () => this.toggleTheme());
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.showTypingIndicator();

        try {
            const response = await this.callAI(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.hideTypingIndicator();
            
            if (error.message.includes('403') || error.message.includes('API_KEY')) {
                this.addMessage('API key error. Please check your Google AI API key.', 'bot');
            } else if (error.message.includes('429')) {
                this.addMessage('Rate limit exceeded. Please wait a moment and try again.', 'bot');
            } else if (error.message.includes('400')) {
                this.addMessage('Invalid request. Please try rephrasing your message.', 'bot');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                this.addMessage('Network error. Please check your internet connection.', 'bot');
            } else {
                const fallbackResponse = this.getFallbackResponse(message);
                this.addMessage(fallbackResponse, 'bot');
            }
            
            console.error('AI API Error:', error);
        }
    }

    async callAI(message) {
        const context = this.buildContext();
        const prompt = `${context}\n\nUser: ${message}\n\nAssistant:`;

        const models = [
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-flash-latest',
            'gemini-pro-latest',
            'gemini-2.0-flash'
        ];

        for (const model of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024,
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error(`API Error with ${model}:`, errorData);
                    continue; // Try next model
                }

                const data = await response.json();
                console.log(`API Response with ${model}:`, data);
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    const aiResponse = data.candidates[0].content.parts[0].text;
                    this.conversationHistory.push({ user: message, bot: aiResponse });
                    return aiResponse.trim();
                } else {
                    console.error('Unexpected response structure with', model, ':', data);
                    continue;
                }
            } catch (error) {
                console.error(`Error with ${model}:`, error);
                continue;
            }
        }

        throw new Error('All models failed to respond');
    }

    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm Gyro AI. How can I assist you today?";
        } else if (lowerMessage.includes('how are you')) {
            return "I'm doing great, thank you! I'm here to help you with any questions you have.";
        } else if (lowerMessage.includes('what can you do')) {
            return "I can help you with a wide range of topics including answering questions, providing information, and having conversations. I'm powered by Google's AI technology!";
        } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
            return "Goodbye! It was nice chatting with you. Feel free to come back anytime!";
        } else if (lowerMessage.includes('thank')) {
            return "You're welcome! I'm happy to help. Is there anything else you'd like to know?";
        } else {
            return "I'm experiencing some technical difficulties at the moment. Please try again in a few moments, or feel free to ask me something else!";
        }
    }

    buildContext() {
        const baseContext = `You are Gyro AI, a helpful assistant created by Prayag Goden. Be friendly and helpful in your responses.`;

        if (this.conversationHistory.length > 0) {
            const recentHistory = this.conversationHistory.slice(-3);
            const historyText = recentHistory.map(item => 
                `User: ${item.user}\nAssistant: ${item.bot}`
            ).join('\n\n');
            return `${baseContext}\n\n${historyText}`;
        }

        return baseContext;
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const paragraph = document.createElement('p');
        paragraph.textContent = content;
        contentDiv.appendChild(paragraph);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.typingIndicator.classList.add('active');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.remove('active');
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    resetConversation() {
        this.conversationHistory = [];
        this.chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <p>Hello! I'm Gyro AI, your intelligent assistant. How can I help you today?</p>
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gyroAI = new GyroAI();
    
    window.addEventListener('beforeunload', () => {
        if (gyroAI.conversationHistory.length > 0) {
            localStorage.setItem('gyroAI_conversation', JSON.stringify(gyroAI.conversationHistory));
        }
    });

    const savedConversation = localStorage.getItem('gyroAI_conversation');
    if (savedConversation) {
        try {
            gyroAI.conversationHistory = JSON.parse(savedConversation);
        } catch (e) {
            console.error('Error loading saved conversation:', e);
        }
    }
});
