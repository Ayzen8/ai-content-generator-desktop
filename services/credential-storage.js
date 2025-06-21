const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

class CredentialStorage {
    constructor() {
        // Store credentials in user's home directory
        this.credentialsDir = path.join(os.homedir(), '.ai-content-generator');
        this.credentialsFile = path.join(this.credentialsDir, 'credentials.json');
        this.encryptionKey = this.getOrCreateEncryptionKey();
        
        // Ensure directory exists
        this.ensureDirectoryExists();
    }

    // Ensure the credentials directory exists
    ensureDirectoryExists() {
        try {
            if (!fs.existsSync(this.credentialsDir)) {
                fs.mkdirSync(this.credentialsDir, { recursive: true });
            }
        } catch (error) {
            console.error('Error creating credentials directory:', error);
        }
    }

    // Get or create encryption key
    getOrCreateEncryptionKey() {
        const keyFile = path.join(this.credentialsDir, '.key');
        
        try {
            if (fs.existsSync(keyFile)) {
                return fs.readFileSync(keyFile, 'utf8');
            } else {
                // Create new encryption key
                const key = crypto.randomBytes(32).toString('hex');
                this.ensureDirectoryExists();
                fs.writeFileSync(keyFile, key, 'utf8');
                return key;
            }
        } catch (error) {
            console.error('Error handling encryption key:', error);
            // Fallback to a default key (less secure but functional)
            return crypto.createHash('sha256').update('ai-content-generator-default').digest('hex');
        }
    }

    // Encrypt data
    encrypt(text) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = Buffer.from(this.encryptionKey, 'hex');
            const iv = crypto.randomBytes(16);
            
            const cipher = crypto.createCipher(algorithm, key);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            return text; // Return unencrypted as fallback
        }
    }

    // Decrypt data
    decrypt(encryptedText) {
        try {
            if (!encryptedText.includes(':')) {
                return encryptedText; // Not encrypted
            }
            
            const algorithm = 'aes-256-cbc';
            const key = Buffer.from(this.encryptionKey, 'hex');
            const textParts = encryptedText.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
            const encrypted = textParts.join(':');
            
            const decipher = crypto.createDecipher(algorithm, key);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return encryptedText; // Return as-is if decryption fails
        }
    }

    // Save X (Twitter) credentials
    saveXCredentials(credentials) {
        try {
            const existingData = this.loadAllCredentials();
            
            const encryptedCredentials = {
                apiKey: this.encrypt(credentials.apiKey || ''),
                apiSecret: this.encrypt(credentials.apiSecret || ''),
                accessToken: this.encrypt(credentials.accessToken || ''),
                accessTokenSecret: this.encrypt(credentials.accessTokenSecret || ''),
                bearerToken: this.encrypt(credentials.bearerToken || ''),
                savedAt: new Date().toISOString()
            };
            
            existingData.x = encryptedCredentials;
            
            fs.writeFileSync(this.credentialsFile, JSON.stringify(existingData, null, 2));
            console.log('✅ X credentials saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving X credentials:', error);
            return false;
        }
    }

    // Load X (Twitter) credentials
    loadXCredentials() {
        try {
            const allCredentials = this.loadAllCredentials();
            
            if (!allCredentials.x) {
                return null;
            }
            
            const encrypted = allCredentials.x;
            return {
                apiKey: this.decrypt(encrypted.apiKey || ''),
                apiSecret: this.decrypt(encrypted.apiSecret || ''),
                accessToken: this.decrypt(encrypted.accessToken || ''),
                accessTokenSecret: this.decrypt(encrypted.accessTokenSecret || ''),
                bearerToken: this.decrypt(encrypted.bearerToken || ''),
                savedAt: encrypted.savedAt
            };
        } catch (error) {
            console.error('Error loading X credentials:', error);
            return null;
        }
    }

    // Save Instagram credentials
    saveInstagramCredentials(credentials) {
        try {
            const existingData = this.loadAllCredentials();
            
            const encryptedCredentials = {
                accessToken: this.encrypt(credentials.accessToken || ''),
                clientId: this.encrypt(credentials.clientId || ''),
                clientSecret: this.encrypt(credentials.clientSecret || ''),
                savedAt: new Date().toISOString()
            };
            
            existingData.instagram = encryptedCredentials;
            
            fs.writeFileSync(this.credentialsFile, JSON.stringify(existingData, null, 2));
            console.log('✅ Instagram credentials saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving Instagram credentials:', error);
            return false;
        }
    }

    // Load Instagram credentials
    loadInstagramCredentials() {
        try {
            const allCredentials = this.loadAllCredentials();
            
            if (!allCredentials.instagram) {
                return null;
            }
            
            const encrypted = allCredentials.instagram;
            return {
                accessToken: this.decrypt(encrypted.accessToken || ''),
                clientId: this.decrypt(encrypted.clientId || ''),
                clientSecret: this.decrypt(encrypted.clientSecret || ''),
                savedAt: encrypted.savedAt
            };
        } catch (error) {
            console.error('Error loading Instagram credentials:', error);
            return null;
        }
    }

    // Load all credentials
    loadAllCredentials() {
        try {
            if (!fs.existsSync(this.credentialsFile)) {
                return {};
            }
            
            const data = fs.readFileSync(this.credentialsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading credentials:', error);
            return {};
        }
    }

    // Clear X credentials
    clearXCredentials() {
        try {
            const existingData = this.loadAllCredentials();
            delete existingData.x;
            
            fs.writeFileSync(this.credentialsFile, JSON.stringify(existingData, null, 2));
            console.log('✅ X credentials cleared');
            return true;
        } catch (error) {
            console.error('Error clearing X credentials:', error);
            return false;
        }
    }

    // Clear Instagram credentials
    clearInstagramCredentials() {
        try {
            const existingData = this.loadAllCredentials();
            delete existingData.instagram;
            
            fs.writeFileSync(this.credentialsFile, JSON.stringify(existingData, null, 2));
            console.log('✅ Instagram credentials cleared');
            return true;
        } catch (error) {
            console.error('Error clearing Instagram credentials:', error);
            return false;
        }
    }

    // Clear all credentials
    clearAllCredentials() {
        try {
            if (fs.existsSync(this.credentialsFile)) {
                fs.unlinkSync(this.credentialsFile);
            }
            console.log('✅ All credentials cleared');
            return true;
        } catch (error) {
            console.error('Error clearing all credentials:', error);
            return false;
        }
    }

    // Check if X credentials exist
    hasXCredentials() {
        const credentials = this.loadXCredentials();
        return credentials && credentials.apiKey && credentials.apiSecret;
    }

    // Check if Instagram credentials exist
    hasInstagramCredentials() {
        const credentials = this.loadInstagramCredentials();
        return credentials && credentials.accessToken;
    }

    // Get credentials status
    getCredentialsStatus() {
        return {
            x: this.hasXCredentials(),
            instagram: this.hasInstagramCredentials(),
            storageLocation: this.credentialsDir
        };
    }
}

module.exports = new CredentialStorage();
