# Tunisian Rami Card Game

A modern implementation of the traditional Tunisian Rami card game, built with React, TypeScript, and Firebase for real-time multiplayer functionality.

## Features

- **Single Device Mode**: Play with friends on the same device
- **Online Multiplayer**: Play with friends over the internet with real-time updates
- **Traditional Rules**: Authentic Tunisian Rami gameplay with all traditional rules
- **Modern UI**: Beautiful, responsive design with glass-morphism effects

## Tech Stack

- **React 18** - For the UI components and state management
- **TypeScript** - For type safety
- **Vite** - For fast development and optimized builds
- **TailwindCSS** - For styling
- **Firebase Realtime Database** - For multiplayer functionality
- **React Router** - For navigation
- **Shadcn UI** - For UI components

## Deployment to Render.com

This project is configured for easy deployment on Render.com through GitHub:

1. **Fork or push this repository to your GitHub account**

2. **Create a new Web Service on Render.com:**

   - Connect your GitHub repository
   - Use the following settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm run start` (or use Render's static site hosting)
     - **Environment Variables**:
       - No additional environment variables are required as Firebase config is included in the code

3. **Deploy:**
   - Render will automatically build and deploy your application
   - Any pushes to the main branch will trigger automatic re-deployments

## Local Development

1. **Clone the repository:**

   ```
   git clone https://github.com/yourusername/tunisian-rami.git
   cd tunisian-rami
   ```

2. **Install dependencies:**

   ```
   npm install
   ```

3. **Start the development server:**

   ```
   npm run dev
   ```

4. **Build for production:**
   ```
   npm run build
   ```

## Multiplayer Implementation

The multiplayer functionality uses Firebase Realtime Database to:

- Create and join game sessions with unique codes
- Manage player connections and ready states
- Handle disconnections gracefully
- Synchronize game state across all players

### Session Management

- Each game has a unique 6-character code
- Players can create or join games using this code
- Sessions persist while players are connected
- Inactive sessions are automatically cleaned up

## Game Rules

See the in-game rules section for complete Tunisian Rami rules.

## License

MIT

## Credits

Created as part of the Fusion project by Builder.io
