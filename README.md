# Chat Support Website

A functional chat support website with user authentication, built using Node.js, HTML, CSS, and JavaScript.

## Features

- User registration and login
- Forgot password with reset token
- Chat interface with bot responses
- Audio captcha after 2 messages
- Video unlock after captcha completion

## Structure

- `index.html`: Main HTML structure
- `style.css`: CSS styling
- `script.js`: Front-end JavaScript logic
- `server.js`: Back-end server using Node.js built-in modules
- `users.json`: JSON database for users and reset tokens

## Installation

1. Ensure Node.js is installed (version 12+)
2. Clone or download the project
3. Run `node server.js` in the project directory

## Usage

1. Start the server: `node server.js`
2. Open `http://localhost:3000` in your browser
3. Register a new account or sign in
4. Start chatting
5. After 2 messages, solve the audio captcha to unlock the video

## API Endpoints

- `POST /api/register`: Register a new user
- `POST /api/login`: Login user
- `POST /api/forgot`: Request password reset token
- `POST /api/reset`: Reset password with token

## Notes

- User data and reset tokens are stored in `users.json` and persist across server restarts
- Captcha is client-side using speech synthesis
- For production, use a proper database like MongoDB or PostgreSQL, and hash passwords