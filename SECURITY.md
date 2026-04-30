# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability, please report it by emailing:

**[REDACTED FOR BLIND REVIEW]**

Include as much detail as possible:

- Description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Affected component (frontend, backend API, data pipeline, infrastructure)
- Any proof-of-concept code (if applicable)

We will acknowledge your report within 48 hours and aim to provide a fix within 14 days for critical issues.

## Scope

The following are in scope for security reports:
- Authentication and authorization bypasses (AWS Cognito flows)
- SQL injection or data exposure in the FastAPI backend
- Cross-site scripting (XSS) in the Next.js frontend
- Exposure of sensitive environment variables or AWS credentials
- Insecure direct object references in API endpoints

The following are out of scope:

- Vulnerabilities in third-party dependencies not introduced by this project
- Issues requiring physical access to infrastructure
- Social engineering attacks

## Responsible Disclosure

We follow responsible disclosure. Please give us reasonable time to address a reported issue before making it public. We will credit reporters in our release notes unless you prefer to remain anonymous.
