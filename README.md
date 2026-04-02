# Payment Gateway Sample Apps

![GitHub License](https://img.shields.io/github/license/cashfree/pg-samples)
![Discord](https://img.shields.io/discord/931125665669972018)

This repository contains sample applications that demonstrate how to integrate Cashfree Payments Payment Gateway across backend frameworks, frontend stacks, mobile-friendly web apps, and language-specific SDK examples.

Each sample lives in its own folder and usually includes setup steps, required credentials, and a basic payment flow using Cashfree PG test mode.

## Getting Started

1. Clone this repository.
2. Open the sample folder that matches your preferred tech stack.
3. Follow the setup instructions in that sample's local `README.md`.
4. Add your Cashfree PG credentials and run the app locally.

## Current Repository Structure

```text
pg-samples/
├── Asp.net Webforms/
├── dotnet core/
├── element-js/
├── go/
│   ├── echo/
│   ├── gin/
│   └── htmx/
├── java/
│   ├── hibernate/
│   └── springboot/
├── node/
│   ├── express/
│   ├── hono/
│   ├── koa/
│   └── nest/
├── node-js(express)/
│   └── server/
├── php/
│   ├── codeigniter/
│   ├── laravel/
│   └── PHP_SDK_Sample/
├── python/
│   ├── django/
│   └── flask/
├── ruby/
│   └── ror/
├── sub-sample/
│   └── node/
└── web/
    ├── angular/
    ├── next/
    ├── nuxt/
    └── sveltekit/
```

## Sample Links

| Category | Sample | Path |
| --- | --- | --- |
| .NET | ASP.NET Webforms | [Asp.net Webforms](Asp.net%20Webforms/) |
| .NET | .NET Core | [dotnet core](dotnet%20core/) |
| Frontend | Element JS | [element-js](element-js/) |
| Go | Echo | [go/echo](go/echo/) |
| Go | Gin | [go/gin](go/gin/) |
| Go | HTMX | [go/htmx](go/htmx/) |
| Java | Hibernate | [java/hibernate](java/hibernate/) |
| Java | Spring Boot | [java/springboot](java/springboot/) |
| Node.js | Express | [node/express](node/express/) |
| Node.js | Hono | [node/hono](node/hono/) |
| Node.js | Koa | [node/koa](node/koa/) |
| Node.js | Nest | [node/nest](node/nest/) |
| Node.js | Legacy Express Server | [node-js(express)/server](node-js(express)/server/) |
| PHP | CodeIgniter | [php/codeigniter](php/codeigniter/) |
| PHP | Laravel | [php/laravel](php/laravel/) |
| PHP | PHP SDK Sample | [php/PHP_SDK_Sample](php/PHP_SDK_Sample/) |
| Python | Django | [python/django](python/django/) |
| Python | Flask | [python/flask](python/flask/) |
| Ruby | Ruby on Rails | [ruby/ror](ruby/ror/) |
| Sub Sample | Node Express | [sub-sample/node](sub-sample/node/) |
| Web | Angular | [web/angular](web/angular/) |
| Web | Next.js | [web/next](web/next/) |
| Web | Nuxt | [web/nuxt](web/nuxt/) |
| Web | SvelteKit | [web/sveltekit](web/sveltekit/) |

## What You'll Typically Find In A Sample

- Local setup instructions
- Environment or config placeholders for Cashfree credentials
- Server-side order creation flow
- Frontend checkout initiation using Cashfree
- Success and failure handling
- Return URL or payment status verification examples

## Contribution Guidelines

We welcome new PG sample apps and improvements to existing ones.

### Minimum Expectations

- Add the project in the appropriate tech-stack directory
- Include a clear `README.md` with setup and usage instructions
- Use Cashfree PG test credentials and test environment defaults
- Demonstrate an end-to-end payment flow

### Suggested Flow

1. Fork this repository.
2. Create or update a sample in the relevant folder.
3. Test the integration locally.
4. Commit your changes and push to your fork.
5. Open a pull request.

## Support

- [Open a GitHub issue](https://github.com/cashfree/pg-samples/issues/new)
- Join the developer community on [Discord](https://discord.gg/ed9VWDnrh7)
