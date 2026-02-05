# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Master Dashboard, please report it responsibly.

### How to Report

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: **asabialgo@gmail.com**
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Status update within 7 days
- Fix timeline depends on severity

### Severity Guidelines

- **Critical**: Remote code execution, authentication bypass
- **High**: Data exposure, privilege escalation
- **Medium**: Cross-site scripting, information disclosure
- **Low**: Minor information leaks, best practice violations

## Security Considerations

Master Dashboard is designed for **local development use**. The server:

- Binds to `0.0.0.0` by default
- Does not include built-in authentication
- Provides direct terminal access to the host system
- Executes commands with the permissions of the running user

**Do not expose Master Dashboard to untrusted networks without adding your own authentication and authorization layer.**

## Best Practices

- Run behind a reverse proxy with authentication in production
- Use environment variables for all secrets (never hardcode)
- Keep dependencies updated (`pnpm audit`)
- Review the `.env.example` files for required security configuration
