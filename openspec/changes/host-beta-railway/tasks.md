## 1. Image on a host volume

- [x] 1.1 Add `docker/entrypoint.sh` and run the server as `node` after giving it `/data`.
- [x] 1.2 Document Railway's dashboard settings: Dockerfile build, `/healthz` and one replica. (`railway.toml` was dropped: Railway no longer accepts it for new services.)
- [x] 1.3 Add the `Beta image` workflow that checks the image on a root-owned volume, and a manual live check.
- [x] 1.4 Document Railway in `docs/deploy-beta.md`.
- [x] 1.5 Add `deploy/vm/cloud-init.yaml` and the `Deploy to server` workflow for one AWS or Azure server, and document it.

## 2. Deploy

- [ ] 2.1 Founder creates the Railway service, or the AWS or Azure server, with its settings and the `app.askthemove.online` record.
- [ ] 2.2 Live check passes against `https://app.askthemove.online`.
