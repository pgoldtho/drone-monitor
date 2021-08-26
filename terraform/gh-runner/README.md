# Self Hosted Linux base Github Runners on Managed Instance Group

This module handles the creation of infrastructure necessary to deploy Linux based Github Self Hosted Runners as a Managed Instance Group (MIG). It creates a Compute Engine Instance template with startup and shutdown bash scripts that manage Github runner registration. The startup script downloads and installs the Github runners binary from github.com. Once installed it POSTs a request to the /actions/runners/registration-token endpoint of the specified repo or org and uses the token this returns to register the runner. The shutdown script de-registers the runner.

Sensitive information like the bearer token required call the /actions/runners/registration-token endpoint are stored in a Cloud Secret. The startup and shutdown scripts read these values using permissions that have been granted to the service account associated with the template.

An autoscaling MIG is created based on the template with a target range of `x` to 10 where x is the value specified using the `target_size` variable

## Prerequisites

1. Enable the required GCP APIs.

    ``` bash
    PROJECT_ID=dev-common
    gcloud config set project $PROJECT_ID
    gcloud services enable compute.googleapis.com secretmanager.googleapis.com
    ```

2. Create a Service Account to be used by GCP VMs and allow it to access the runner secret.

    ``` bash
    gcloud iam service-accounts create gce-runner-sa --display-name "gce-runner-sa"

    SA_EMAIL=$(gcloud iam service-accounts list --filter="displayName:gce-runner-sa" --format='value(email)')

    gcloud secrets add-iam-policy-binding gh-runner-secret \
      --member serviceAccount:$SA_EMAIL \
      --role roles/secretmanager.secretAccessor

    ```


## Inputs

Input variables are described below classified by target artifact

### Project values

Identify the deployment project, region, service account and network.

| Name | Description | Type | Default | Example |
|------|-------------|------|---------|--------|
| project\_id | Identifies the project to deploy Github Runner | `string` | "" | "dev-common" |
| region | The GCP region to deploy instances into | `string` | "" | "us-east1" |
| service\_account | Email address of a pre created service account | `string` | "" | "gce-runner-sa@dev-common.iam.gserviceaccount.com" |
| subnet\_name | The subnet to deploy VMs into | `string` | "" | "subnet-ghrunner-10-216-72-0-27" |
| subnetwork\_project | The ID of the project in which the subnetwork belongs | `string` | "" | "dev-network"|

### Start up script values

 Values to place in a Cloud Secret for use in the instance scripts

| Name | Description | Type | Default | Example |
|------|-------------|------|---------|--------|
| repo\_url | The repository or organization URL to pass as a parameter to `config.sh` | `string` | "" |"https://github.com/pgoldtho/drone-monitor" |
| gh\_auth\_token | Github bearer token that is used for generating Self Hosted Runner Token | `string` | "" | "ghp_YADkljsdfglksrfgeS4pV6pxqbkMTcn1j00su38o" |
| gh\_api\_base | The base URL for the registration-token endpoint | `string` | "" | "github.com/pgoldtho/drone-monitor" |
| gh\_runner\_version | The Github runner version to install | `string` | "2.276.1" |  "2.276.1" |

### GCE Template Variables

Metadata used to create a Compute Engine template.

| Name | Description | Type | Default | Example |
|------|-------------|------|---------|---------|
| machine\_type | The GCP machine type to deploy | `string` | "e2-micro" |"e2-micro" |
| source\_image\_family | Source image family | `string` | "ubuntu-1804-lts" | "ubuntu-1804-lts" |
| source\_image\_project |Project where the source image comes from| `string` | "ubuntu-os-cloud" | "ubuntu-os-cloud" |
| name\_prefix | Instance template name prefix | `string` | "gh-runner-linux" | "gh-runner-linux" generates: gh-runner-linux-20210826141849575600000001 |
| custom\_metadata | User provided custom metadata | `object` | {} | {} |

### MIG Variables

Managed Instance Group metadata. Note the 300 second default for the cooldown\_period. This is because instance startup script may take up to 5 minutes to complete.

| Name | Description | Type | Default | Example |
|------|-------------|------|---------|---------|
| instance\_name | The prefix used in generated instance names |`string`| "ghr" | "ghr" generates: ghr-mig with instances called ghr-4g1w and ghr-9qjw |
| target\_size | The minimum number of runner instances | `number` | 2 | 2 |
| cooldown\_period | The number of seconds that the autoscaler should wait before it starts collecting information from a new instance | `number` | 300| 300 |


## Outputs

| Name | Description |
|------|-------------|
| gh\_secret\_id | Secret Manager ID and version of the github secrets (token, repo\_name,repo\_owner) |
| mig-instance-group | The instance group url of the created MIG |
| mig-instance-template | The name of the MIG Instance Template |

## Known Issues

`terraform destroy` does not wait for the instance shutdown scripts to complete before destroying the resources. This may result in orphaned runner registrations in Github. The workaround for this is to scale the MIG to 0 prior to issuing the destroy command or using the Force remove option in the Github UI.