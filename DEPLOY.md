# DEPLOY.md - Link Tomorrow to AWS (tools.welcometomorrow.io/linktomorrow)

Link Tomorrow deploys **exactly like ranktomorrow**: a Dockerised Next.js standalone app, image
in **ECR**, run on **ECS Fargate** behind the **shared ALB**, routed by an ALB path rule.
All values below are from your live setup.

```
Account: 992819750459   Region: eu-west-2 (London)
Shared (reuse, do NOT recreate): ALB "ranktomorrow-alb", domain tools.welcometomorrow.io,
  ACM cert on the HTTPS:443 listener, ECS cluster "ranktomorrow-cluster-1", Cloudflare DNS.
New for linktomorrow: ECR repo, target group, ALB path rule, task definition, service, Postgres DB.
```

> Tip: run `export AWS_PAGER=""` once at the start of every CloudShell session (stops the
> pager swallowing your next command).

---

## 0. Prerequisites (once)
- Push this project to a **public GitHub repo** with the files at the **repo root**
  (`Dockerfile`, `next.config.js`, `package.json`, `app/`, `lib/`, `prisma/` - NOT nested
  in a sub-folder, NOT a committed `.zip`). Confirm after clone with
  `ls Dockerfile next.config.js package.json`.
- Create a **PostgreSQL** database and get its connection string (`DATABASE_URL`):
  - **Neon / Supabase** (fastest, external), or
  - **AWS RDS Postgres** in `eu-west-2`, same VPC as the cluster, private, SG allows 5432
    only from the ECS task SG. (See §6.)
- Switch Prisma to Postgres: in `prisma/schema.prisma` set `provider = "postgresql"`.
- Create the tables + admin once (from CloudShell or your machine):
  ```bash
  DATABASE_URL="<prod-postgres-url>" npx prisma db push
  DATABASE_URL="<prod-postgres-url>" ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed
  ```

---

## 1. One-time AWS setup for linktomorrow (CloudShell, region eu-west-2)

### A. Create the ECR repo
```bash
aws ecr create-repository --repository-name linktomorrow --region eu-west-2
# URI: 992819750459.dkr.ecr.eu-west-2.amazonaws.com/linktomorrow
```

### B. Build & push the first image
```bash
cd ~ && rm -rf linktomorrow && git clone <LINKTOMORROW_GITHUB_URL> && cd linktomorrow
ls Dockerfile next.config.js package.json           # all 3 must exist at root
docker system prune -af --volumes
aws ecr get-login-password --region eu-west-2 \
  | docker login --username AWS --password-stdin 992819750459.dkr.ecr.eu-west-2.amazonaws.com
docker build -t linktomorrow . \
  && docker tag linktomorrow:latest 992819750459.dkr.ecr.eu-west-2.amazonaws.com/linktomorrow:latest \
  && docker push 992819750459.dkr.ecr.eu-west-2.amazonaws.com/linktomorrow:latest
```

### C. Create the target group (port 3000, same VPC, health check = our /linktomorrow/api/health)
```bash
VPC_ID=$(aws elbv2 describe-load-balancers --names ranktomorrow-alb --region eu-west-2 \
  --query "LoadBalancers[0].VpcId" --output text)

aws elbv2 create-target-group --name linktomorrow-tg \
  --protocol HTTP --port 3000 --vpc-id $VPC_ID --target-type ip \
  --health-check-path /linktomorrow/api/health \
  --region eu-west-2 --query "TargetGroups[0].TargetGroupArn" --output text
# -> save this as LINKTOMORROW_TG_ARN
```

### D. Add the ALB path rule /linktomorrow/* → linktomorrow-tg
```bash
ALB_ARN=$(aws elbv2 describe-load-balancers --names ranktomorrow-alb --region eu-west-2 \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region eu-west-2 \
  --query "Listeners[?Port==\`443\`].ListenerArn" --output text)

# check which priority numbers are taken first:
aws elbv2 describe-rules --listener-arn $LISTENER_ARN --region eu-west-2 \
  --query "Rules[].Priority"

# create the rule (use a free priority, e.g. 20):
aws elbv2 create-rule --listener-arn $LISTENER_ARN --region eu-west-2 \
  --priority 20 \
  --conditions '[{"Field":"path-pattern","Values":["/linktomorrow","/linktomorrow/*"]}]' \
  --actions "[{\"Type\":\"forward\",\"TargetGroupArn\":\"<LINKTOMORROW_TG_ARN>\"}]"
```

