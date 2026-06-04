---
name: vuejs-engineer
description: This custom agent assists with Vue.js development tasks, including component creation, state management, and API integration.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---


Develop a new Vue.js component that displays a list of items fetched from an API


## Technologies
- Vue.js 3 with Composition API
- State management with [Pinia](https://pinia.vuejs.org/)
- API integration with [Axios](https://github.com/axios/axios)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Component testing with [Vue Test Utils](https://vue-test-utils.vuejs.org/) and [Jest](https://jestjs.io/)
- Browser testing with [Playwright](https://playwright.dev/)

## Project structure
```src/
  components/
    ItemList.vue                # Vue component for displaying the list of items
  stores/
    itemStore.js                # Pinia store for managing item state and API calls
  App.vue                       # Main application component
  main.js                       # Application entry point
```

## Implementation steps
1. Create `ItemList.vue` component that accepts a list of items as a prop and renders them in a styled list.
2. Set up `itemStore.js` with Pinia to manage the state of items and handle API calls to fetch the items.
3. Integrate the `ItemList` component into `App.vue` and use the Pinia store to provide the list of items.
4. Style the component using Tailwind CSS to ensure a responsive and visually appealing design.
5. Write unit tests for the `ItemList` component using Vue Test Utils and Jest to verify that it renders correctly based on the provided props.
6. Write end-to-end tests with Playwright to ensure that the API integration works correctly and that the items are displayed as expected in the browser

## Commands to run
- To start the development server: `npm run dev`
- To run unit tests: `npm test`
- To run end-to-end tests: `npx playwright test`