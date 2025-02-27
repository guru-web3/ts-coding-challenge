# tha-coding-challenge

## Approach and CI/CD Pipeline

### Approach

1. **Understand the Requirements**: Review the provided feature files and understand the scenarios that need to be implemented.
2. **Setup the Environment**: Install dependencies and configure the environment to run the tests.
3. **Implement Missing Functionality**: Write the necessary code in the TypeScript files to ensure that all test cases pass.
4. **Run Tests Locally**: Use the provided commands to run the tests locally and ensure they pass.
5. **Commit and Push**: Commit your changes and push them to your forked repository.

### CI/CD Pipeline

![screencapture-file-Users-gururamu-Downloads-test-results-1-cucumber-report-html-2025-02-28-04_01_32](https://github.com/user-attachments/assets/0c353ff9-3166-4d50-85ec-17edbb541d2a)

We have set up a CI/CD pipeline using GitHub Actions to automate the testing and code quality checks. The pipeline is defined in the `.github/workflows/ci.yml` file and includes the following jobs:

1. **Run Integration Tests**:

   - **Checkout Code**: Checks out the code from the repository.
   - **Setup Node.js**: Sets up the Node.js environment.
   - **Install Dependencies**: Installs the project dependencies using Yarn.
   - **Create Environment File**: Sets up the environment variables required for the tests.
   - **Run Tests**: Executes the test suite using `yarn test`.
   - **Upload Test Results**: Uploads the test results as artifacts for later review.

2. **Code Quality Checks**:
   - **Checkout Code**: Checks out the code from the repository.
   - **Setup Node.js**: Sets up the Node.js environment.
   - **Install Dependencies**: Installs the project dependencies using Yarn.
   - **Run ESLint**: Runs ESLint to check for code quality issues.
   - **Run Prettier Check**: Runs Prettier to ensure code formatting consistency.

This pipeline ensures that every push and pull request is automatically tested and checked for code quality, providing immediate feedback on the changes.

By following this approach and utilizing the CI/CD pipeline, you can ensure that your code meets the required standards and passes all tests before merging it into the main branch.

This coding challenge uses [Cucumber](https://cucumber.io/) to run tests which implement a hypothetical use-case for Hedera SDK.

## How to Solve It

### 1. Fork the Repository

Go to the GitHub repository and fork it into your own account.

### 2. Clone Your Fork

Clone your forked repository to your local machine.

### 3. Setup the Environment

Navigate to the project directory and setup the environment by following the instructions in the section [Installation](#installation).

### 4. Understand the Codebase and Review Existing Tests

Familiarize yourself with the structure of the project with the following key files and folders:

- `features/`: Contains `Cucumber` feature files (`*.feature`) that define test scenarios for consensus and token services.
- `features/step_definitions/`: Contains TypeScript implementation files for the test scenarios. The implementation is incomplete causing the tests to fail.
- `src/`: Contains utility functions and configurations.

Additional information can be found in the section [Writing the Tests](#writing-the-tests).

### 5. Implement Missing Functionality

Complete the code in the relevant files to ensure that all test cases can be executed successfully.

Utilize the Hedera SDK to create topics, publish messages, and manage tokens as required by the tests.

Refer to the Hedera documentation and learning resources provided in the section [Learning Resources](#learning-resources) for guidance on using the Hedera SDK.

### 6. Running Tests

You can run all tests using the commands provided in the section [Running](#running).

### 7. Submitting the Updated Code

After ensuring that all tests pass, commit your changes and push your changes to your forked repository.

## ⚠️ Important Notes

You should not edit the test files (`*.features`). Your task is to complete the existing code in the TypeScript files (`*.ts`) to ensure that the tests pass successfully. Focus solely on implementing the required functionality.

## Installation

To install the dependencies, run `yarn install`.

## Running

To run the tests you have multiple options:

- Run `yarn test` to run all steps.
- Run `yarn test:dev` to run all steps marked with the `@dev` tag.
- Run `yarn test:wip` to run all steps marked with the `@wip` tag.
- Create your own tag and run the tests with `cucumber-js -p default --tags 'not @wip' --exit`.

## Writing the Tests

The tests are implemented as `steps` in the `features` folder. You can use a plugin for your favorite IDE to write the step definitions for you. An example has been left for reference.

The `config.ts` contains a list of private keys which can be used for testing. You can also replace those keys with the ones from your own Hedera Console test accounts.

If you need more testnet accounts, you can:

- Register on the [Hedera Portal](https://portal.hedera.com/register) - easiest way.
- Create a testnet account in a Hedera Wallet like [Hashpack](https://www.hashpack.app/) or [Blade](https://bladewallet.io/) and use [the faucet](https://portal.hedera.com) - more work but allows you to better understand what is going on.

## Learning Resources

You can download a [presentation providing an overview of Hedera Hashgraph](https://hashgraph.atlassian.net/wiki/external/NTdiYjA4ZDZiMWQxNDAzNjg4NTI3ODgyZjE0YzU1MjY) and how to use its services.

For the impatient, here are the main links for learning material:

- [Getting Started](https://hedera.com/get-started)
- [Hedera Documentation](https://docs.hedera.com/hedera)
- [Hedera Learning Center](https://hedera.com/learning/what-is-hedera-hashgraph)
- [Join Developer Discord](https://hedera.com/discord)
- [Hedera on YouTube](https://www.youtube.com/c/HederaHashgraph)
- [Application Demos](https://docs.hedera.com/guides/resources/demo-applications)
