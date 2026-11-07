# 01-GitOps-EKS-Platform: Complete Project Guide

## 🎯 Project Overview

This is a **production-ready demonstration** of a GitOps CI/CD pipeline for Kubernetes. It shows how to:

1. Build containerized applications (Docker)
2. Deploy them to Kubernetes (K8s)
3. Manage infrastructure as code (Helm + GitOps)
4. Automate releases (GitHub Actions)
5. Run everything locally for development (Kind)

---

## 📁 Project Structure

```
01-gitops-eks-platform/
│
├── app/                          # 🔙 Backend API (Node.js)
│   ├── Dockerfile                # Container image definition
│   ├── server.js                 # Express-like API server
│   ├── server.test.js            # Unit tests
│   └── package.json              # Node.js dependencies
│
├── webapp/                        # 🎨 Frontend UI (Nginx)
│   ├── Dockerfile                # Nginx container
│   ├── index.html                # Web dashboard
│   └── nginx.conf                # Nginx configuration
│
├── helm/                          # 📦 Infrastructure as Code
│   └── orders-api/
│       ├── Chart.yaml            # Helm chart metadata
│       ├── values.yaml           # Configuration values
│       └── templates/
│           ├── deployment.yaml   # K8s Deployment spec
│           ├── service.yaml      # K8s Service spec
│           ├── web-deployment.yaml
│           └── web-service.yaml
│
├── gitops/                        # 🤖 GitOps Configuration
│   └── application.yaml          # Argo CD Application manifest
│
├── .github/                       # 🔄 CI/CD Pipeline
│   └── workflows/
│       └── release.yml           # GitHub Actions workflow
│
├── infra/                         # 🏗️ Infrastructure setup (TBD)
│
├── README.md                      # Project documentation
└── LEARNING_GUIDE.md             # Deep learning material
```

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  User → Browser → http://localhost:8888 → Interact with UI      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   NETWORKING LAYER                               │
│  kubectl port-forward service/orders-web 8888:80                │
│  (Bridges localhost:8888 to K8s Service)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                 KUBERNETES LAYER (Kind Cluster)                  │
│                                                                   │
│  ┌──────────────── orders-web ──────────────┐                  │
│  │ Service (ClusterIP, port 80)             │                  │
│  │   ↓                                       │                  │
│  │ Deployment (1 replica)                   │                  │
│  │   ↓                                       │                  │
│  │ Pod (Nginx container)                    │                  │
│  └──────────────────────────────────────────┘                  │
│              (Proxies /api/* to orders-api Service)            │
│                             │                                   │
│  ┌──────────────── orders-api ───────────────┐                 │
│  │ Service (ClusterIP, port 8080)            │                 │
│  │   ↓ (Load balances)                       │                 │
│  │ Deployment (2 replicas)                   │                 │
│  │   ↓                                        │                 │
│  │ Pod 1 (Node.js API)  Pod 2 (Node.js API) │                 │
│  └───────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DOCKER LAYER                                  │
│  ├─ orders-api:local     (Node.js image)                        │
│  └─ orders-web:local     (Nginx image)                          │
└────────────────────────────────────────────────────────────────┘
```

---

## 📂 What Each Folder Contains

### **app/** - Backend API
The REST API that serves order data.

**Key Files:**
- `server.js`: HTTP server with 3 endpoints:
  - `GET /healthz` → Returns 200 (liveness check)
  - `GET /readyz` → Returns 200 (readiness check)
  - `GET /orders` → Returns `{ orders: [], version: "local" }`

- `Dockerfile`: Builds a lightweight Node.js container
  - Uses Alpine Linux (small base image)
  - Runs as non-root user (UID 10001) for security
  - Includes health checks in the Dockerfile

- `server.test.js`: Tests the server endpoints

- `package.json`: Dependencies (none! This is lightweight)

**Running directly:**
```bash
cd app
npm start              # Runs on port 8080
curl http://localhost:8080/orders
```

---

### **webapp/** - Frontend UI
The Nginx web server serving the HTML dashboard.

**Key Files:**
- `index.html`: Single-page application with:
  - Dark-themed UI for an "Orders Dashboard"
  - A button "Load orders"
  - JavaScript that calls `/api/orders` endpoint
  - Displays JSON response in a `<pre>` tag

- `Dockerfile`: Multi-stage or simple Nginx container
  - Uses unprivileged Nginx (better security)
  - Alpine Linux for small size
  - Exposes port 8080 (non-standard, more secure)

- `nginx.conf`: Proxies `/api/*` requests to the backend
  - When you click "Load orders", browser calls `/api/orders`
  - Nginx sees the `/api/` prefix and proxies to backend
  - This is **service-to-service communication** inside K8s

**Running directly:**
```bash
cd webapp
docker build -t orders-web:local .
docker run -p 8080:8080 orders-web:local
# Visit http://localhost:8080
```

---

### **helm/** - Infrastructure Configuration
Package manager templates that define how to deploy.

**Directory Structure:**
```
helm/orders-api/
├── Chart.yaml              # Metadata
├── values.yaml             # Configuration defaults
└── templates/              # Go templates for K8s resources
    ├── deployment.yaml     # API deployment
    ├── service.yaml        # API service
    ├── web-deployment.yaml # Web deployment
    └── web-service.yaml    # Web service
```

**Chart.yaml:**
```yaml
apiVersion: v2
name: orders-api
version: 0.1.0
appVersion: "1.0.0"
```
→ Metadata about the chart

**values.yaml:**
```yaml
replicaCount: 2              # How many pods to run
image:
  repository: orders-api     # Container image name
  tag: local                 # Tag/version
  pullPolicy: Never          # Don't pull from registry

resources:
  requests:                  # Minimum CPU/memory
    cpu: 100m
    memory: 128Mi
  limits:                    # Maximum CPU/memory
    cpu: 500m
    memory: 256Mi
```
→ All configuration in one place

**templates/deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}  # Will be "orders-api"
spec:
  replicas: {{ .Values.replicaCount }}  # Substitutes 2
  template:
    spec:
      containers:
        - image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          # Will become: orders-api:local
```
→ Template variables get replaced with values

**How Helm Works:**
1. Read `values.yaml` 
2. Substitute `{{ }}` placeholders in templates
3. Generate final K8s YAML
4. Apply to cluster

**Using Helm:**
```bash
# Deploy
helm upgrade --install orders-api helm/orders-api

# Check status
helm status orders-api

# Get values
helm get values orders-api

# Uninstall
helm uninstall orders-api
```

---

### **gitops/** - Argo CD Configuration
For automated GitOps deployments.

**application.yaml:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: orders-api
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/REPLACE_ORG/gitops-eks-platform.git
    targetRevision: main
    path: helm/orders-api
  destination:
    server: https://kubernetes.default.svc
    namespace: orders
  syncPolicy:
    automated:
      prune: true      # Remove resources not in Git
      selfHeal: true   # Automatically fix drift
```

**What this does:**
- Tells Argo CD to watch your GitHub repo
- When you push changes to `main` branch
- Argo CD automatically deploys the Helm chart
- If someone manually changes K8s, Argo CD fixes it
- **This is GitOps: Git is the source of truth**

**Flow:**
```
You push code → GitHub → Argo CD → K8s
                (watches repo)  (applies changes)
```

---

### **.github/workflows/** - CI/CD Pipeline
Automation when you push code.

**release.yml:**
- Runs when you push a tag like `v1.0.0`
- Steps:
  1. Checkout code
  2. Build Docker images
  3. Run security checks
  4. Push to GitHub Container Registry (GHCR)
  5. Update `values.yaml` with new image tag
  6. Commit changes back to repo
  7. Argo CD picks up the change and deploys!

**Flow:**
```
You push code with tag v1.0.0
            ↓
GitHub Actions workflow runs
            ↓
Build & test containers
            ↓
Push to GHCR (registry)
            ↓
Update values.yaml
            ↓
Commit changes to main branch
            ↓
Argo CD detects change
            ↓
Applies Helm chart with new image
            ↓
Kubernetes pulls new image
            ↓
Rolls out new pods
```

---

## 🔄 Complete Flow: From Code to Running App

### **Local Development (What We Did)**

```
1. Developer writes code
   ├─ app/server.js (API logic)
   └─ webapp/index.html (UI)

2. Build Docker images
   $ docker build -t orders-api:local app
   $ docker build -t orders-web:local webapp
   
3. Create local K8s cluster
   $ kind create cluster --name devops-lab
   
4. Load images into cluster
   $ kind load docker-image orders-api:local --name devops-lab
   $ kind load docker-image orders-web:local --name devops-lab
   
5. Deploy with Helm
   $ helm upgrade --install orders-api helm/orders-api
   
6. Check pods are running
   $ kubectl get pods
   
7. Forward port to access
   $ kubectl port-forward service/orders-web 8888:80
   
8. Visit browser
   http://localhost:8888
   
9. Click "Load orders"
   ├─ Browser sends GET /api/orders
   ├─ Nginx pod receives it
   ├─ Nginx proxies to orders-api Service
   ├─ Service load-balances to Pod 1 or Pod 2
   ├─ Node.js processes request
   └─ Returns JSON
```

### **Production Deployment (GitOps Flow)**

```
1. Developer pushes code to GitHub
   $ git push origin main
   
2. GitHub Actions workflow triggers (if tagged)
   ├─ Builds container image
   ├─ Runs security checks
   ├─ Pushes to ghcr.io (registry)
   └─ Updates Helm values.yaml with new image tag
   
3. Updated values.yaml committed to main
   $ git push auto-commit
   
4. Argo CD watches the repository
   ├─ Detects change in main branch
   ├─ Reads Helm chart from git
   ├─ Compiles templates with values
   └─ Applies to EKS cluster
   
5. Kubernetes applies changes
   ├─ Downloads new image
   ├─ Creates new pods
   ├─ Kills old pods
   └─ Service routes to new pods
   
6. No downtime (Rolling update strategy)
```

---

## 🔐 Security Features

This project implements several security best practices:

### **Container Security**
- ✅ Non-root user (UID 10001)
- ✅ Read-only root filesystem
- ✅ No capabilities (CAP_DROP ALL)
- ✅ Alpine base images (small attack surface)
- ✅ Unprivileged Nginx

### **Kubernetes Security**
- ✅ Pod Security Context (runAsNonRoot, seccompProfile)
- ✅ Resource limits (prevents resource exhaustion)
- ✅ Health checks (readiness + liveness probes)
- ✅ Rolling updates (maxUnavailable: 0, maxSurge: 1)

### **GitOps Security**
- ✅ Git is source of truth
- ✅ All changes tracked in version control
- ✅ Code review before deployment
- ✅ Automated drift detection (Argo CD)
- ✅ Immutable image tags (SHA included)

---

## 🚀 How to Use This Project

### **Run Locally**
```bash
# 1. Build images
docker build -t orders-api:local app
docker build -t orders-web:local webapp

# 2. Create cluster
kind create cluster --name devops-lab

# 3. Load images
kind load docker-image orders-api:local --name devops-lab
kind load docker-image orders-web:local --name devops-lab

# 4. Deploy
helm upgrade --install orders-api helm/orders-api

# 5. Access
kubectl port-forward service/orders-web 8888:80
# Visit http://localhost:8888
```

### **Modify Configuration**
```bash
# Edit helm values
nano helm/orders-api/values.yaml

# Redeploy (picks up new values)
helm upgrade orders-api helm/orders-api

# Check rollout
kubectl rollout status deployment/orders-api
```

### **Scale Up**
```bash
# Change replicas in values.yaml or inline
helm upgrade orders-api helm/orders-api --set replicaCount=5

# Or patch deployment
kubectl scale deployment/orders-api --replicas=5
```

### **View Logs**
```bash
# Stream logs from all API pods
kubectl logs -l app.kubernetes.io/name=orders-api -f

# Logs from specific pod
kubectl logs orders-api-7698f6cd97-hgjbc
```

### **Debug Pod**
```bash
# Shell into pod
kubectl exec -it orders-api-7698f6cd97-hgjbc -- sh

# Or run a temporary debug pod
kubectl run -it debug --image=alpine --restart=Never -- sh
```

### **Clean Up**
```bash
# Delete Helm release
helm uninstall orders-api

# Delete Kind cluster
kind delete cluster --name devops-lab

# Delete Docker images
docker rmi orders-api:local orders-web:local
```

---

## 📊 Data Flow Diagram

### **User Clicks "Load orders" Button**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Browser executes JavaScript                         │
│ fetch('/api/orders')                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 2: HTTP GET request sent to /api/orders               │
│ (Port-forward intercepts: localhost:8888)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 3: kubectl port-forward tunnels to K8s Service         │
│ (Translates to internal K8s networking)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 4: orders-web Service receives request (port 80)      │
│ (Selector matches: app.kubernetes.io/name: orders-web)    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 5: Nginx pod processes request                        │
│ nginx.conf matches /api/* and proxies to orders-api       │
│ Service                                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 6: orders-api Service load-balances request           │
│ (Selector matches 2 pods, picks one)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼─────────────┐      ┌─────────▼────────────┐
│ Pod 1 (orders-api)   │      │ Pod 2 (orders-api)   │
│ Node.js server       │ or   │ Node.js server       │
│ port 8080            │      │ port 8080            │
└────────┬─────────────┘      └─────────┬────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 7: Node.js server processes GET /orders               │
│ if (request.url === '/orders' && request.method === 'GET') │
│   return { orders: [], version: "local" }                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 8: Response travels back (reverse path)               │
│ JSON → orders-api pod → Service → nginx → port-forward    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Step 9: Browser receives response                          │
│ JavaScript displays in <pre> tag                           │
│ { orders: [], version: "local" }                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Concepts Summary

| Concept | Purpose | Used Here |
|---------|---------|-----------|
| **Docker** | Package apps into containers | Dockerfile builds |
| **Kubernetes** | Orchestrate containers at scale | Kind cluster manages pods |
| **Helm** | Package K8s applications | Helm charts define deployments |
| **Service** | Stable networking between pods | orders-api & orders-web services |
| **Deployment** | Manage pod replicas | 2 replicas of API, 1 of web |
| **Argo CD** | Automated GitOps sync | application.yaml syncs from git |
| **GitHub Actions** | CI/CD automation | release.yml builds & pushes images |

---

## 📝 Common Questions

**Q: Why two pods for orders-api?**
A: Redundancy + Load balancing. If one fails, requests go to the other. Kubernetes keeps exactly 2 running.

**Q: Why does nginx proxy to orders-api?**
A: Service discovery. Nginx doesn't know IP addresses of pods. Services provide stable DNS names (orders-api.default.svc.cluster.local).

**Q: Why local images instead of pulling from registry?**
A: Speed in development. With `pullPolicy: Never`, K8s uses pre-loaded images instead of network pull.

**Q: What happens if I delete a pod?**
A: Deployment controller creates a new one immediately. K8s maintains desired state.

**Q: How does GitOps differ from manual deployment?**
A: Manual = `kubectl apply` commands. GitOps = Argo CD watches Git and applies automatically. Git becomes the source of truth.

---

## 🔗 Next Steps

1. **Explore Helm templates**: Edit `helm/orders-api/templates/` to understand K8s resources
2. **Scale the application**: Modify `replicaCount` in `values.yaml`
3. **Add environment variables**: Use Helm ConfigMaps
4. **Set up Argo CD**: Bootstrap Argo CD and use `gitops/application.yaml`
5. **Deploy to real cluster**: Use AWS EKS instead of local Kind
6. **Add monitoring**: Integrate Prometheus + Grafana
7. **Add storage**: Use persistent volumes for data

---

**This project demonstrates production-ready infrastructure on your laptop! 🚀**
