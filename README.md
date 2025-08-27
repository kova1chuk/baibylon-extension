# WordFlow Extension

A browser extension that allows users to select text on any webpage and process it with AI. Built with React, TypeScript, and Vite.

## Features

- **Text Selection**: Select text on any webpage and process it with AI
- **User Authentication**: Secure authentication powered by Supabase
- **Google OAuth**: Sign in with Google accounts for convenience
- **Modern State Management**: Built with Recoil for efficient state management
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- **Chrome Extension**: Works seamlessly as a browser extension

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account and project

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd word-flow-extension
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase authentication (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions)

4. Create a `.env` file with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start the development server:

```bash
npm run dev
```

6. Build the extension:

```bash
npm run build:extension
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:extension` - Build the Chrome extension
- `npm run watch:extension` - Watch mode for extension development
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   └── auth/           # Authentication components
│       ├── Auth.tsx    # Main auth component
│       ├── SignIn.tsx  # Sign in form
│       ├── SignUp.tsx  # Sign up form
│       ├── ForgotPassword.tsx # Password reset
│       ├── GoogleSignIn.tsx   # Google OAuth button
│       └── UserProfile.tsx    # User profile display
├── hooks/               # Custom hooks
│   ├── useAuth.ts      # Authentication hook
│   └── useTextProcessing.ts # Text processing hook
├── providers/           # Context providers
│   └── AuthProvider.tsx # Recoil-based auth provider
├── store/               # Recoil state stores
│   ├── authStore.ts    # Authentication state
│   └── textStore.ts    # Text processing state
├── lib/                 # External library configurations
│   └── supabase.ts     # Supabase client configuration
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## Authentication

The extension uses Supabase for authentication, providing:

- User registration and login
- Google OAuth sign-in
- Password reset functionality
- Secure session management
- User profile management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For help with Supabase setup, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
For general support, please open an issue on GitHub.
