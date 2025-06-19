# 🚀 AI Content Generator Setup Guide

## Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/Ayzen8/ai-content-generator-desktop.git
   cd ai-content-generator-desktop
   npm install
   ```

2. **Set up Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy `.env.example` to `.env`
   - Add your API key: `GEMINI_API_KEY=your_api_key_here`

3. **Initialize Database with Niches**
   ```bash
   node scripts/seed-niches.js
   ```

4. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

5. **Open Dashboard**
   - Navigate to http://localhost:3000
   - Click "Content Generator" tab
   - Select a niche and generate content!

## 🎯 Pre-loaded Niches

Your application comes with 22 AI-optimized niches:

### **Finance & Business**
- Finance & Business (main)
- Stock Investing
- Cryptocurrency

### **Health & Wellness**
- Health & Wellness (main)
- Fitness & Bodybuilding
- Yoga & Mindfulness

### **Technology & Gaming**
- Technology & Gaming (main)
- Gaming

### **Anime & Manga** 🎌
- Anime & Manga (main)
- Seasonal Anime
- Classic & Retro Anime

### **Luxury & Lifestyle**
- Luxury & Lifestyle (main)
- Luxury Cars
- High Fashion

### **Content Creation**
- Travel & Adventure
- Food & Cooking
- Instagram Theme Pages
- Memes & Humor
- Quotes & Motivation
- Aesthetics & Visuals
- Fun Facts & Trivia
- Animals & Pets

## 🤖 How It Works

1. **Select a Niche**: Each niche has a custom persona optimized for AI content generation
2. **Generate Content**: Creates complete packages with:
   - Tweet (280 characters)
   - Instagram caption
   - Hashtags (trending + niche-specific)
   - DALL-E image prompt
3. **Manage Content**: Post, Delete, Copy, or Regenerate each piece
4. **Track Performance**: Monitor pending, posted, and deleted content

## 🔧 Features

- ✅ **22 AI-Optimized Niches** with custom personas
- ✅ **Multi-Platform Content** (Twitter, Instagram, Image prompts)
- ✅ **Real-time Dashboard** with live updates
- ✅ **Content Management** (Post/Delete/Copy/Regenerate)
- ✅ **Desktop Application** with system tray
- ✅ **Hierarchical Niches** (parent/child relationships)
- ✅ **Copy-to-Clipboard** for all content types
- ✅ **Status Tracking** (pending, posted, deleted)

## 🎨 Interface Overview

### **Overview Tab**
- Quick statistics
- Recent notifications
- Quick action buttons

### **Content Generator Tab**
- Niche selection dropdown
- Generate content button
- Content cards with actions
- Filter by status (All, Pending, Posted, Deleted)

### **Niche Management Tab**
- View all niches with personas
- Create custom niches
- Manage niche hierarchy

## 🔑 API Key Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Create `.env` file in project root:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
6. Restart the application

## 🧪 Testing

Use the "Test API" button in the Content Generator to verify your Gemini API connection.

## 🚀 Ready to Generate!

Your AI Content Generator is now ready to create engaging content for any niche. Each niche is optimized with a specific persona that understands the audience, tone, and content style that works best for that category.

Start with popular niches like **Anime & Manga**, **Finance & Business**, or **Memes & Humor** to see the AI in action!
