# Flashcard App

A modern flashcard application built with Next.js, Tailwind CSS, and Firebase.

## Features

- Anonymous authentication with Firebase
- Interactive flashcard interface with flip animation
- Automatic card rotation every 10 seconds
- Track learned words in Firestore and localStorage
- Modern and responsive design with Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Click "Start Learning" to begin with anonymous authentication
2. View the English word on the front of the card
3. Click the card to flip it and see the Turkish translation
4. Use the buttons to:
   - "Learned": Mark the word as learned and move to the next card
   - "Keep in List": Move to the next card without marking as learned
5. Cards automatically flip every 10 seconds

## Security

This application uses:
- Firebase Authentication for secure user management
- Firestore for persistent storage
- Environment variables for sensitive configuration
- Modern dependency versions with zero critical vulnerabilities

## License

MIT 