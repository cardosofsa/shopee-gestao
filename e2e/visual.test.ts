import { expect, test } from '@playwright/test';

/**
 * Testes de regressão visual — Fase 9
 *
 * Focados em páginas 100% estáticas (sem dados dinâmicos) para evitar
 * falsos positivos. Dados dinâmicos requerem seed determinístico (Fase 2).
 *
 * Baselines geradas com: npx playwright test e2e/visual.test.ts --update-snapshots
 *
 * Tolerância: 0.1% de pixels diferentes (antialiasing, sub-pixel rendering).
 */

const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.001,
  // Animações desabilitadas via CSS (abaixo) para screenshots consistentes
};

test.use({
  // Viewport fixo para screenshots determinísticos
  viewport: { width: 1280, height: 720 },
});

test.beforeEach(async ({ page }) => {
  // Desabilita animações CSS para screenshots determinísticos
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
});

// ── Páginas estáticas (sem autenticação) ─────────────────────────────────────

test('visual: página de login', async ({ page }) => {
  await page.goto('/');
  // Aguarda React renderizar — não depende de Supabase estar conectado
  await page.waitForLoadState('domcontentloaded');
  // Espera o primeiro elemento interativo ou 3s (o que vier primeiro)
  await Promise.race([
    page
      .getByRole('textbox')
      .first()
      .waitFor({ timeout: 3_000 })
      .catch(() => null),
    page.waitForTimeout(3_000),
  ]);
  await expect(page).toHaveScreenshot('login.png', SNAPSHOT_OPTS);
});

test('visual: página 404', async ({ page }) => {
  await page.goto('/rota-inexistente-404');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('404.png', SNAPSHOT_OPTS);
});

// ── Páginas autenticadas (requerem TEST_EMAIL + TEST_PASSWORD) ────────────────
// Desabilitadas por padrão — reativadas com seed determinístico (Fase 2).

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('visual: páginas autenticadas', () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    'Defina TEST_EMAIL e TEST_PASSWORD + seed determinístico para visual autenticado'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: /e-mail|email/i }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: /senha|password/i }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await page.waitForURL('**/dashboard**', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
  });

  test('visual: dashboard', async ({ page }) => {
    // Mascara valores numéricos dinâmicos (KPIs que mudam com dados reais)
    await page.addStyleTag({
      content: `[data-kpi], .kpi-value { visibility: hidden !important; }`,
    });
    await expect(page).toHaveScreenshot('dashboard.png', SNAPSHOT_OPTS);
  });
});
