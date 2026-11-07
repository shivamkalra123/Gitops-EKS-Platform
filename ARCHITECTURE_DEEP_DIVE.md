# Architecture Deep Dive: Visual Guide

## 🎯 Three Layers of This Project

### Layer 1: Application Code
```
┌─────────────────────────────────────────────────────┐
│              APPLICATION CODE                        │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Backend (Node.js):              Frontend (Nginx):  │
│  ┌──────────────────────┐        ┌──────────────┐  │
│  │ app/server.js        │        │ webapp/      │  │
│  │ - GET /orders        │        │ - index.html │  │
│  │ - GET /healthz       │        │ - nginx.conf │  │
│  │ - GET /readyz        │        └──────────────┘  │
│  │                      │                           │
│  │ Dependencies: none!  │        Dependencies:     │
│  │ (very lightweight)   │        - Nginx server    │
│  └──────────────────────┘                           │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Layer 2: Containerization
```
┌─────────────────────────────────────────────────────┐
│               DOCKER LAYER                           │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Backend Container:          Frontend Container:    │
│  ┌──────────────────────┐    ┌──────────────────┐   │
│  │ FROM node:22-alpine  │    │ FROM nginx-      │   │
│  │ ├─ server.js         │    │ unprivileged     │   │
│  │ ├─ package.json      │    │ ├─ nginx.conf    │   │
│  │ ├─ Non-root user     │    │ ├─ index.html    │   │
│  │ ├─ Healthchecks      │    │ └─ Port 8080     │   │
│  │ └─ Port 8080         │    │                  │   │
│  │                      │    └──────────────────┘   │
│  │ Image Size: ~50MB    │    Image Size: ~20MB      │
│  │ Tag: orders-api:     │    Tag: orders-web:       │
│  │      local           │         local             │
│  └──────────────────────┘                           │
│                                                       │
│  Built with:                                        │
│  $ docker build -t orders-api:local app             │
│  $ docker build -t orders-web:local webapp          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Layer 3: Kubernetes Orchestration
```
┌─────────────────────────────────────────────────────────────────┐
│                    KIND CLUSTER                                  │
│              (Kubernetes IN Docker)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  KUBERNETES                               │  │
│  │                                                            │  │
│  │  Deployment: orders-web        Deployment: orders-api   │  │
│  │  Replicas: 1                    Replicas: 2             │  │
│  │  ┌────────────────────┐        ┌────────────────────┐   │  │
│  │  │ Pod (Nginx)        │        │ Pod 1 (Node.js)    │   │  │
│  │  │ - Container        │        │ - Container        │   │  │
│  │  │ - Volume mounts    │        │ - Port 8080        │   │  │
│  │  │ - Port 8080        │        │ - Health checks    │   │  │
│  │  │ - Labels: app=..   │        │ - Labels: app=..   │   │  │
│  │  └────────────────────┘        └────────────────────┘   │  │
│  │                                                            │  │
│  │                                 ┌────────────────────┐   │  │
│  │                                 │ Pod 2 (Node.js)    │   │  │
│  │                                 │ - Container        │   │  │
│  │                                 │ - Port 8080        │   │  │
│  │                                 │ - Health checks    │   │  │
│  │                                 │ - Labels: app=..   │   │  │
│  │                                 └────────────────────┘   │  │
│  │                                                            │  │
│  │  Service: orders-web           Service: orders-api      │  │
│  │  ClusterIP: 10.96.x.x          ClusterIP: 10.96.x.x    │  │
│  │  Port: 80                       Port: 8080              │  │
│  │  Selector: app=orders-web       Selector: app=orders-api│  │
│  │  ┌──────────────────────────┐   ┌──────────────────────┐│  │
│  │  │ Route requests to        │   │ Load balance         ││  │
│  │  │ Pod above                │   │ between Pod 1 & 2    ││  │
│  │  └──────────────────────────┘   └──────────────────────┘│  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 4: Configuration Management (Helm)
```
┌────────────────────────────────────────────────────────────┐
│                      HELM CHART                             │
│              helm/orders-api/                               │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  values.yaml (Configuration)                               │
│  ┌──────────────────────────────────┐                      │
│  │ replicaCount: 2                  │                      │
│  │ image:                           │                      │
│  │   repository: orders-api         │ ← Easy to change!    │
│  │   tag: local                     │                      │
│  │   pullPolicy: Never              │                      │
│  │ resources:                       │                      │
│  │   requests:                      │                      │
│  │     cpu: 100m                    │                      │
│  │     memory: 128Mi                │                      │
│  │   limits:                        │                      │
│  │     cpu: 500m                    │                      │
│  │     memory: 256Mi                │                      │
│  │ web:                             │                      │
│  │   replicaCount: 1                │                      │
│  │   ...                            │                      │
│  └──────────────────────────────────┘                      │
│           ↓ (Helm processes)                               │
│                                                              │
│  templates/ (Template files)                               │
│  ┌──────────────────────────────────┐                      │
│  │ deployment.yaml                  │                      │
│  │ - Reads {{ .Values.replicaCount }}                     │
│  │ - Reads {{ .Values.image.repository }}                 │
│  │ - Generates Kubernetes YAML                            │
│  │                                                          │
│  │ service.yaml                     │                      │
│  │ - Reads {{ .Values.service.port }}                     │
│  │ - Generates Kubernetes Service                         │
│  │                                                          │
│  │ web-deployment.yaml              │                      │
│  │ web-service.yaml                 │                      │
│  └──────────────────────────────────┘                      │
│           ↓ (Helm upgrade)                                 │
│                                                              │
│  Generated Kubernetes YAML                                 │
│  ┌──────────────────────────────────┐                      │
│  │ apiVersion: apps/v1              │                      │
│  │ kind: Deployment                 │                      │
│  │ metadata:                        │                      │
│  │   name: orders-api               │                      │
│  │ spec:                            │                      │
│  │   replicas: 2                    │ (From values!)       │
│  │   template:                      │                      │
│  │     spec:                        │                      │
│  │       containers:                │                      │
│  │       - image: orders-api:local  │ (From values!)       │
│  │         ...                      │                      │
│  │                                                          │
│  │ apiVersion: v1                   │                      │
│  │ kind: Service                    │                      │
│  │ ...                              │                      │
│  └──────────────────────────────────┘                      │
│           ↓ (kubectl apply)                                │
│                                                              │
│  Applied to Kubernetes Cluster                            │
│  (Creates Deployments, Services, Pods, etc.)             │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Layer 5: Networking & Access
```
┌────────────────────────────────────────────────────────────┐
│              NETWORKING LAYER                               │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Your Machine              Port Forward              Kind   │
│  ────────────              ─────────────              ──── │
│                                                              │
│  Browser                                                   │
│  localhost:8888                                            │
│      │                                                      │
│      │ kubectl port-forward                                │
│      │ service/orders-web 8888:80                          │
│      │                                                      │
│      └─────────────────────────┐                           │
│                                │                           │
│                   ┌────────────▼──────────┐                │
│                   │ Cluster Network       │                │
│                   │ ┌────────────────────┐│                │
│                   │ │ orders-web Service ││                │
│                   │ │ ClusterIP:Port 80  ││                │
│                   │ │     ↓              ││                │
│                   │ │ Nginx Pod          ││                │
│                   │ │ Container Port     ││                │
│                   │ │ 8080               ││                │
│                   │ │  ↓                 ││                │
│                   │ │ nginx.conf proxies ││                │
│                   │ │ /api/* to:         ││                │
│                   │ │     ↓              ││                │
│                   │ │ orders-api Service ││                │
│                   │ │ ClusterIP:8080     ││                │
│                   │ │     ↓              ││                │
│                   │ │ (Pick Pod 1 or 2)  ││                │
│                   │ │     ↓              ││                │
│                   │ │ Node.js Container  ││                │
│                   │ │ Processes Request  ││                │
│                   │ │ Returns JSON       ││                │
│                   │ └────────────────────┘│                │
│                   └────────────────────────┘                │
│                                │                           │
│                                │ (Response)                │
│                                │                           │
│                        Response Path                       │
│                      (Reverse of above)                    │
│                                │                           │
│      ┌─────────────────────────┘                           │
│      │                                                      │
│      ▼                                                      │
│  Browser displays:                                         │
│  { orders: [], version: "local" }                         │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Pod Lifecycle

### Before Deployment
```
                  ┌─ No Pods
                  │ No Services
        ┌─────────┴─────────┐
        │                   │
    Docker             Kubernetes
    Images             Cluster
    Exist              Empty
