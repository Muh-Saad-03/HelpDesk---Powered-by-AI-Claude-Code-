---
name: Login page locators
description: Stable Playwright locators for LoginPage and NavBar — CardTitle is a div not h1
type: project
---

## LoginPage (`client/src/pages/LoginPage.tsx`)

CardTitle renders as `<div data-slot="card-title">` — NOT an `<h1>`. Using `getByRole("heading", { name: "Sign in" })` FAILS.

Stable login-page presence locator: `page.getByText("Sign into your account")`
- Source: the CardDescription text, unique to the login page
- Both the route-guard tests and sign-out tests use this to confirm the user is on /login

Email field: `page.getByLabel("Email")` — works via `<FieldLabel htmlFor="login-email">` + `<Input id="login-email">`
Password field: `page.getByLabel("Password")` — same pattern with `id="login-password"`
Submit button: `page.getByRole("button", { name: /sign in/i })`

Validation errors: rendered by `FieldError` with `role="alert"`. Text assertions:
- Empty/invalid email: `page.getByText(/enter a valid email/i)`
- Empty password: `page.getByText(/password is required/i)`

API error (wrong creds): `<Alert variant="destructive">` also has `role="alert"`.
Use `page.getByRole("alert")` — fine in isolation since only one alert shows at a time in failure tests.

## Home page (`client/src/pages/Home.tsx`)

Title: `<h1>Welcome</h1>` — use `page.getByRole("heading", { name: "Welcome", level: 1 })`

## UsersPage (`client/src/pages/UsersPage.tsx`)

Title: `<h1>Users</h1>` (inside `<main>`) — use `page.getByRole("heading", { name: "Users", level: 1 })`

## NavBar (`client/src/components/NavBar.tsx`)

Container: `page.getByRole("navigation")`
Links: `nav.getByRole("link", { name: "Helpdesk" })`, `nav.getByRole("link", { name: "Users" })` (admin only)
User label: `nav.getByText(`${user.name} (role: ${user.role.toLowerCase()})`)`
Sign out: `nav.getByRole("button", { name: /sign out/i })`
