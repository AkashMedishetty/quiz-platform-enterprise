# 🎮 PurpleHat Quiz Application

A real-time interactive quiz application built with React, TypeScript, and Supabase.

## 🚀 Features

- **Real-time Synchronization** - Instant updates across all clients
- **Host Dashboard** - Create and manage quiz sessions
- **Participant Interface** - Join quizzes and answer questions
- **Big Screen Display** - Live audience display with statistics
- **Template System** - Save and reuse quiz templates
- **Live Leaderboard** - Real-time participant rankings
- **Answer Analytics** - Detailed question statistics

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd quiz-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

1. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and anon key

2. **Run migrations**
   ```bash
   # Apply database migrations
   npx supabase db push
   ```

3. **Enable Row Level Security (RLS)**
   - All tables have RLS enabled with public access policies
   - Suitable for quiz applications

## 🚀 Deployment

### Option 1: Vercel (Recommended)

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Set environment variables in Vercel**
   - Go to your Vercel project settings
   - Add environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: GitHub Actions + Vercel

1. **Set up GitHub Secrets**
   Go to your GitHub repository → Settings → Secrets and variables → Actions
   Add the following secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Push to main branch**
   ```bash
   git push origin main
   ```

3. **Automatic deployment**
   - GitHub Actions will run tests
   - Build the application
   - Deploy to Vercel

### Option 3: Netlify

1. **Create netlify.toml**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy to Netlify**
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests (placeholder)

### Project Structure

```
src/
├── components/          # React components
│   ├── HostDashboard.tsx
│   ├── ParticipantQuiz.tsx
│   ├── BigScreenDisplay.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useSupabaseQuiz.tsx
│   └── ...
├── lib/                # Utility libraries
│   ├── supabase.ts
│   ├── realtimeSync.ts
│   └── ...
├── types.ts            # TypeScript type definitions
└── App.tsx             # Main application component
```

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Public access policies for quiz functionality
- Environment variables for sensitive data
- CORS configured for production domains

## 📱 Usage

### Host Flow
1. Create a new quiz session
2. Add questions and configure settings
3. Make quiz live
4. Start the quiz and manage questions
5. View real-time statistics

### Participant Flow
1. Enter session code
2. Provide name and mobile number
3. Answer questions in real-time
4. View live leaderboard

### Big Screen Flow
1. Access `/big-screen/{code}`
2. Display live quiz content
3. Show real-time statistics
4. Display final results

## 🐛 Troubleshooting

### Common Issues

1. **Real-time sync not working**
   - Check Supabase Realtime is enabled
   - Verify environment variables
   - Check browser console for errors

2. **Build failures**
   - Ensure all dependencies are installed
   - Check TypeScript errors
   - Verify environment variables are set

3. **Database connection issues**
   - Verify Supabase URL and key
   - Check RLS policies
   - Ensure migrations are applied

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, please open an issue on GitHub or contact the development team. 