```

### After Helm Deploy
```
helm upgrade --install orders-api helm/orders-api

         ↓

Helm reads values.yaml
Substitutes into templates
Generates Kubernetes YAML
kubectl apply (internal)

         ↓

Kubernetes Scheduler:
- Sees 2 replicas needed for orders-api
- Sees 1 replica needed for orders-web
- Decides where to run (Same node for local Kind)

         ↓

Kubelet (on node):
- Pulls images from local Kind cache
- Creates containers
- Mounts volumes
- Starts containers
- Runs health checks

         ↓

Result:
┌──────────────────────────────────┐
│  Node (Docker Container)         │
│  ┌────────┐  ┌────────┐         │
│  │Pod #1  │  │Pod #2  │         │
│  │orders- │  │orders- │         │
│  │api     │  │api     │         │
│  │:8080   │  │:8080   │         │
│  └────────┘  └────────┘         │
│      ▲            ▲              │
│      │            │              │
│  ┌───┴────────────┴─────┐        │
│  │ Service: orders-api  │        │
│  │ Port: 8080           │        │
│  │ Load balances ↑      │        │
│  └──────────────────────┘        │
│                                  │
│  ┌──────────────────────┐        │
│  │ Pod: orders-web      │        │
│  │ Port: 8080           │        │
│  └──────────────────────┘        │
│         ▲                        │
│         │                        │
│  ┌──────┴──────────────┐         │
│  │Service: orders-web  │         │
│  │Port: 80             │         │
│  └─────────────────────┘         │
│                                  │
└──────────────────────────────────┘
```

---

## 🔄 Request Flow (In Detail)

### User clicks "Load orders"
```
Step 1: Browser JavaScript
────────────────────────────
fetch('/api/orders')
↓
GET /api/orders HTTP/1.1
Host: localhost:8888
```

### Port Forward intercepts
```
Step 2: kubectl port-forward
────────────────────────────
localhost:8888
    ↓
