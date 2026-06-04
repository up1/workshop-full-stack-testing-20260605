# Create project with Vite


## Create project with Vite + Vue
```
$npm create vite@latest
$cd frontend
$cd demo-vue
$npm install
$npm run dev
```

## Run unit tests
```
$npm run test
```

## Run e2e tests with Playwright
* Network interception is used to mock backend responses for testing different scenarios (TC001–TC005) without needing a live API or database. This allows for fast, reliable tests that cover all cases, including error handling and account locking logic.
```
$npm run test:e2e
```

Access http://localhost:5173/

## Initial playwright test
```
$npm init playwright@latest
$npx playwright install
```

Run tests with `npx playwright test` (or `npm run test:e2e` if you add a script in `package.json`).

