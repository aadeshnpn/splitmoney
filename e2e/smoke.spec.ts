import { expect, test } from '@playwright/test';

test('dev test user can sign in and open household setup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SplitMoney' })).toBeVisible();

  await page.waitForFunction(() => typeof window.signInAsTestUser === 'function');
  await page.evaluate(async () => {
    const signIn = window.signInAsTestUser;
    if (!signIn) throw new Error('Dev test sign-in is not available');
    await signIn('Playwright User', 'playwright-user');
  });

  await page.waitForURL('**/household');
  await expect(page.getByRole('heading', { name: 'Setup Your Household' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Household' })).toBeVisible();
});