[Port forwarding tunnel]
    ↓
K8s Service network (internal)
```

### Service routing
```
Step 3: Service Discovery
────────────────────────────
orders-web Service (port 80)
├─ Listens on ClusterIP:80
├─ Selector: app=orders-web
├─ Finds matching pods
└─ Sends to Pod
```

### Pod processing
```
Step 4: Nginx Pod
────────────────────────────
nginx:1.27-alpine container
├─ Receives GET /api/orders
├─ nginx.conf matches /api/*
├─ Proxies to orders-api Service
│   (Not to IP, but to Service DNS name)
└─ Waits for response
```

### Backend routing
```
Step 5: orders-api Service
────────────────────────────
orders-api Service (port 8080)
├─ Listens on ClusterIP:8080
├─ Selector: app=orders-api
├─ Finds 2 matching pods
├─ Picks one (round-robin)
│  (Could be Pod 1 or Pod 2)
└─ Sends to selected Pod
```

### Backend processing
```
Step 6: Node.js Pod (1 or 2)
────────────────────────────
if (request.url === '/orders' && request.method === 'GET') {
  return HTTP 200 OK
  JSON body: { orders: [], version: "local" }
}
```

### Response flows back
```
Step 7: Response Journey
────────────────────────────
Pod ← orders-api Service ← nginx Pod ← port-forward ← Browser
│
└─ HTTP 200 OK
   Content-Type: application/json
   Body: { orders: [], version: "local" }
```

### Browser displays
```
Step 8: JavaScript Rendering
────────────────────────────
response.json()
├─ Parses JSON
├─ Finds <pre id="result">
└─ Sets innerHTML to:
   {
     "orders": [],
     "version": "local"
   }
```

---

## 🔐 Security Features Map

```
Application Layer
├─ Non-root user (UID 10001)
├─ Minimal dependencies
└─ Health checks

Container Layer (Dockerfile)
├─ Alpine base image (small)
├─ Read-only root filesystem
├─ No capabilities (CAP_DROP ALL)
└─ Unprivileged user

Kubernetes Layer (Helm templates)
├─ Pod Security Context
│  ├─ runAsNonRoot: true
│  └─ seccompProfile: RuntimeDefault
├─ Container Security Context
│  ├─ allowPrivilegeEscalation: false
│  ├─ readOnlyRootFilesystem: true
│  └─ capabilities.drop: ["ALL"]
├─ Resource Limits
│  ├─ CPU: 500m (max)
│  └─ Memory: 256Mi (max)
└─ Health Checks
   ├─ Liveness (is it alive?)
   └─ Readiness (is it ready?)

Network Layer (Kubernetes)
├─ Service Discovery (no exposed IPs)
├─ Internal DNS (service names)
└─ ClusterIP type (not exposed outside)

GitOps Layer (Optional)
├─ Git as source of truth
├─ RBAC for deployments
├─ Audit trail (all changes in Git)
└─ Drift detection (Argo CD reconciles)
```

---

## 📈 Scalability Example

### Current State
```
values.yaml:
  replicaCount: 2
  web:
    replicaCount: 1

Result:
  2 × orders-api pods
  1 × orders-web pod
```

### Scale to 10 copies
```
Change 1 line in values.yaml:
  replicaCount: 10

helm upgrade orders-api helm/orders-api

Result:
  10 × orders-api pods
  Service load-balances across all 10
  No code changes!
  No container rebuilds!
  Just configuration change!
```

### How Kubernetes scales
```
Desired State: 10 pods
Actual State: 2 pods
         ↓
Deployment Controller sees mismatch
         ↓
Creates 8 new pods:
├─ Pod 3, 4, 5, ..., 10
├─ Each gets same container image
├─ Same configuration
└─ Same labels

         ↓

Service auto-includes new pods:
├─ Selector: app=orders-api
├─ All 10 pods have that label
├─ All 10 receive traffic

         ↓

Load Balanced across 10 copies!
10× the capacity!
```

---

## 🎯 Key Takeaway

This project demonstrates:
- **Application Code** (what you write)
- **Containerization** (Docker)
- **Orchestration** (Kubernetes)
- **Configuration Management** (Helm)
- **Infrastructure as Code** (Helm + Git)
- **Production Best Practices** (Security, Health checks, Limits)
- **Scalability** (Change one value, scale everywhere)

All on **your laptop**, with **no cloud costs**, ready to deploy to **AWS EKS** or any K8s cluster!

🚀 **This is modern DevOps!**
