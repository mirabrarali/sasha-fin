@echo off
echo ========================================
echo Git Push Script for Code Improvements
echo ========================================
echo.

cd /d "%~dp0"

echo Checking git status...
git status

echo.
echo Adding all changes...
git add .

echo.
echo Committing changes...
git commit -m "Fix critical issues: improve code quality, add file validation, timeouts, and Vercel deployment readiness

- Fixed README documentation (Genkit -> LangChain)
- Added .env.example file
- Implemented lazy initialization for environment variables
- Improved knowledge base storage for serverless
- Added file size validation (10MB PDF, 5MB CSV/XLSX)
- Fixed type safety issues (replaced any with unknown)
- Added localStorage size management
- Implemented request timeouts for all LLM calls
- Created constants.ts for centralized configuration
- Improved error handling across all flows
- Added storage-utils.ts and timeout-utils.ts utilities
- All changes are Vercel deployment ready"

echo.
echo Pushing to remote repository...
git push origin master

echo.
echo ========================================
echo Done! Check the output above for any errors.
echo ========================================
pause
