# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-routes.spec.ts >> Public route smoke checks >> loads legal pages and unknown paths are normalized to home
- Location: tests/e2e/public-routes.spec.ts:16:3

# Error details

```
Error: browserType.launch: 
╔══════════════════════════════════════════════════════╗
║ Host system is missing dependencies to run browsers. ║
║ Please install them with the following command:      ║
║                                                      ║
║     sudo npx playwright install-deps                 ║
║                                                      ║
║ Alternatively, use apt:                              ║
║     sudo apt-get install libgtk-4-1\                 ║
║         libicu74\                                    ║
║         libxml2\                                     ║
║         libevent-2.1-7t64\                           ║
║         libflite1\                                   ║
║         libjpeg-turbo8\                              ║
║         libmanette-0.2-0\                            ║
║         libenchant-2-2\                              ║
║         libwoff1                                     ║
║                                                      ║
║ <3 Playwright Team                                   ║
╚══════════════════════════════════════════════════════╝
```