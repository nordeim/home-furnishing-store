import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  // Operator contract: the vendored skills/ folder is excluded from code
  // checking, testing and compilation — it is reference material, not app code.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "skills/**"]),
]);
