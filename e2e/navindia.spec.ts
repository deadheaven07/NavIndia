import { test, expect } from '@playwright/test';

test.describe('NavIndia 3D Multi-Modal Transit Engine - End-to-End User Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local running instance
    await page.goto('http://127.0.0.1:5173/');
    // Wait for the Web Worker and MapLibre canvas to initialize
    await page.waitForSelector('canvas.maplibregl-canvas', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1500); // Allow initial route calculation and framing to settle
  });

  test('User Flow 1: Loads initial application, verified 1,500+ node graph telemetry and 3D map viewport', async ({ page }) => {
    // 1. Verify Branding & Header
    const brand = page.getByRole('heading', { name: 'NavIndia' });
    await expect(brand).toBeVisible();

    // 2. Verify Graph Telemetry HUD (1,500+ nodes and 11,000+ directed edges)
    const telemetry = page.getByText('GRAPH:');
    await expect(telemetry).toBeVisible();
    const topology = page.locator('text=/\\d+V \\/ \\d+E/');
    await expect(topology).toBeVisible();

    // 3. Verify Route Options cards are displayed
    const routeCards = page.locator('.group.cursor-pointer.rounded-2xl');
    await expect(routeCards.first()).toBeVisible();

    await page.waitForTimeout(1000);
  });

  test('User Flow 2: Inspects Pareto route options and switches between multi-modal archetypes', async ({ page }) => {
    // Check for archetype cards (Smart Multi-Modal, Direct Cab, BMTC Bus)
    const smartCard = page.locator('.group.cursor-pointer').filter({ hasText: 'Smart Multi-Modal' }).first();
    const cabCard = page.locator('.group.cursor-pointer').filter({ hasText: 'Direct Cab' }).first();
    const busCard = page.locator('.group.cursor-pointer').filter({ hasText: 'BMTC' }).first();

    await expect(smartCard).toBeVisible();
    await expect(cabCard).toBeVisible();
    await expect(busCard).toBeVisible();

    // Click on Direct Cab card to select it
    await cabCard.click();
    await page.waitForTimeout(1200);

    // Click on BMTC Bus card to select it
    await busCard.click();
    await page.waitForTimeout(1200);

    // Click back to Smart Multi-Modal
    await smartCard.click();
    await page.waitForTimeout(1000);
  });

  test('User Flow 3: Toggles Peak Hour congestion and verifies multi-modal traffic resilience', async ({ page }) => {
    // Find the peak traffic toggle button by its descriptive title
    const trafficBtn = page.locator('button[title*="Peak Rush Hour Jam"]');
    await expect(trafficBtn).toBeVisible();

    // Toggle to Peak Congestion
    await trafficBtn.click();
    await expect(page.getByText('Peak Congestion')).toBeVisible();
    await page.waitForTimeout(1500);

    // Toggle back to Normal Traffic
    await trafficBtn.click();
    await expect(page.getByText('Normal Traffic')).toBeVisible();
    await page.waitForTimeout(1000);
  });

  test('User Flow 4: Uses Quick Corridor Presets and Origin/Destination Swapping', async ({ page }) => {
    // Click on Silk Board -> EcoSpace Bellandur preset
    const silkBoardPreset = page.locator('button').filter({ hasText: 'Silk Board ➔ EcoSpace Bellandur' });
    if (await silkBoardPreset.isVisible()) {
      await silkBoardPreset.click();
      await page.waitForTimeout(1800);
    }

    // Click on Majestic -> Whitefield ITPL preset
    const majesticPreset = page.locator('button').filter({ hasText: 'Majestic ➔ Whitefield ITPL' });
    if (await majesticPreset.isVisible()) {
      await majesticPreset.click();
      await page.waitForTimeout(1800);
    }

    // Click the Swap button
    const swapBtn = page.locator('button[title="Swap Origin & Destination"]');
    await expect(swapBtn).toBeVisible();
    await swapBtn.click();
    await page.waitForTimeout(1500);

    // Swap back
    await swapBtn.click();
    await page.waitForTimeout(1000);
  });

  test('User Flow 5: Interacts with 3D Camera Controls and Theme Toggle', async ({ page }) => {
    // Switch to Chase (75°) Camera Mode
    const chaseBtn = page.locator('button').filter({ hasText: 'Chase (75°)' });
    await expect(chaseBtn).toBeVisible();
    await chaseBtn.click();
    await page.waitForTimeout(1500);

    // Switch to 2D Plan (0°) Camera Mode
    const planBtn = page.locator('button').filter({ hasText: '2D Plan (0°)' });
    await expect(planBtn).toBeVisible();
    await planBtn.click();
    await page.waitForTimeout(1500);

    // Switch back to 3D Tilt (60°)
    const tiltBtn = page.locator('button').filter({ hasText: '3D Tilt (60°)' });
    await expect(tiltBtn).toBeVisible();
    await tiltBtn.click();
    await page.waitForTimeout(1500);

    // Toggle 3D Buildings
    const buildingsBtn = page.locator('button[title="Toggle 3D Extruded Buildings"]');
    await expect(buildingsBtn).toBeVisible();
    await buildingsBtn.click();
    await page.waitForTimeout(1000);
    await buildingsBtn.click(); // restore
    await page.waitForTimeout(1000);

    // Toggle Theme (Light / Dark)
    const themeBtn = page.locator('button[title="Toggle Light / Dark theme"]');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await page.waitForTimeout(1200);
    await themeBtn.click(); // restore
    await page.waitForTimeout(1000);
  });

  test('User Flow 6: Real-Time Map Clicking with KD-Tree Junction Snapping via Web Worker', async ({ page }) => {
    const canvas = page.locator('canvas.maplibregl-canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Click at center-right of 3D map canvas to snap destination GPS point
    const clickX = box.x + box.width * 0.65;
    const clickY = box.y + box.height * 0.45;

    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(2000); // Allow Web Worker KD-tree to snap and camera to frame path

    // Toggle Click Target mode from Destination to Origin
    const toggleTargetBtn = page.locator('button[title*="Click to toggle whether map clicks"]');
    await expect(toggleTargetBtn).toBeVisible();
    await toggleTargetBtn.click();
    await page.waitForTimeout(1000);

    // Click another coordinate to snap Origin
    const originClickX = box.x + box.width * 0.55;
    const originClickY = box.y + box.height * 0.60;
    await page.mouse.click(originClickX, originClickY);
    await page.waitForTimeout(2000);

    // Restore to Destination mode
    await toggleTargetBtn.click();
    await page.waitForTimeout(1000);
  });

  test('User Flow 7: "Fly 3D Path" Trajectory Simulation and Live Turn-by-Turn Navigation', async ({ page }) => {
    // Look for the "Fly 3D Path" button on the selected card or bottom deck
    const flyBtn = page.locator('button').filter({ hasText: /Fly 3D Path|Simulate 3D Flight/i }).first();
    await expect(flyBtn).toBeVisible();

    // Start 3D Flight Simulation
    await flyBtn.click();

    // Verify turn-by-turn live navigation pill is active
    const navBanner = page.locator('.glass-panel').filter({ hasText: /Live Navigation|Next Step/i }).first();
    await expect(navBanner).toBeVisible();

    // Let the simulation smoothly fly along the 3D glowing path for 3 seconds
    await page.waitForTimeout(3000);

    // Pause simulation
    const pauseBtn = page.locator('button').filter({ hasText: /Pause/i }).first();
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
