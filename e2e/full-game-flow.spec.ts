import { test, expect, chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Piece Together - Full E2E Multiplayer Flow', () => {
  test('Complete end-to-end game lifecycle', async () => {
    const browser = await chromium.launch({ headless: true });

    // 1. Host creates room
    const hostPage = await browser.newPage();
    await hostPage.goto(`${BASE_URL}/create`);
    await hostPage.fill('input[placeholder*="display name"]', 'Host Player');
    await hostPage.click('button:has-text("Create & Start Room")');

    await hostPage.waitForURL(/\/room\/.+/);
    const url = hostPage.url();
    const roomCode = url.split('/room/')[1];

    expect(roomCode).toMatch(/^[A-Z0-9-]+$/);
    console.log(`[E2E] Room created successfully: ${roomCode}`);

    // 2. Guest joins room
    const guestPage = await browser.newPage();
    await guestPage.goto(`${BASE_URL}/join`);
    await guestPage.fill('input[placeholder*="display name"]', 'Guest Player');
    await guestPage.fill('input[placeholder*="1234"]', roomCode);
    await guestPage.click('button:has-text("Enter Room")');

    await guestPage.waitForURL(`**/room/${roomCode}`);
    await expect(hostPage.locator('text=Players')).toBeVisible({ timeout: 5000 });
    console.log(`[E2E] Guest joined room ${roomCode}`);

    // 3. Host starts game
    await hostPage.click('button:has-text("Start Game")');
    await expect(hostPage.locator('canvas')).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator('canvas')).toBeVisible({ timeout: 5000 });
    console.log(`[E2E] Both clients entered canvas view`);

    // 4. Reconnect rehydration
    const rejoinedPage = await browser.newPage();
    await rejoinedPage.goto(`${BASE_URL}/room/${roomCode}`);
    await expect(rejoinedPage.locator('canvas')).toBeVisible({ timeout: 5000 });
    console.log(`[E2E] Reconnect rehydration verified`);

    await browser.close();
  });
});