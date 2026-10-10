## 1. Image on a host volume

- [x] 1.1 Add `docker/entrypoint.sh` and run the server as `node` after giving it `/data`.
- [x] 1.2 Add `railway.toml` with the Dockerfile build, `/healthz` and restart policy.
- [x] 1.3 Add the `Beta image` workflow that checks the image on a root-owned volume, and a manual live check.
- [x] 1.4 Document Railway in `docs/deploy-beta.md`.

## 2. Deploy

- [ ] 2.1 Founder creates the Railway project, volume, variables and `app.askthemove.online` domain.
- [ ] 2.2 Live check passes against `https://app.askthemove.online`.
