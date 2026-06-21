import { test, expect } from '@playwright/test';

// Smoke tests — require the dev server running at localhost:5173
// and VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local

test.describe('Smoke — app carrega', () => {
  test('página inicial renderiza sem crash', async ({ page }) => {
    await page.goto('/');
    // Espera qualquer elemento raiz da aplicação — o title é fixo
    await expect(page).toHaveTitle(/Shopee/i);
  });

  test('tela de login visível quando não autenticado', async ({ page }) => {
    await page.goto('/');
    // A tela de login contém um campo de email
    await expect(page.getByRole('textbox', { name: /e-mail|email/i })).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Fluxo completo (requer usuário de teste) ─────────────────────────────────
// Preencha as variáveis de ambiente TEST_EMAIL e TEST_PASSWORD para rodar estes testes.

const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Fluxo autenticado', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Defina TEST_EMAIL e TEST_PASSWORD para rodar e2e autenticado');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: /e-mail|email/i }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: /senha|password/i }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    // Aguarda redirecionamento para o dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10_000 });
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
