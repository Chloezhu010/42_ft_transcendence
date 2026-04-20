import { expect, test } from '@playwright/test';

const AUTH_TOKEN_STORAGE_KEY = 'auth.accessToken';

const testUser = {
  id: 7,
  email: 'playwright@example.com',
  username: 'Playwright User',
  avatar_url: null,
  is_online: true,
  created_at: '2026-04-20T00:00:00.000Z',
};

test.describe('Authenticated shell smoke checks', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [AUTH_TOKEN_STORAGE_KEY, 'playwright-token'],
    );

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(testUser),
      });
    });
  });

  test('loads profile and updates html direction on language change', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: /your profile/i })).toBeVisible();

    const languageButton = page.getByRole('button', { name: 'Select language' });
    await languageButton.click();

    const languageOptions = page.getByRole('menuitemradio');
    await expect(languageOptions).toHaveCount(6);

    await languageOptions.nth(5).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});