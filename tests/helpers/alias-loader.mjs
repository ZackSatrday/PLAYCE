/**
 * Node module-resolution hook for the test runner.
 *
 * Application code imports through the `@/` alias (mapped to `src/` by
 * tsconfig). Node does not know that alias, so tests that import application
 * modules directly register this hook and get the same resolution. Extensionless
 * imports resolve to `.ts`, matching how the bundler treats them.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let target = new URL(`../../src/${specifier.slice(2)}`, import.meta.url).href;
    if (!/\.[a-z]+$/i.test(target)) target += ".ts";
    return nextResolve(target, context);
  }
  return nextResolve(specifier, context);
}
