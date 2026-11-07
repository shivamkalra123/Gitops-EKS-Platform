# GitOps Local Kubernetes Platform

An order API deployed to a local Kubernetes cluster using Docker, Helm, and GitHub Actions. The workflow builds a container, checks it, publishes an immutable image reference, and updates the GitOps manifest. Argo CD can reconcile the desired state into Kind, Minikube, or any Kubernetes cluster.

## Architecture

```text
developer push → GitHub Actions → GHCR image → GitOps manifest → Argo CD → Kind / Minikube
                         └──── security + smoke checks ────┘
```

## What this demonstrates

- A minimal, non-root application container with `/healthz` and `/readyz` probes.
- Helm values that set resource requests, limits, rolling update controls, and pod security context.
- A cloud-free local environment that can run on Kind or Minikube without an account or credentials.
- A release workflow that carries the commit SHA into the deployment image tag.

## Run locally

```bash
docker build -t orders-api:local app
docker run --rm -p 8080:8080 orders-api:local
curl localhost:8080/readyz
```

For Kubernetes, create a Kind cluster with `kind create cluster --name devops-lab`, load the image with `kind load docker-image orders-api:local --name devops-lab`, then install the chart:

```bash
helm upgrade --install orders-api helm/orders-api
```

Build and load the web image as well:

```bash
docker build -t orders-web:local webapp
kind load docker-image orders-web:local --name devops-lab
helm upgrade orders-api helm/orders-api
kubectl port-forward service/orders-web 8081:80
```

Open `http://localhost:8081` and click **Load orders**. The web pod sends `/api/orders` to the `orders-api` Service inside Kubernetes.

## Safe deployment path

1. Build and load the application image into Kind.
2. Install the Helm chart and check rollout state with `kubectl rollout status deployment/orders-api`.
3. Optionally bootstrap Argo CD and apply `gitops/application.yaml` after replacing the repository URL.

No cloud credentials or account IDs are required.
