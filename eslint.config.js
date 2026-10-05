import js from "@eslint/js"
import prettierConfig from "eslint-config-prettier"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * ESLint 扁平配置（ESLint 9 + typescript-eslint 8）。
 *
 * 覆盖范围：JS 推荐规则 + typescript-eslint 推荐规则 + eslint-plugin-react 推荐
 * （含 jsx-* 系列规则）+ react-hooks 的两条核心规则（rules-of-hooks：Hook 不许进
 * 分支/循环/条件；exhaustive-deps：依赖数组要完整）。最后接 eslint-config-prettier
 * 关闭所有与 Prettier 冲突的格式化规则。
 *
 * 这里刻意不启用 react-hooks v7 里那套 React Compiler 规则（immutability / purity /
 * set-state-in-effect 等）：它们针对编译器可优化的写法，会对 app/components/ui、
 * app/components/kibo-ui 下第三方生成的组件大量误报，与本站的规则目标无关。
 */
export default tseslint.config(
  {
    ignores: [
      "build/**",
      ".react-router/**",
      ".wrangler/**",
      "node_modules/**",
      "public/**",
      "drizzle/**",
      ".agents/**",
      "worker-configuration.d.ts"
    ]
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      // 全部使用 TypeScript 类型，不需要 propTypes / 显式 import React
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      // JSX 规则
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-useless-fragment": "warn",
      "react/jsx-curly-brace-presence": [
        "warn",
        { props: "never", children: "never" }
      ],
      "react/self-closing-comp": "warn",
      "react/jsx-boolean-value": ["warn", "never"],
      // Hook 规则
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // TypeScript
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" }
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  },

  prettierConfig
)
