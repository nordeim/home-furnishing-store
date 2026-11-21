import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  // Operator contract: the vendored skills/ folder is excluded from code
  // checking, testing and compilation — it is reference material, not app code.
  // playwright-report/ + test-results/ are the Task-126-F-9 html/list
  // reporter's generated bundles (gitignored build artifacts — the bundled
  // trace UI trips react-hooks/rules-of-hooks with 60+ phantom errors when
  // lint runs AFTER an e2e run; the canonical gate order hides the trap,
  // this closes it).
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "skills/**", "playwright-report/**", "test-results/**"]),
]);
