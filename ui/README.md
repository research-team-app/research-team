# Frontend

Next.js 14 static site — exported to S3 and served via CloudFront.

## Stack

Next.js 14 · React 19 · TypeScript · Tailwind CSS · React Query · Zustand · AWS Amplify (Cognito)

## Local Development

```bash
npm install
npm run dev   # http://localhost:3000
```

Create `ui/.env.local`:

```env
NEXT_PUBLIC_IS_LOCAL=true
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<pool_id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<client_id>
NEXT_PUBLIC_COGNITO_DOMAIN=<prefix>.auth.us-east-1.amazoncognito.com
```

## Build & Deploy

```bash
npm run build   # static export → ui/out/
```

All pages must work with `output: "export"` (no SSR).

Deploy via GitHub Actions (`deploy-front-end` job) — trigger with target `frontend` or `all`:

1. Builds static export
2. Syncs `ui/out/` → S3 bucket `research.team`
3. Invalidates CloudFront cache

## Required GitHub Secrets

| Secret                                        | Description                |
| --------------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_API_URL`                         | API Gateway invoke URL     |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID`            | Cognito user pool ID       |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID`               | Cognito app client ID      |
| `NEXT_PUBLIC_COGNITO_DOMAIN`                  | Cognito hosted UI domain   |
| `AWS_S3_BUCKET`                               | `research.team`            |
| `DISTRIBUTION_ID`                             | CloudFront distribution ID |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Deploy IAM credentials     |
