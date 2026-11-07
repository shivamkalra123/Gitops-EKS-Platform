# Docker & Kubernetes Learning Guide

## ✅ Setup Complete!

Your application is now running! Visit http://localhost:8888 to see the web app.

---

## Understanding Docker

### What is Docker?
Docker packages your application and all its dependencies into a **container** - a lightweight, isolated unit that runs consistently anywhere.

### The Three Images in This Project

#### 1. **orders-api** (Backend API)
- **Dockerfile location**: `app/Dockerfile`
- **Base image**: `node:22-alpine` (Node.js runtime)
- **What it does**: 
  - Listens on port 8080
  - Provides `/orders` endpoint that returns a list of orders
  - Has health checks (`/healthz`, `/readyz`)
  - Runs as non-root user (uid 10001) for security

**Key Docker concepts used:**
- **FROM**: Starts with a base image
- **WORKDIR**: Sets working directory
- **COPY**: Adds files from host to container
- **USER**: Runs container with specific user (non-root = more secure)
- **HEALTHCHECK**: Automatically verifies container is healthy
- **EXPOSE**: Documents which port the app uses

#### 2. **orders-web** (Frontend - Nginx)
- **Dockerfile location**: `webapp/Dockerfile`
- **Base image**: `nginxinc/nginx-unprivileged:1.27-alpine`
- **What it does**:
  - Serves the HTML dashboard on port 8080 (nginx)
  - Proxies `/api/orders` requests to the backend
  - Uses unprivileged nginx (doesn't run as root)

#### 3. **Building Images**
```bash
docker build -t orders-api:local app
docker build -t orders-web:local webapp
```

This reads the Dockerfile, executes each instruction, and creates a layered image you can run.

---

## Understanding Kubernetes (K8s)

### What is Kubernetes?
Kubernetes is an **orchestration platform** that manages containerized applications across a cluster of machines. It handles:
- **Deployment**: Running your containers
- **Scaling**: Running multiple copies
- **Networking**: Containers communicating with each other
- **Storage**: Persisting data
- **Health**: Restarting failed containers

### The Architecture in This Project

```
┌─────────────────────────────────────────┐
│      Local Kind Cluster (devops-lab)    │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────────────────┐  ┌─────────────┐  │
│  │  orders-api     │  │ orders-web  │  │
│  │  Deployment (2) │  │ Deployment  │  │
│  │  - Pod 1        │  │ - Pod (1)   │  │
│  │  - Pod 2        │  └─────────────┘  │
│  └────────┬────────┘         │          │
│           │                  │          │
│  ┌────────▼──────────────────▼─────┐   │
│  │      Kubernetes Services        │   │
│  │  - orders-api Service (8080)    │   │
│  │  - orders-web Service (80)      │   │
│  └────────┬──────────────────┬─────┘   │
│           │                  │          │
└───────────┼──────────────────┼──────────┘
            │                  │
    kubectl port-forward  kubectl port-forward
            │                  │
       localhost:8080     localhost:8888
```

### Key K8s Concepts

#### 1. **Pod**
- Smallest deployable unit in K8s
- Usually runs one container
- Containers in a pod share networking (same IP)
- Ephemeral - can be created/destroyed anytime

#### 2. **Deployment**
- Declares desired state (how many replicas, which image, etc.)
- K8s ensures actual state matches desired state
- Example: "I want 2 copies of orders-api running"
- If a pod crashes, deployment creates a new one

**In this project:**
```yaml
orders-api: 2 replicas (defined in helm values)
orders-web: 1 replica
```

#### 3. **Service**
- Provides stable IP & DNS name for pods
- Pods are temporary (IPs change), services are permanent
- Acts like a load balancer
- Internal (ClusterIP) - only accessible within cluster
- External (NodePort/LoadBalancer) - accessible from outside

**In this project:**
```
orders-api Service (port 8080) → Forwards to 2 order-api pods
orders-web Service (port 80)   → Forwards to 1 orders-web pod
```

#### 4. **Namespace**
- Virtual cluster within cluster
- Isolates resources
- This project uses `default` namespace

---

## Understanding Helm

### What is Helm?
Helm is a **package manager for Kubernetes**. Instead of writing raw YAML, you write templates and values.

### How It Works

```
helm/orders-api/
├── Chart.yaml      # Metadata about the chart
├── values.yaml     # Default configuration values
└── templates/      # Go templates that generate K8s manifests
```

When you run `helm upgrade --install orders-api helm/orders-api`:
1. Helm reads `values.yaml`
2. Substitutes values into templates
3. Generates Kubernetes YAML
4. Applies to cluster

### Values in This Project
```yaml
replicaCount: 2              # How many pod replicas
image:
  repository: orders-api     # Container image name
  tag: local                 # Image tag
  pullPolicy: Never          # Don't pull from registry, use local
resources:
  requests:                  # Minimum resources needed
    cpu: 100m
    memory: 128Mi
  limits:                    # Maximum resources allowed
    cpu: 500m
    memory: 256Mi
```

---

## Understanding Kind

### What is Kind?
**Kind** = "Kubernetes IN Docker" - a tool to run Kubernetes cluster inside Docker.

Perfect for:
- Local development
- Testing
- No cloud credentials needed
- Fast cluster creation/deletion

### How We Used It
```bash
kind create cluster --name devops-lab
# Creates a Docker container running a full K8s cluster

kind load docker-image orders-api:local --name devops-lab
# Copies Docker images into the cluster
# (normally K8s pulls from registry like Docker Hub)
```

---

## The Complete Workflow

### Step 1: Build Docker Images
```bash
docker build -t orders-api:local app
docker build -t orders-web:local webapp
```
✅ Creates container images with all dependencies

### Step 2: Create Kubernetes Cluster
```bash
kind create cluster --name devops-lab
```
✅ Spins up a local K8s cluster

### Step 3: Load Images Into Cluster
```bash
kind load docker-image orders-api:local --name devops-lab
kind load docker-image orders-web:local --name devops-lab
```
✅ Makes images available to cluster (no internet pull)

### Step 4: Deploy with Helm
```bash
helm upgrade --install orders-api helm/orders-api
```
✅ Creates Deployments, Pods, and Services

### Step 5: Port Forward to Access
```bash
kubectl port-forward service/orders-web 8888:80
```
✅ Bridges local port 8888 → service port 80 in cluster

### Step 6: Use the App
```
Browser: http://localhost:8888
  ↓
Nginx (orders-web) Pod
  ↓ (internal K8s network)
orders-api Service
  ↓ (load balances to 2 pods)
Pod 1 & Pod 2 (orders-api)
  ↓
Returns JSON with orders
```

---

## Useful Commands

### Docker
```bash
docker build -t myapp:latest .           # Build image
docker run -p 8080:8080 myapp:latest     # Run container
docker images                             # List images
docker ps                                 # List running containers
```

### Kubernetes
```bash
kubectl get pods                          # List all pods
kubectl get deployments                   # List deployments
kubectl get svc                           # List services
kubectl logs <pod-name>                   # View pod logs
kubectl describe pod <pod-name>           # Detailed pod info
kubectl exec -it <pod-name> -- bash      # Shell into pod
kubectl port-forward svc/myservice 8080:8080  # Port forward
```

### Helm
```bash
helm list                                 # List installed charts
helm status <release-name>                # Check status
helm values <release-name>                # View current values
helm uninstall <release-name>             # Remove release
```

### Kind
```bash
kind get clusters                         # List clusters
kind delete cluster --name devops-lab     # Delete cluster
kind load docker-image myimage --name devops-lab  # Load image
```

---

## Architecture Flow: How It All Works Together

```
┌─────────────────────────────────────────────────────────────────┐
│                    Your Application                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. DOCKER LAYER                                                │
│     ├─ orders-api:local (Node.js + dependencies)               │
│     └─ orders-web:local (Nginx + HTML/JS)                      │
│                                                                   │
│  2. KIND LAYER (Local K8s Cluster)                             │
│     ├─ Container Runtime: Runs Docker images                   │
│     ├─ API Server: Manages cluster state                       │
│     ├─ Scheduler: Decides which node runs pods                 │
│     └─ Controller Manager: Ensures desired state               │
│                                                                   │
│  3. KUBERNETES LAYER                                            │
│     ├─ Deployment: "Run 2 orders-api pods"                     │
│     ├─ Deployment: "Run 1 orders-web pod"                      │
│     ├─ Service: "orders-api service at 8080"                   │
│     └─ Service: "orders-web service at 80"                     │
│                                                                   │
│  4. HELM LAYER                                                  │
│     └─ Values + Templates → K8s Resources                      │
│                                                                   │
│  5. NETWORKING LAYER                                            │
│     └─ kubectl port-forward 8888:80 → Kubernetes Service       │
│                                                                   │
│  6. USER LAYER                                                  │
│     └─ Browser: http://localhost:8888                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Happens When You Click "Load orders"

```
1. Browser sends HTTP GET to http://localhost:8888/api/orders
2. Port-forward routes to Kubernetes Service (orders-web)
3. Service sends to orders-web Pod (nginx)
4. Nginx proxies request to orders-api Service
5. Service load-balances to orders-api Pod (1 of 2)
6. Node.js server processes request
7. Returns JSON: { orders: [], version: "local" }
8. Response flows back: Pod → Service → nginx → port-forward → Browser
9. JavaScript in browser displays the JSON
```

---

## Next Steps

1. **Check pod logs**: `kubectl logs -l app=orders-api`
2. **Scale up**: `kubectl scale deployment/orders-api --replicas=3`
3. **Update values**: Edit `helm/orders-api/values.yaml` and run `helm upgrade`
4. **Explore templates**: Look at `helm/orders-api/templates/`
5. **Cleanup**: `kind delete cluster --name devops-lab`

---

## Key Takeaways

✅ **Docker** = Package apps into containers  
✅ **Kubernetes** = Orchestrate containers at scale  
✅ **Helm** = Package K8s applications  
✅ **Kind** = Local K8s development  
✅ **Services** = Networking between containers  
✅ **Deployments** = Keep desired number of pods running  

**Your setup demonstrates a production-like workflow on your laptop!**