### E. Create the task definition (copy ranktomorrow's as a template)
```bash
aws ecs describe-task-definition --task-definition ranktomorrow-task --region eu-west-2 \
  --query taskDefinition \
  | jq 'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)' \
  > ~/linktomorrow-taskdef.json

# set family/name/image + ALL linktomorrow env vars (edit values before running):
jq '.family="linktomorrow-task"
    | .containerDefinitions[0].name="linktomorrow"
    | .containerDefinitions[0].image="992819750459.dkr.ecr.eu-west-2.amazonaws.com/linktomorrow:latest"
    | .containerDefinitions[0].environment=[
        {"name":"DATABASE_URL","value":"<PROD_POSTGRES_URL>"},
        {"name":"AUTH_SECRET","value":"<openssl rand -hex 32>"},
        {"name":"APP_URL","value":"https://tools.welcometomorrow.io/linktomorrow"},
        {"name":"ADMIN_NAME","value":"Site Admin"},
        {"name":"ADMIN_EMAIL","value":"admin@welcometomorrow.io"},
        {"name":"ADMIN_PASSWORD","value":"<strong-password>"},
        {"name":"PLATFORM_COMMISSION","value":"0"},
        {"name":"AUTO_APPROVE_LISTINGS","value":"true"},
        {"name":"STRIPE_SECRET_KEY","value":"sk_live_..."},
        {"name":"NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY","value":"pk_live_..."},
        {"name":"STRIPE_WEBHOOK_SECRET","value":"whsec_..."},
        {"name":"RESEND_API_KEY","value":""},
        {"name":"MAIL_FROM","value":"Link Tomorrow <noreply@welcometomorrow.io>"},
        {"name":"AHREFS_API_KEY","value":"<ahrefs-api-v3-key>"}
      ]' \
  ~/linktomorrow-taskdef.json > ~/e2.json && mv ~/e2.json ~/linktomorrow-taskdef.json

# point logs to linktomorrow's own group (edit the logConfiguration group name in the file to
# /ecs/linktomorrow-task), then create it:
aws logs create-log-group --log-group-name /ecs/linktomorrow-task --region eu-west-2

aws ecs register-task-definition --cli-input-json file://~/linktomorrow-taskdef.json \
  --region eu-west-2 --query "taskDefinition.revision"
```
The template carries ranktomorrow's `executionRoleArn` / `taskRoleArn` - reuse as-is.

### F. Create the ECS service (reuse ranktomorrow's subnets + security group)
```bash
aws ecs describe-services --cluster ranktomorrow-cluster-1 --services ranktomorrow-service \
  --region eu-west-2 --query "services[0].networkConfiguration.awsvpcConfiguration"
# note the subnets [...] and securityGroups [...]

aws ecs create-service --cluster ranktomorrow-cluster-1 \
  --service-name linktomorrow-service \
  --task-definition linktomorrow-task \
  --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_1>,<SUBNET_2>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<LINKTOMORROW_TG_ARN>,containerName=linktomorrow,containerPort=3000" \
  --region eu-west-2
```

### G. Verify
```bash
aws ecs describe-services --cluster ranktomorrow-cluster-1 --services linktomorrow-service \
  --region eu-west-2 \
  --query "services[0].deployments[].{status:status,running:runningCount,rollout:rolloutState}"
```
Then open **https://tools.welcometomorrow.io/linktomorrow**.

### H. Stripe live webhook
Stripe dashboard → Developers → Webhooks → Add endpoint:
`https://tools.welcometomorrow.io/linktomorrow/api/stripe/webhook` → event
`checkout.session.completed` → copy the signing secret into `STRIPE_WEBHOOK_SECRET`
(update the task def env var per §5, register a new revision, point the service at it).

---

## 2. Everyday deploy (code-only, after a change)
```bash
cd ~ && rm -rf linktomorrow && git clone <LINKTOMORROW_GITHUB_URL> && cd linktomorrow
ls Dockerfile next.config.js package.json
docker system prune -af --volumes
aws ecr get-login-password --region eu-west-2 \
  | docker login --username AWS --password-stdin 992819750459.dkr.ecr.eu-west-2.amazonaws.com
nohup bash -c 'docker build -t linktomorrow . \
  && docker tag linktomorrow:latest 992819750459.dkr.ecr.eu-west-2.amazonaws.com/linktomorrow:latest \
  && docker push 992819750459.dkr.ecr.eu-west-2.amazonaws.com/linktomorrow:latest' > ~/build.log 2>&1 &
tail -20 ~/build.log      # wait for "digest: sha256:..."
aws ecs update-service --cluster ranktomorrow-cluster-1 --service linktomorrow-service \
  --force-new-deployment --region eu-west-2
```

## 3. Changing an env var later
Env vars live on the task definition. Register a new revision with the change, then point
the service at it:
```bash
aws ecs describe-task-definition --task-definition linktomorrow-task --region eu-west-2 \
  --query taskDefinition \
  | jq 'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)' \
  > ~/taskdef.json
jq '(.containerDefinitions[0].environment |= map(select(.name!="MY_VAR")))
    | .containerDefinitions[0].environment += [{"name":"MY_VAR","value":"my-value"}]' \
  ~/taskdef.json > ~/t2.json && mv ~/t2.json ~/taskdef.json
REV=$(aws ecs register-task-definition --cli-input-json file://~/taskdef.json --region eu-west-2 \
  --query "taskDefinition.revision" --output text)
aws ecs update-service --cluster ranktomorrow-cluster-1 --service linktomorrow-service \
  --task-definition linktomorrow-task:$REV --region eu-west-2
```

---

## Notes
- **Do NOT touch DNS or the certificate** - `/linktomorrow` is under the same hostname the ALB
  already serves, and the ACM cert already covers it.
- **basePath** is already `/linktomorrow` in `next.config.js`, and the health route is
  `/linktomorrow/api/health` - both match the ALB rule and target-group health check.
- Keep all secrets in the task-def env / Secrets Manager - never commit them to GitHub.
