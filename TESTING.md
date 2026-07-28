# IntelliChat Automated Testing Documentation

This document describes the automated testing infrastructure implemented for the **IntelliChat** full-stack application using Jest.

---

## 1. Directory Structure

```text
IntelliChat/
├── backend/
│   ├── tests/
│   │   ├── helpers.test.js          # Helper function unit tests
│   │   ├── middleware/
│   │   │   └── middleware.test.js   # Auth middleware unit tests
│   │   ├── auth/
│   │   │   └── auth.test.js         # Auth registration/login API endpoint tests
│   │   ├── memory/
│   │   │   └── memory.test.js       # Memory CRUD API endpoint tests
│   │   └── chat/
│   │       └── chat.test.js         # Chat threads/conversations API endpoint tests
│   ├── jest.config.js               # Backend Jest config (ESM, thresholds, coverage)
│   └── package.json                 # Backend scripts and dependencies
│
├── frontend/
│   ├── src/
│   │   ├── __tests__/
│   │   │   └── Auth.test.jsx        # Auth component React Testing Library unit tests
│   │   ├── __mocks__/
│   │   │   └── fileMock.js          # Mock for asset/image imports in Jest
│   │   ├── utils/
│   │   │   └── navigation.js        # Testable helper functions wrapping window.location
│   │   └── setupTests.js            # Initializing jest-dom matchers
│   ├── .babelrc                     # Babel presets for JSX/React transpilation in tests
│   ├── jest.config.cjs              # Frontend Jest config (JSDOM environment)
│   └── package.json                 # Frontend scripts and dependencies
└── TESTING.md                       # This documentation file
```

---

## 2. Backend Testing

The backend test suite is configured for **ES Modules** (ESM) using Node's `--experimental-vm-modules` capability.

### Mocking Strategy
To avoid making actual database calls and to ensure fast, isolated runs:
- **Global Mongoose Mocking**: Registered using `jest.unstable_mockModule("mongoose", ...)` to intercept Mongoose model creation globally and return mock objects containing Jest spy functions (`findOne`, `findById`, `find`, `save`, `deleteMany`, etc.).
- **Constructor Prototype Mocking**: Attached instance methods like `save` and `comparePassword` to class prototypes so that mock assertions can be safely configured in individual test cases using `User.prototype.save.mockResolvedValue(...)` without losing static query functions.

---

## 3. Frontend Testing

The frontend test suite utilizes **React Testing Library** (RTL) and **Jest** in a `jsdom` (browser simulator) environment.

### Mocking & Testability
- **Babel Presets**: Configured in `.babelrc` to transpile JSX/React syntax during test execution.
- **Navigation Helpers**: Added a dedicated `navigation.js` wrapper around `window.location` to bypass JSDOM's read-only/non-configurable window location restrictions. This allows testing page reloads and Google Auth redirects cleanly via standard Jest spies:
  ```javascript
  jest.mock("../utils/navigation.js", () => ({
      reloadPage: jest.fn(),
      redirectPage: jest.fn()
  }));
  ```

---

## 4. Running the Tests

### Backend Tests
Navigate to the `backend` folder:
```bash
cd backend
```

- Run all tests:
  ```bash
  npm run test
  ```
- Run tests in watch mode:
  ```bash
  npm run test:watch
  ```
- Generate coverage reports:
  ```bash
  npm run test:coverage
  ```

### Frontend Tests
Navigate to the `frontend` folder:
```bash
cd frontend
```

- Run all tests:
  ```bash
  npm run test
  ```
- Run tests and generate coverage:
  ```bash
  npm run test:coverage
  ```
