import { expect, test } from '@playwright/test';

test.describe('Public route smoke checks', () => {
  test('loads landing page and redirects protected create path to login', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /your child's imagination,\s*sketched to life\./i }),
    ).toBeVisible();

    await page.getByRole('navigation').getByRole('link', { name: 'Start Creating' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('loads legal pages and unknown paths are normalized to home', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();

    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();

    await page.goto('/does-not-exist');
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: /your child's imagination,\s*sketched to life\./i }),
    ).toBeVisible();
  });
});