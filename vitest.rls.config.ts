import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// 로컬 Supabase(`supabase start`)가 떠 있어야 하는 RLS 통합 테스트 전용 설정.
export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    env: loadEnv(mode, process.cwd(), ""),
    include: ["src/test/**/*.integration.test.ts"],
  },
}));
