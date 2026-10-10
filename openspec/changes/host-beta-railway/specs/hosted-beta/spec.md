## MODIFIED Requirements

### Requirement: HB-005 Health check and container
`/healthz` SHALL report healthy only when the database answers, without authentication or caching. The production image SHALL run the server as a non-root user and store SQLite data on a mounted volume, including a volume the host mounts owned by root. It SHALL include a verified native Stockfish binary and declare a container health check.

#### Scenario: Restart with a volume
- **WHEN** the container is restarted with the same data volume
- **THEN** accounts and sessions persist and the health check returns healthy

#### Scenario: Root-owned host volume
- **WHEN** the host mounts an empty volume at `/data` owned by root and starts the image
- **THEN** the server runs as the `node` user, creates its database on the volume and reports healthy
