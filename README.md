# Tunisian Rami Card Game

A modern implementation of the traditional Tunisian Rami card game, built with React and TypeScript.

## Features

- **Single Device Mode**: Play with friends on the same device
- **Simulated Multiplayer**: Play with friends through session sharing
- **Traditional Rules**: Authentic Tunisian Rami gameplay with all traditional rules
- **Modern UI**: Beautiful, responsive design with glass-morphism effects

## Tech Stack

- **React 18** - For the UI components and state management
- **TypeScript** - For type safety
- **Vite** - For fast development and optimized builds
- **TailwindCSS** - For styling
- **SessionStorage/LocalStorage** - For multiplayer session management
- **React Router** - For navigation
- **Shadcn UI** - For UI components

## Deployment to Render.com

This project is configured for easy deployment on Render.com through GitHub:

1. **Fork or push this repository to your GitHub account**

2. **Create a new Web Service on Render.com:**

   - Connect your GitHub repository
   - Use the following settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: Leave empty (use Render's static site hosting)
     - **Publish directory**: `dist`

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

The multiplayer functionality uses browser's built-in localStorage and sessionStorage:

- **sessionStorage**: Stores game session data that persists across page refreshes but not across browser sessions
- **localStorage**: Stores player information for returning to games

### Session Management

- Each game has a unique 6-character code
- Players can create or join games using this code
- Sessions persist while the browser tab is open
- Games can be shared by copying and sharing the game code

## Game Rules

See the in-game rules section for complete Tunisian Rami rules.

## License

MIT

## Credits

Created as part of the Fusion project by Builder.io
