# Contributing to Dream Pixel

Thank you for contributing to Dream Pixel! This guide will help you get started with development and deployment.

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/dream-pixel.git
cd dream-pixel

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Write your code
- Follow existing code style and conventions
- Add tests for new features

### 3. Run Quality Checks
```bash
# Lint code
npm run lint

# Type checking
npm run type-check

# Run tests
npm run test

# Build for production
npm run build
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add new feature"
```

**Commit message format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style
- `refactor:` - Refactoring
- `test:` - Tests
- `chore:` - Maintenance

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Pull Request Process

1. **Title and Description**
   - Clear, descriptive title
   - Explain what changes and why
   - Reference any related issues

2. **Automated Checks**
   - CI pipeline runs automatically
   - All checks must pass
   - Code coverage must meet threshold

3. **Code Review**
   - At least one approval required
   - Reviewers check for:
     - Code quality
     - Security implications
     - Performance impact
     - Test coverage

4. **Merge**
   - Squash commits to main branch
   - Delete feature branch

## Testing

### Running Tests
```bash
# Run all tests
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests
Tests go in `__tests__/` directory with same structure as source.

Example:
```typescript
describe('/api/health', () => {
  it('should return healthy status', async () => {
    const response = await GET()
    expect(response.status).toBeLessThanOrEqual(503)
  })
})
```

## Code Style

### TypeScript
- Use strict mode (enabled by default)
- Type all function parameters and returns
- Avoid `any` type

### Formatting
- ESLint is configured and runs automatically
- Use `npm run lint -- --fix` to auto-fix

### Naming Conventions
- Files: kebab-case (e.g., `user-service.ts`)
- Classes: PascalCase (e.g., `UserService`)
- Functions: camelCase (e.g., `getUserData()`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

## Deployment

### To Production
1. Create PR from feature branch
2. Ensure all checks pass
3. Get code review approval
4. Merge to `main` branch
5. CI/CD automatically deploys to Vercel

### Deployment Checklist
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code review approved
- [ ] No breaking changes

## Environment Variables

Development uses `.env.local` (not committed):
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Production variables are set in Vercel dashboard.

See [.env.example](../.env.example) for all available variables.

## Documentation

- **Setup**: See [SETUP.md](../SETUP.md)
- **Deployment**: See [DEPLOYMENT.md](../DEPLOYMENT.md)
- **Monitoring**: See [MONITORING.md](../MONITORING.md)
- **Security**: See [SECURITY.md](../SECURITY.md)

## Debugging

### Local Development
```bash
# Enable debug logging
DEBUG_MODE=true npm run dev

# Use VS Code debugger (recommended)
# .vscode/launch.json is configured
```

### Production Issues
1. Check Sentry dashboard: https://sentry.io
2. Review logs in Vercel
3. Check health endpoint: https://yourdomain.com/api/health

### Database Issues
```bash
# Open Prisma Studio
npm run prisma:studio

# Check migrations
npx prisma migrate status
```

## Common Issues

### Port Already in Use
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Module Not Found
```bash
# Regenerate Prisma client
npm run prisma:generate

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Failed
```bash
# Verify DATABASE_URL in .env.local
# Check database is running
# For Supabase, verify IP whitelist
```

## Performance Tips

1. **Bundle Analysis**
   ```bash
   npm run build
   # Check .next folder size
   ```

2. **Database Queries**
   - Use Prisma Studio to analyze queries
   - Add indexes for frequently queried columns
   - Use pagination for large datasets

3. **API Performance**
   - Check Web Vitals in Sentry
   - Review slow requests
   - Implement caching

## Security Guidelines

1. **Never Commit Secrets**
   - Keep API keys in `.env` files
   - Use GitHub secrets for CI/CD
   - Use Vercel environment variables for production

2. **Input Validation**
   - Validate all user input with Zod
   - Sanitize file uploads
   - Check file size and type

3. **Error Handling**
   - Don't expose stack traces to users
   - Log errors to Sentry
   - Use generic error messages

## Getting Help

- **Documentation**: Check README files in project
- **Issues**: Create GitHub issue with details
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact dev team for urgent issues

## Code of Conduct

- Be respectful to all contributors
- Provide constructive feedback
- Follow established guidelines
- Report issues privately

---

**Last Updated**: 2024
**Maintained By**: Development Team

Happy Contributing! 🚀
