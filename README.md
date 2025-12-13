## Environment Setup

This project requires Supabase credentials to function.

### First-time Setup:

1. Copy the environment template:

   ```bash
   cp src/environments/environment.template.ts src/environments/environment.ts
   cp src/environments/environment.template.ts src/environments/environment.production.ts
   ```

2. Get your Supabase credentials:

   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings > API
   - Copy the "Project URL" and "anon public" key

3. Update both environment files with your credentials:
   - Open `src/environments/environment.ts`
   - Replace `YOUR_SUPABASE_PROJECT_URL` with your Project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon public key
   - Repeat for `src/environments/environment.production.ts`

### Environment Files:

- `environment.ts` - Development configuration (not committed to git)
- `environment.production.ts` - Production configuration (not committed to git)
- `environment.template.ts` - Template file (safe to commit)

**Never commit files containing real credentials to git!**
