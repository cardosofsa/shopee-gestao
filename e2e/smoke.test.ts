import { expect, test } from '@playwright/test';

// Smoke tests — require the dev server running at localhost:5173
// and VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local

test.describe('Smoke — app carrega', () => {
  test('página inicial renderiza sem crash', async ({ page }) => {
    await page.goto('/');
    // Title is "Core — Business OS" (not Shopee — that's the platform, not the product)
    await expect(page).toHaveTitle(/Core/i);
  });

  test('tela de login visível quando não autenticado', async ({ page }) => {
    // App redirects "/" unauthenticated users to Landing page.
    // Login is at /login directly.
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Fluxo completo (requer usuário de teste) ─────────────────────────────────
// Preencha as variáveis de ambiente TEST_EMAIL e TEST_PASSWORD para rodar estes testes.

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Fluxo autenticado', () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    'Defina TEST_EMAIL e TEST_PASSWORD para rodar e2e autenticado'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    // Aguarda redirecionamento para o dashboard
    await page.waitForURL('**/', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
  });

  test('dashboard exibe KPIs', async ({ page }) => {
    await expect(page.getByText(/faturamento/i)).toBeVisible();
  });

  test('navegação para Vendas funciona', async ({ page }) => {
    await page.getByRole('link', { name: /vendas/i }).click();
    await expect(page.getByRole('heading', { name: /vendas/i })).toBeVisible();
  });

  test('navegação para Estoque funciona', async ({ page }) => {
    await page.getByRole('link', { name: /estoque/i }).click();
    await expect(page.getByRole('heading', { name: /estoque/i })).toBeVisible();
  });

  test('navegação para Kanban funciona', async ({ page }) => {
    await page.getByRole('link', { name: /kanban|tarefas/i }).click();
    await expect(page.getByText(/quadro/i)).toBeVisible();
  });
});
