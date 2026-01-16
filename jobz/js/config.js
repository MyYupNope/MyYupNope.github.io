/**
 * Job Application Portal Configuration
 * Centralized settings for the application
 */
const CONFIG = {
    // API Endpoints
    API_ENDPOINT: "https://mollusk-pleased-lemming.ngrok-free.app/webhook/jappmotlet",
    
    // Form Settings
    SUBMISSION_RESET_TIMEOUT: 30000, // 30 seconds
    
    // UI Settings
    TOAST_DURATION: 5000, // 5 seconds
    
    // Animation Durations
    ANIMATION_FAST: 150,
    ANIMATION_BASE: 250,
    ANIMATION_SLOW: 400,
    
    // Validation Patterns
    PATTERNS: {
        URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    }
};

export default CONFIG;
