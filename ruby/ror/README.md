# README

## Getting Started

Follow these steps to set up and run the application:

### Prerequisites

Ensure you have the following installed on your system:
- Ruby (version specified in the `Gemfile`)
- Bundler (`gem install bundler`)
- Docker (optional, for containerized setup)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ror
   ```

2. Install dependencies:
   ```bash
   bundle install
   ```

3. Set up the database:
   ```bash
   rails db:create db:migrate db:seed
   ```

4. (Optional) Configure environment variables:
   - Add any required environment variables to `config/credentials.yml.enc` or use a `.env` file.

### Running the Application

1. Start the Rails server:
   ```bash
   rails server
   ```

2. Open your browser and navigate to `http://localhost:3000`.

### Running Tests

Run the test suite to ensure everything is working:
```bash
rails test
```

### Deployment

Refer to `config/deploy.yml` for deployment instructions. Ensure all dependencies are installed and the database is properly configured on the production server.

### Additional Notes

- Static assets are located in the `app/assets` directory.
- API endpoints are defined in `config/routes.rb`.
- For more details, refer to the inline comments in the codebase.
