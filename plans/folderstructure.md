# SvelteKit Professional and Scalable Coding Practices

## Folder Structure

- Organize `src/lib/` into clear subfolders:
  - `components/`: Reusable Svelte components.
  - `utils/`: Utility functions, API calls, and helper modules.
  - `stores/`: Svelte stores for shared reactive state.
  - `assets/`: Imported images, icons, and other static assets.
- Place each page route under `src/routes/[route-name]/` with route-specific components and logic.
- Keep static assets served publicly in the `static/` folder.

## Component Structure and File Organization

- Split large components into smaller, focused components capped around 300 lines.
- Use file naming conventions with SvelteKit:
  - `+page.svelte`: Main page component.
  - `+page.ts` or `+page.js`: Page-specific load functions and server-side logic.
  - `+layout.svelte`: Shared layouts for nested routing.
- Co-locate components with route folders when components are only used by that route.

## Code Modularity

- Extract shared logic or data handlers into utilities (`src/lib/utils/`).
- Use Svelte stores to share reactive state across components and routes.
- Use Svelte’s event dispatcher to communicate from child to parent components.
- Pass props to child components for data flow.

## Styling

- Write scoped component styles inside `<style>` tags in `.svelte` files.
- For shared styles or complex styling (e.g., Tailwind, CSS modules), organize in `src/lib/styles/`.
- Use consistent naming conventions for CSS classes (e.g., kebab-case).

## Coding Conventions and Readability

- Maintain clear separation of concerns between markup, script, and style.
- Use PascalCase for component filenames.
- Limit components to about 300 lines of code for readability and maintenance.
- Use descriptive names for components, stores, and utilities.
- Format code consistently with tools like Prettier and ESLint.

## Testing

- Write unit tests for components and stores.
- Use snapshot testing for UI consistency.
- Test server-side API routes as needed (e.g., with Playwright).

## Performance and Optimization

- Leverage SvelteKit’s load functions (`+page.ts`, `+layout.ts`) for data fetching.
- Use code splitting by breaking large pages into smaller child components.
- Use Svelte’s reactive declarations and stores effectively to minimize unnecessary renders.

## Collaboration and Documentation

- Document components with comments and preferably use Storybook for isolated component documentation.
- Share coding standards and structure guidelines with team members to maintain code consistency.

---

Following these rules helps maintain a scalable, maintainable, and professional SvelteKit codebase that is easy to understand by yourself and teammates, and ready for production deployment.

