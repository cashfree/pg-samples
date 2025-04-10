# Cashfree NestJS App

This is a sample NestJS application that integrates with the Cashfree Payment Gateway to demonstrate basic payment functionalities.

## Project Structure

```
cashfree-nestjs-app
├── src
│   ├── app.controller.ts       # Handles incoming requests and responses
│   ├── app.module.ts           # Root module of the application
│   ├── app.service.ts          # Contains business logic
│   ├── main.ts                 # Entry point of the application
│   ├── cashfree.service.ts     # Service for interacting with Cashfree APIs
│   ├── cashfree.module.ts      # Module for Cashfree integration
│   └── common
│       ├── constants.ts        # Constants used throughout the application
│       └── app.middleware.ts   # Middleware for logging and other purposes
├── test
│   └── app.e2e-spec.ts         # End-to-end tests for the application
├── package.json                # npm configuration file
├── tsconfig.json               # TypeScript configuration file
├── tsconfig.build.json         # TypeScript build configuration file
├── .env                        # Environment variables file
└── README.md                   # Documentation for the project
```

## Installation

To install the dependencies, run:

```
npm install
```

## Configuration

Create a `.env` file in the root directory and add the following environment variables:

```
APP_ID=your_cashfree_app_id
APP_SECRET=your_cashfree_app_secret
PORT=3000
```

## Running the Application

To start the application, use the following command:

```
npm run start
```

The application will be running on `http://localhost:3000`.

## Testing

To run the end-to-end tests, use the following command:

```
npm run test:e2e
```

## Features

- Integration with Cashfree Payment Gateway
- Order creation and fetching using Cashfree APIs
- Middleware for logging
- Environment-based configuration

## License

This project is licensed under the MIT License.