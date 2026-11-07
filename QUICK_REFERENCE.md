# Quick Reference: Project at a Glance

## 📊 Three Main Pieces

### 1️⃣ **Backend API** (`app/` folder)
```
What: Node.js HTTP server
Port: 8080
Endpoints:
  - GET /healthz → 200 OK (is alive?)
  - GET /readyz  → 200 OK (ready to serve?)
  - GET /orders  → { orders: [], version: "local" }

Docker Image: orders-api:local
K8s Deployment: 2 replicas (copies running at same time)
K8s Service: orders-api (port 8080)
```

### 2️⃣ **Frontend Web** (`webapp/` folder)
```
What: Nginx web server serving HTML dashboard
Port: 80 (or 8080 in container)
Files:
  - index.html (the UI with button)
  - nginx.conf (routes /api/* to backend)

Docker Image: orders-web:local
K8s Deployment: 1 replica
K8s Service: orders-web (port 80)
```

### 3️⃣ **Infrastructure Config** (`helm/` folder)
```
What: Helm chart (template + values)
Chart: helm/orders-api/
  - Chart.yaml: Metadata
  - values.yaml: All configuration (replicas, image, resources)
  - templates/: K8s resource definitions (Deployment, Service)

When deployed:
  - values.yaml substituted into templates
  - Generates K8s YAML
  - Applied to cluster
```

---

## 🔗 How They Connect

```
┌──────────────────────┐
│   Frontend (Nginx)   │  ← User visits here
├──────────────────────┤
│ /api/orders request  │
└──────────────┬───────┘
               │ (proxied via nginx.conf)
               │
┌──────────────▼───────────────┐
│  Backend API (Node.js)        │  ← Handles request
├───────────────────────────────┤
│ If pod 1 busy, pod 2 handles  │  ← Load balanced (2 copies)
└───────────────────────────────┘
```

---

## 🚀 Running Commands (In Order)

```bash
# Step 1: Build Docker images
docker build -t orders-api:local app
docker build -t orders-web:local webapp

# Step 2: Create cluster
kind create cluster --name devops-lab

# Step 3: Load images into cluster
kind load docker-image orders-api:local --name devops-lab
kind load docker-image orders-web:local --name devops-lab

# Step 4: Deploy using Helm
helm upgrade --install orders-api helm/orders-api

# Step 5: Check status
kubectl get pods              # All running?
kubectl get svc               # Services created?

# Step 6: Access the app
kubectl port-forward service/orders-web 8888:80
# Now visit http://localhost:8888
```

---

## 📁 File Guide (What Each File Does)

| File | Purpose |
|------|---------|
| `app/Dockerfile` | Recipe to build orders-api container |
| `app/server.js` | The actual API code |
| `app/server.test.js` | Tests for the API |
| `app/package.json` | Node.js dependencies |
| `webapp/Dockerfile` | Recipe to build orders-web container |
| `webapp/index.html` | The web page users see |
| `webapp/nginx.conf` | How Nginx routes requests |
| `helm/orders-api/Chart.yaml` | Chart metadata |
| `helm/orders-api/values.yaml` | **All configuration here** |
| `helm/orders-api/templates/deployment.yaml` | How to deploy the API |
| `helm/orders-api/templates/service.yaml` | How to expose the API |
| `helm/orders-api/templates/web-*.yaml` | How to deploy the web |
| `gitops/application.yaml` | Argo CD automation (not used locally) |
| `.github/workflows/release.yml` | GitHub Actions CI/CD (runs on GitHub) |

---

## 🎯 The Mission

**Goal**: Deploy a web app that shows orders, developed locally with K8s best practices.

**Journey**:
1. Write code (app/ and webapp/)
2. Containerize it (Dockerfiles)
3. Define infrastructure (Helm)
4. Deploy to local cluster (Kind)
5. Access via browser
6. (Optionally) Push to cloud with GitOps (Argo CD)

---

## 💡 Key Insights

✅ **Reproducible**: Same code → Same container → Same behavior everywhere  
✅ **Scalable**: Change `replicaCount: 2` to `replicaCount: 10` in one place  
✅ **Secure**: Non-root users, read-only filesystems, no caps  
✅ **Observable**: Health checks, logs, metrics ready  
✅ **GitOps-Ready**: Infrastructure as Code, Git is source of truth  
✅ **Zero Cloud Cost**: Runs on your laptop with Kind  

---

## 📌 What Makes This "Production-Ready"

Real production setups have:
- ✅ Health checks (liveness + readiness) ← We have this
- ✅ Resource limits (CPU/memory) ← We have this
- ✅ Rolling updates (no downtime) ← We have this
- ✅ Multiple replicas (redundancy) ← We have this
- ✅ Security context (non-root, no caps) ← We have this
- ✅ Service mesh (Istio) ← Not in this demo
- ✅ Persistent storage (databases) ← Not needed here
- ✅ Monitoring (Prometheus) ← Can be added
- ✅ GitOps pipeline (Argo CD) ← Configured, not deployed locally

**This project has ~70% of production patterns!**

---

## 🔄 Git to Production Flow (The Dream)

```
You: git push origin main
↓
GitHub Actions: Builds & pushes image to registry
↓
Helm values.yaml: Updated with new image tag
↓
Argo CD: Detects change in Git
↓
Kubernetes: Deploys new version
↓
Users: See new features (no downtime!)

All automated, all trackable in Git, all repeatable.
```

---

## ❓ Debug Checklist

If something doesn't work:

```bash
# 1. Are pods running?
kubectl get pods
# Should see: orders-api-xxx, orders-api-yyy, orders-web-zzz

# 2. Are services created?
kubectl get svc
# Should see: orders-api (8080), orders-web (80)

# 3. Can pods reach each other?
kubectl exec -it <pod-name> -- curl http://orders-api:8080/orders

# 4. What's in the logs?
kubectl logs <pod-name>

# 5. Is port-forward working?
curl http://localhost:8888

# 6. Did Helm apply correctly?
helm status orders-api
helm get values orders-api
```

---

## 🎓 Learning Path

1. **Understand Docker**: `app/Dockerfile` + `docker build`
2. **Understand Kubernetes**: `kubectl get pods/svc/deploy`
3. **Understand Helm**: `values.yaml` + `templates/` + `helm upgrade`
4. **Understand GitOps**: `gitops/application.yaml` + Argo CD
5. **Understand CI/CD**: `.github/workflows/release.yml`

**Each layer builds on the previous one.**

---

**You now have a production-like setup running on your laptop! 🎉**
