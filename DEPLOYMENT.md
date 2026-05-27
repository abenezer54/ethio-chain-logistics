# Deployment Guide

This guide is for the free demo path we discussed: Vercel for the frontend, a Go backend host, Supabase Postgres, and Supabase Storage for uploads.

## Current verified state

- Backend tests pass with `go test ./...`
- Frontend production build passes with `npm run build`
- Blockchain tests pass with `npm test` in `blockchain/`

## Recommended demo stack

- Frontend: Vercel free tier
- Backend API: Render or Railway free tier
- Database: Supabase free tier
- File uploads: Supabase Storage free tier
- Blockchain proof layer: optional for the demo, can stay disabled until you need it

## Order of deployment

1. Create the Supabase project.
2. Create the uploads bucket.
3. Deploy the backend.
4. Deploy the frontend.
5. Point the frontend to the backend URL.
6. Test upload, download, login, and dashboard flows.

## Supabase setup

Create a storage bucket named `ethio-chain-uploads` or keep the same value as `SUPABASE_STORAGE_BUCKET` in `.env.example`.

You will need:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

Set the backend environment variables:

```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=ethio-chain-uploads
```

## Backend deployment checklist

- Set `DATABASE_URL` to the Supabase Postgres connection string.
- Set `GIN_MODE=release`.
- Set `JWT_SECRET` to a secure value.
- Set `STORAGE_PROVIDER=supabase`.
- Set the Supabase storage variables above.
- Keep `BLOCKCHAIN_ENABLED=false` for the initial demo unless you also deploy the blockchain layer.
- Run migrations before starting the API.
- Confirm `GET /health` and `GET /ready` return success.

## Frontend deployment checklist

- Deploy the `frontend/` folder as the Vercel project root.
- Set `NEXT_PUBLIC_API_BASE` to the deployed backend URL.
- Redeploy after any backend URL change.

## Free demo timing

- Supabase project and bucket: about 10 to 20 minutes
- Backend deployment: about 20 to 40 minutes
- Frontend deployment: about 10 to 20 minutes
- End-to-end verification: about 15 to 30 minutes

Total: about 1 to 2 hours if everything goes smoothly.

## Notes

- The current backend stores only file metadata in PostgreSQL; actual bytes are now handled by the configured storage provider.
- Local disk storage still works for development when `STORAGE_PROVIDER=local`.
- If you later need blockchain anchoring, enable it after the main demo stack is stable.
