import { test, expect } from '@playwright/test';

/*
 * E2E WEB — parcours de base (Playwright). S'exécute contre l'app RÉELLE servie
 * par Vite. Robuste aux détails de copie (cible structures/rôles, pas des textes).
 */
test.describe('Application web — chargement & accueil', () => {
  test('la page se charge sans erreur console fatale', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
    expect(errors, `erreurs: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('l’écran d’authentification présente des champs de saisie', async ({ page }) => {
    await page.goto('/');
    const inputs = page.locator('input');
    await expect(inputs.first()).toBeVisible({ timeout: 10_000 });
    expect(await inputs.count()).toBeGreaterThan(0);
  });

  test('la saisie met à jour la valeur du champ', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('input').first();
    await first.waitFor({ state: 'visible', timeout: 10_000 });
    await first.fill('Cephalojoueur');
    await expect(first).toHaveValue('Cephalojoueur');
  });
});

test.describe('Application web — résilience', () => {
  test('recharger ne casse pas le montage', async ({ page }) => {
    await page.goto('/');
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });
  test('une route inconnue ne produit pas d’écran blanc fatal', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/#/route-inexistante');
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
