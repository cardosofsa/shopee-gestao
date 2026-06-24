import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — dados considerados frescos
      gcTime: 30 * 60 * 1000, // 30 min — cache vive enquanto não usado
      retry: 2,
      refetchOnWindowFocus: true, // revalida ao voltar para a aba
    },
    mutations: {
      retry: 1,
    },
  },
});
